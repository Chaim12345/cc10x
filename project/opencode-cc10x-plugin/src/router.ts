import type { PluginContext, ToolInput, ToolOutput } from '@opencode-ai/plugin';
import { detectIntent, WorkflowType } from './intent-detection';
import { memoryManager } from './memory';
import { taskOrchestrator } from './task-orchestrator';
import { workflowExecutor } from './workflow-executor';

export interface RouterHooks {
  messageReceived: (input: ToolInput, output: ToolOutput) => Promise<void>;
  sessionCreated: (input: any, output: any) => Promise<void>;
  sessionCompacted: (input: any, output: any) => Promise<void>;
  toolExecuteBefore: (input: ToolInput, output: ToolOutput) => Promise<void>;
  toolExecuteAfter: (input: ToolInput, output: ToolOutput) => Promise<void>;
  agentStarted: (input: any, output: any) => Promise<void>;
  agentCompleted: (input: any, output: any) => Promise<void>;
  manualInvoke: (args: any, context: any) => Promise<string>;
}

export async function cc10xRouter(ctx: PluginContext): Promise<{ routerHooks: RouterHooks }> {
  
  // Initialize memory system
  await memoryManager.initialize(ctx);
  
  // State tracking
  const activeWorkflows = new Map<string, WorkflowState>();
  
  const routerHooks: RouterHooks = {
    // Main message interceptor - this is where cc10x magic happens
    messageReceived: async (input: ToolInput, output: ToolOutput) => {
      try {
        const userMessage = input.args?.message || input.args?.text || '';
        
        // Skip if not a development-related message
        if (!isDevelopmentIntent(userMessage)) {
          return; // Let OpenCode handle normally
        }

        // Check for active workflow to resume
        const activeWorkflow = await checkForActiveWorkflow(ctx);
        if (activeWorkflow) {
          await resumeWorkflow(activeWorkflow, userMessage, ctx);
          return;
        }

        // Load memory for new workflow
        const memory = await memoryManager.load(ctx);
        
        // Detect user intent
        const intent = detectIntent(userMessage, memory);
        
        // Create task hierarchy
        const workflowTask = await taskOrchestrator.createWorkflowTask(ctx, {
          userRequest: userMessage,
          intent: intent,
          memory: memory
        });

        // Execute appropriate workflow
        await workflowExecutor.executeWorkflow(ctx, {
          intent: intent,
          userRequest: userMessage,
          memory: memory,
          workflowTaskId: workflowTask.id,
          activeForm: getActiveFormForIntent(intent, userMessage)
        });

      } catch (error) {
        console.error('cc10x router error:', error);
        // Don't block OpenCode - just log and continue
      }
    },

    sessionCreated: async (input: any, output: any) => {
      // Ensure memory directory exists on session start
      await memoryManager.ensureDirectory(ctx);
    },

    sessionCompacted: async (input: any, output: any) => {
      // Save critical state before compaction
      await memoryManager.saveCompactionCheckpoint(ctx);
    },

    toolExecuteBefore: async (input: ToolInput, output: ToolOutput) => {
      // TDD enforcement: Check if we're in a test phase
      if (input.tool === 'bash' && isTestCommand(input.args?.command)) {
        await enforceTDDRequirements(ctx, input);
      }
      
      // Permission-free memory operations check
      if (isMemoryOperation(input)) {
        await validateMemoryOperation(ctx, input);
      }
    },

    toolExecuteAfter: async (input: ToolInput, output: ToolOutput) => {
      // Capture exit codes for verification
      if (output.exitCode !== undefined) {
        await taskOrchestrator.recordExecutionResult(ctx, {
          tool: input.tool,
          command: input.args?.command,
          exitCode: output.exitCode,
          timestamp: new Date().toISOString()
        });
      }
    },

    agentStarted: async (input: any, output: any) => {
      // Track agent execution for task updates
      const agentName = input.agentName || input.agent;
      const taskId = input.taskId;
      
      if (taskId) {
        await taskOrchestrator.updateTaskStatus(ctx, taskId, 'in_progress');
      }
      
      // Log agent start for debugging
      console.log(`🤖 cc10x agent started: ${agentName}`);
    },

    agentCompleted: async (input: any, output: any) => {
      const agentName = input.agentName || input.agent;
      const taskId = input.taskId;
      const result = input.result || input.output;
      
      if (taskId) {
        await taskOrchestrator.updateTaskStatus(ctx, taskId, 'completed', result);
      }
      
      // Extract memory notes from agent output
      const memoryNotes = extractMemoryNotes(result);
      if (memoryNotes && memoryNotes.length > 0) {
        await memoryManager.accumulateNotes(ctx, memoryNotes);
      }
      
      console.log(`✅ cc10x agent completed: ${agentName}`);
    },

    manualInvoke: async (args: any, context: any) => {
      // Allow manual router invocation
      return 'cc10x router invoked manually. Use natural language for development tasks.';
    }
  };

  return { routerHooks };
}

// Helper functions
function isDevelopmentIntent(message: string): boolean {
  const devKeywords = [
    'build', 'implement', 'create', 'make', 'write', 'add', 'develop', 'code',
    'feature', 'component', 'app', 'application', 'debug', 'fix', 'error', 
    'bug', 'broken', 'troubleshoot', 'review', 'audit', 'check', 'analyze',
    'plan', 'design', 'architect', 'roadmap', 'strategy', 'test', 'tdd'
  ];
  
  const lowerMessage = message.toLowerCase();
  return devKeywords.some(keyword => lowerMessage.includes(keyword));
}

function getActiveFormForIntent(intent: WorkflowType, userMessage: string): string {
  const intentDescriptions = {
    'BUILD': `Building: ${userMessage.substring(0, 50)}...`,
    'DEBUG': `Debugging: ${userMessage.substring(0, 50)}...`,
    'REVIEW': `Reviewing: ${userMessage.substring(0, 50)}...`,
    'PLAN': `Planning: ${userMessage.substring(0, 50)}...`
  };
  return intentDescriptions[intent] || 'Processing development task...';
}

function isTestCommand(command?: string): boolean {
  if (!command) return false;
  const testPatterns = [
    /test/i, /spec/i, /\.test\./, /\.spec\./, 
    /jest/i, /mocha/i, /pytest/i, /tox/i,
    /npm test/i, /yarn test/i, /bun test/i
  ];
  return testPatterns.some(pattern => pattern.test(command));
}

function isMemoryOperation(input: ToolInput): boolean {
  const filePath = input.args?.filePath || '';
  const memoryPaths = [
    '.claude/cc10x/activeContext.md',
    '.claude/cc10x/patterns.md', 
    '.claude/cc10x/progress.md'
  ];
  return memoryPaths.some(path => filePath.includes(path));
}

async function enforceTDDRequirements(ctx: PluginContext, input: ToolInput): Promise<void> {
  // This would enforce TDD cycle - placeholder for now
  // In full implementation, would track test phases
}

async function validateMemoryOperation(ctx: PluginContext, input: ToolInput): Promise<void> {
  // Ensure memory operations are permission-free
  // In full implementation, would validate Edit vs Write usage
}

async function checkForActiveWorkflow(ctx: PluginContext): Promise<WorkflowState | null> {
  // Check if there's an active cc10x workflow to resume
  // This would integrate with OpenCode's task system
  return null; // Placeholder
}

async function resumeWorkflow(workflow: WorkflowState, userMessage: string, ctx: PluginContext): Promise<void> {
  // Resume an existing workflow
  // Implementation would depend on task state
}

function extractMemoryNotes(result: any): string[] {
  // Extract memory notes from agent output
  if (typeof result === 'string') {
    const notes: string[] = [];
    const lines = result.split('\n');
    let inMemorySection = false;
    
    for (const line of lines) {
      if (line.includes('### Memory Notes')) {
        inMemorySection = true;
        continue;
      }
      if (inMemorySection) {
        if (line.startsWith('###') && !line.includes('Memory Notes')) {
          break; // End of section
        }
        if (line.trim() && !line.startsWith('#')) {
          notes.push(line.trim());
        }
      }
    }
    return notes;
  }
  return [];
}

interface WorkflowState {
  id: string;
  type: WorkflowType;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  currentAgent?: string;
  startedAt: string;
  userRequest: string;
}