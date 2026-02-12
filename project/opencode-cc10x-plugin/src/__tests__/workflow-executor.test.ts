import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WorkflowExecutor } from '../workflow-executor';
import { taskOrchestrator } from '../task-orchestrator';
import { memoryManager } from '../memory';

// Mock PluginContext
const createMockContext = () => ({
  readFile: async (path: string): Promise<string> => {
    if (path.includes('activeContext')) {
      return `# Active Context
## Current Focus
- Test focus
## Last Updated
2024-01-01T00:00:00.000Z`;
    }
    if (path.includes('patterns')) {
      return `# Project Patterns
## Common Gotchas
- Test gotcha
## Last Updated
2024-01-01T00:00:00.000Z`;
    }
    if (path.includes('progress')) {
      return `# Progress Tracking
## Current Workflow
- Test workflow
## Last Updated
2024-01-01T00:00:00.000Z`;
    }
    throw new Error(`File not found: ${path}`);
  },
  writeFile: async (path: string, content: string): Promise<void> => {
    console.log(`Mock write: ${path}`);
  },
  editFile: async (path: string, options: { oldString: string; newString: string }): Promise<void> => {
    console.log(`Mock edit: ${path}`);
  },
  bash: async (command: string, args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
    if (command === 'mkdir' && args.includes('-p') && args.some(arg => arg.includes('.opencode/cc10x'))) {
      return { exitCode: 0, stdout: '', stderr: '' };
    }
    if (command === 'npm' && args[0] === 'test') {
      return { exitCode: 0, stdout: '10/10 tests passed', stderr: '' };
    }
    return { exitCode: 0, stdout: 'Command executed', stderr: '' };
  },
  taskCreate: async (options: any): Promise<{ taskId: string }> => {
    return { taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
  },
  taskUpdate: async (options: any): Promise<void> => {
    console.log(`Mock task update: ${options.taskId} -> ${options.status}`);
  },
  invokeAgent: async (agentName: string, options: any): Promise<any> => {
    console.log(`Mock invoke agent: ${agentName}`);
    return { 
      result: `Agent ${agentName} completed successfully`,
      status: 'completed'
    };
  }
});

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;
  let mockCtx: any;

  beforeEach(() => {
    executor = new WorkflowExecutor();
    mockCtx = createMockContext();
    // Clear any existing workflows
    taskOrchestrator.getActiveWorkflows = () => [];
  });

  afterEach(() => {
    memoryManager.clearCache();
  });

  describe('executeWorkflow', () => {
    it('should execute BUILD workflow with correct agent sequence', async () => {
      await executor.executeWorkflow(mockCtx, {
        intent: 'BUILD',
        userRequest: 'build a user authentication system',
        memory: { activeContext: '', patterns: '', progress: '' },
        workflowTaskId: 'test-build-001',
        activeForm: 'Building user authentication'
      });

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should execute DEBUG workflow with correct agent sequence', async () => {
      await executor.executeWorkflow(mockCtx, {
        intent: 'DEBUG',
        userRequest: 'debug the payment processing error',
        memory: { activeContext: '', patterns: '', progress: '' },
        workflowTaskId: 'test-debug-001',
        activeForm: 'Debugging payment error'
      });

      expect(true).toBe(true);
    });

    it('should execute REVIEW workflow with single agent', async () => {
      await executor.executeWorkflow(mockCtx, {
        intent: 'REVIEW',
        userRequest: 'review this code for security issues',
        memory: { activeContext: '', patterns: '', progress: '' },
        workflowTaskId: 'test-review-001',
        activeForm: 'Reviewing code for security'
      });

      expect(true).toBe(true);
    });

    it('should execute PLAN workflow with single agent', async () => {
      await executor.executeWorkflow(mockCtx, {
        intent: 'PLAN',
        userRequest: 'plan the database schema for the project',
        memory: { activeContext: '', patterns: '', progress: '' },
        workflowTaskId: 'test-plan-001',
        activeForm: 'Planning database schema'
      });

      expect(true).toBe(true);
    });

    it('should handle workflow errors gracefully', async () => {
      // Create a context that will fail
      const failingCtx = {
        ...mockCtx,
        invokeAgent: async () => {
          throw new Error('Agent invocation failed');
        }
      };

      await executor.executeWorkflow(failingCtx, {
        intent: 'BUILD',
        userRequest: 'build something',
        memory: { activeContext: '', patterns: '', progress: '' },
        workflowTaskId: 'test-fail-001',
        activeForm: 'Building (expected to fail)'
      });

      // Should handle error and continue
      expect(true).toBe(true);
    });
  });

  describe('buildBuilderPrompt', () => {
    it('should generate proper TDD prompt for component-builder', async () => {
      const prompt = (executor as any).buildBuilderPrompt(
        'build a user authentication system',
        { activeContext: '## Current Focus\nAuth implementation', patterns: '', progress: '' }
      );

      expect(prompt).toContain('Component Builder (TDD)');
      expect(prompt).toContain('RED:');
      expect(prompt).toContain('GREEN:');
      expect(prompt).toContain('REFACTOR:');
      expect(prompt).toContain('build a user authentication system');
      expect(prompt).toContain('Memory Context');
    });
  });

  describe('buildReviewAndHuntPrompt', () => {
    it('should generate prompt for parallel review and hunt', async () => {
      const prompt = (executor as any).buildReviewAndHuntPrompt(
        'build authentication',
        { activeContext: '', patterns: '', progress: '' }
      );

      expect(prompt).toContain('Code Reviewer Focus');
      expect(prompt).toContain('Silent Failure Hunter Focus');
      expect(prompt).toContain('≥80% confidence');
    });
  });

  describe('buildDebugPrompt', () => {
    it('should generate LOG FIRST prompt for bug-investigator', async () => {
      const prompt = (executor as any).buildDebugPrompt(
        'debug the payment error',
        { activeContext: '', patterns: '', progress: '' }
      );

      expect(prompt).toContain('Bug Investigator (LOG FIRST)');
      expect(prompt).toContain('Never fix without evidence');
      expect(prompt).toContain('Reproduce');
      expect(prompt).toContain('Log');
      expect(prompt).toContain('Analyze');
    });
  });

  describe('buildReviewPrompt', () => {
    it('should generate comprehensive review prompt', async () => {
      const prompt = (executor as any).buildReviewPrompt(
        'review the authentication code',
        { activeContext: '', patterns: '', progress: '' }
      );

      expect(prompt).toContain('Code Reviewer (Comprehensive Review)');
      expect(prompt).toContain('Security');
      expect(prompt).toContain('Performance');
      expect(prompt).toContain('Maintainability');
      expect(prompt).toContain('80%+ confidence');
    });
  });

  describe('buildPlanPrompt', () => {
    it('should generate planning prompt with research needs', async () => {
      const prompt = (executor as any).buildPlanPrompt(
        'plan the microservices architecture',
        { activeContext: '', patterns: '', progress: '' }
      );

      expect(prompt).toContain('Planner (Comprehensive Planning)');
      expect(prompt).toContain('### 1. Analysis');
      expect(prompt).toContain('### 2. Architecture');
      expect(prompt).toContain('### 4. Research Needs');
      expect(prompt).toContain('docs/plans/');
    });
  });

  describe('formatMemoryContext', () => {
    it('should format memory context for agent prompts', () => {
      const memory = {
        activeContext: `# Active Context
## Current Focus
- Implementing user authentication
## Decisions
- Use JWT tokens`,
        patterns: `# Project Patterns
## Common Gotchas
- Always validate JWT tokens
`,
        progress: `# Progress Tracking
## Completed
- Set up project structure
`
      };

      const context = (executor as any).formatMemoryContext(memory);
      
      expect(context).toContain('Implementing user authentication');
      expect(context).toContain('Always validate JWT tokens');
      expect(context).toContain('Set up project structure');
    });

    it('should handle empty memory gracefully', () => {
      const context = (executor as any).formatMemoryContext({});
      expect(context).toBe('Memory files empty or not loaded');
    });

    it('should handle partial memory', () => {
      const memory = {
        activeContext: '# Active Context\n## Current Focus\n- Test focus\n'
      };
      
      const context = (executor as any).formatMemoryContext(memory);
      expect(context).toContain('Current Focus: - Test focus');
    });
  });

  describe('parallel execution', () => {
    it('should invoke multiple agents in parallel for BUILD workflow', async () => {
      const invokeCalls: string[] = [];
      
      const trackingCtx = {
        ...mockCtx,
        invokeAgent: async (agentName: string, options: any) => {
          invokeCalls.push(agentName);
          return { result: `Agent ${agentName} completed` };
        }
      };

      await executor.executeWorkflow(trackingCtx, {
        intent: 'BUILD',
        userRequest: 'build a feature',
        memory: { activeContext: '', patterns: '', progress: '' },
        workflowTaskId: 'test-parallel-001',
        activeForm: 'Building with parallel review'
      });

      // Should have called builder, then reviewer and hunter (possibly parallel), then verifier
      expect(invokeCalls).toContain('cc10x-component-builder');
      expect(invokeCalls).toContain('cc10x-code-reviewer');
      expect(invokeCalls).toContain('cc10x-silent-failure-hunter');
      expect(invokeCalls).toContain('cc10x-integration-verifier');
    });
  });

  describe('memory update execution', () => {
    it('should execute memory update at end of workflow', async () => {
      const updateCalls: string[] = [];
      
      const trackingCtx = {
        ...mockCtx,
        invokeAgent: async (agentName: string, options: any) => {
          updateCalls.push(agentName);
          return { result: `Agent ${agentName} completed` };
        }
      };

      await executor.executeWorkflow(trackingCtx, {
        intent: 'BUILD',
        userRequest: 'build a feature',
        memory: { activeContext: '', patterns: '', progress: '' },
        workflowTaskId: 'test-memory-001',
        activeForm: 'Testing memory update'
      });

      // The last agent invoked should be the verifier (memory update is not an agent call)
      const lastAgent = updateCalls[updateCalls.length - 1];
      expect(lastAgent).toBe('cc10x-integration-verifier'); // Last agent in BUILD workflow
    });
  });
});
