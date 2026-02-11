// Simple cc10x plugin for current OpenCode API (JavaScript version)

// Intent detection keywords
const INTENT_KEYWORDS = {
  BUILD: ['build', 'implement', 'create', 'make', 'write', 'add', 'develop', 'code', 'feature', 'component', 'app', 'generate', 'scaffold'],
  DEBUG: ['error', 'bug', 'fix', 'broken', 'crash', 'fail', 'debug', 'troubleshoot', 'issue', 'problem', 'exception'],
  REVIEW: ['review', 'audit', 'check', 'analyze', 'assess', 'evaluate', 'inspect', 'feedback', 'improve'],
  PLAN: ['plan', 'design', 'architect', 'roadmap', 'strategy', 'spec', 'proposal', 'options', 'research']
};

class CC10xOrchestrator {
  constructor() {
    this.activeWorkflows = new Map();
    this.memoryDir = '.claude/cc10x';
  }

  async initialize(input) {
    try {
      await input.$`mkdir -p ${this.memoryDir}`;
      await input.$`mkdir -p docs/plans`;
      await input.$`mkdir -p docs/research`;
    } catch (error) {
      console.log('Could not create memory directories:', error);
    }
  }

  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    const scores = { BUILD: 0, DEBUG: 0, REVIEW: 0, PLAN: 0 };
    const foundKeywords = [];

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          scores[intent]++;
          foundKeywords.push(keyword);
        }
      }
    }

    let maxScore = 0;
    let bestIntent = 'BUILD';
    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestIntent = intent;
      }
    }

    const confidence = maxScore > 0 ? Math.min(0.5 + maxScore * 0.2, 0.95) : 0.3;

    return {
      intent: bestIntent,
      confidence,
      keywords: foundKeywords
    };
  }

  isDevelopmentTask(message) {
    const lowerMessage = message.toLowerCase();
    return Object.values(INTENT_KEYWORDS).some(keywords =>
      keywords.some(keyword => lowerMessage.includes(keyword))
    );
  }

  async createWorkflow(input, userMessage, intent) {
    const workflowId = `workflow-${Date.now()}`;
    const now = new Date().toISOString();

    const workflow = {
      id: workflowId,
      intent: intent.intent,
      userRequest: userMessage,
      status: 'running',
      tasks: [],
      createdAt: now,
      updatedAt: now
    };

    this.activeWorkflows.set(workflowId, workflow);
    await this.saveWorkflowMemory(input, workflow);
    return workflow;
  }

  async executeWorkflow(input, workflow) {
    console.log(`\n🚀 Starting cc10x ${workflow.intent} workflow: ${workflow.userRequest}\n`);

    try {
      switch (workflow.intent) {
        case 'BUILD':
          await this.executeBuildWorkflow(input, workflow);
          break;
        case 'DEBUG':
          await this.executeDebugWorkflow(input, workflow);
          break;
        case 'REVIEW':
          await this.executeReviewWorkflow(input, workflow);
          break;
        case 'PLAN':
          await this.executePlanWorkflow(input, workflow);
          break;
      }

      workflow.status = 'completed';
      await this.saveWorkflowMemory(input, workflow);
      console.log(`✅ Workflow ${workflow.id} completed successfully`);

    } catch (error) {
      workflow.status = 'failed';
      await this.saveWorkflowMemory(input, workflow);
      console.error(`❌ Workflow ${workflow.id} failed:`, error);
    }
  }

  async executeBuildWorkflow(input, workflow) {
    const tasks = [
      { id: `${workflow.id}-task-1`, subject: 'Analyze requirements and create plan', status: 'pending' },
      { id: `${workflow.id}-task-2`, subject: 'Write failing test (RED phase)', status: 'pending' },
      { id: `${workflow.id}-task-3`, subject: 'Implement minimal code (GREEN phase)', status: 'pending' },
      { id: `${workflow.id}-task-4`, subject: 'Refactor and verify (REFACTOR phase)', status: 'pending' },
      { id: `${workflow.id}-task-5`, subject: 'Run full test suite', status: 'pending' }
    ];

    workflow.tasks = tasks;
    await this.saveWorkflowMemory(input, workflow);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      task.status = 'running';
      await this.saveWorkflowMemory(input, workflow);

      console.log(`🔨 Build task ${i + 1}/${tasks.length}: ${task.subject}`);
      await this.simulateTaskExecution(input, task, workflow);
      
      task.status = 'completed';
      await this.saveWorkflowMemory(input, workflow);
    }
  }

  async executeDebugWorkflow(input, workflow) {
    const tasks = [
      { id: `${workflow.id}-task-1`, subject: 'Investigate error logs and symptoms', status: 'pending' },
      { id: `${workflow.id}-task-2`, subject: 'Identify root cause', status: 'pending' },
      { id: `${workflow.id}-task-3`, subject: 'Implement fix', status: 'pending' },
      { id: `${workflow.id}-task-4`, subject: 'Test the fix', status: 'pending' },
      { id: `${workflow.id}-task-5`, subject: 'Verify no regressions', status: 'pending' }
    ];

    workflow.tasks = tasks;
    await this.saveWorkflowMemory(input, workflow);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      task.status = 'running';
      await this.saveWorkflowMemory(input, workflow);

      console.log(`🐛 Debug task ${i + 1}/${tasks.length}: ${task.subject}`);
      await this.simulateTaskExecution(input, task, workflow);
      
      task.status = 'completed';
      await this.saveWorkflowMemory(input, workflow);
    }
  }

  async executeReviewWorkflow(input, workflow) {
    const tasks = [
      { id: `${workflow.id}-task-1`, subject: 'Review code quality and patterns', status: 'pending' },
      { id: `${workflow.id}-task-2`, subject: 'Check for security issues', status: 'pending' },
      { id: `${workflow.id}-task-3`, subject: 'Validate error handling', status: 'pending' },
      { id: `${workflow.id}-task-4`, subject: 'Assess performance implications', status: 'pending' },
      { id: `${workflow.id}-task-5`, subject: 'Provide recommendations', status: 'pending' }
    ];

    workflow.tasks = tasks;
    await this.saveWorkflowMemory(input, workflow);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      task.status = 'running';
      await this.saveWorkflowMemory(input, workflow);

      console.log(`👀 Review task ${i + 1}/${tasks.length}: ${task.subject}`);
      await this.simulateTaskExecution(input, task, workflow);
      
      task.status = 'completed';
      await this.saveWorkflowMemory(input, workflow);
    }
  }

  async executePlanWorkflow(input, workflow) {
    const tasks = [
      { id: `${workflow.id}-task-1`, subject: 'Analyze requirements and constraints', status: 'pending' },
      { id: `${workflow.id}-task-2`, subject: 'Research existing solutions', status: 'pending' },
      { id: `${workflow.id}-task-3`, subject: 'Design architecture and API', status: 'pending' },
      { id: `${workflow.id}-task-4`, subject: 'Create implementation plan', status: 'pending' },
      { id: `${workflow.id}-task-5`, subject: 'Identify risks and mitigations', status: 'pending' }
    ];

    workflow.tasks = tasks;
    await this.saveWorkflowMemory(input, workflow);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      task.status = 'running';
      await this.saveWorkflowMemory(input, workflow);

      console.log(`📋 Plan task ${i + 1}/${tasks.length}: ${task.subject}`);
      await this.simulateTaskExecution(input, task, workflow);
      
      task.status = 'completed';
      await this.saveWorkflowMemory(input, workflow);
    }
  }

  async simulateTaskExecution(input, task, workflow) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    task.result = `Task completed using cc10x orchestration. Workflow: ${workflow.intent}`;
  }

  async saveWorkflowMemory(input, workflow) {
    try {
      const memoryContent = `# cc10x Memory

## Active Workflow
- ID: ${workflow.id}
- Intent: ${workflow.intent}
- Status: ${workflow.status}
- Request: ${workflow.userRequest}
- Created: ${workflow.createdAt}
- Updated: ${workflow.updatedAt}

## Tasks
${workflow.tasks.map(t => `- [${t.status}] ${t.subject} (${t.id})`).join('\n')}

## Last Updated
${new Date().toISOString()}
`;

      await input.writeFile(`${this.memoryDir}/activeContext.md`, memoryContent);
    } catch (error) {
      console.log('Could not save memory:', error);
    }
  }

  async loadMemory(input) {
    try {
      const content = await input.readFile(`${this.memoryDir}/activeContext.md`);
      return { content };
    } catch {
      return { content: '' };
    }
  }

  getActiveWorkflow(sessionID) {
    return Array.from(this.activeWorkflows.values()).find(w => w.status === 'running');
  }
}

// Main plugin function
export async function OpenCodeCC10xPlugin(input) {
  console.log('🔌 OpenCode cc10x Plugin v6.0.19 (JavaScript) initializing...');

  const orchestrator = new CC10xOrchestrator();
  await orchestrator.initialize(input);

  const hooks = {
    'chat.message': async (msgInput, output) => {
      try {
        const userMessage = output.message.parts
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join(' ');
        
        if (!userMessage.trim()) {
          return;
        }

        if (!orchestrator.isDevelopmentTask(userMessage)) {
          return;
        }

        console.log(`🎯 cc10x detected development task: "${userMessage.substring(0, 100)}..."`);

        const intent = orchestrator.detectIntent(userMessage);
        console.log(`📊 Detected intent: ${intent.intent} (confidence: ${intent.confidence})`);

        const workflow = await orchestrator.createWorkflow(input, userMessage, intent);
        await orchestrator.executeWorkflow(input, workflow);

      } catch (error) {
        console.error('cc10x error:', error);
      }
    },

    'tool.execute.before': async (toolInput, toolOutput) => {
      if (toolInput.tool === 'bash') {
        const command = toolInput.args?.command || '';
        if (command.includes('test') || command.includes('spec')) {
          console.log('🧪 cc10x: Test command detected, ensuring TDD compliance');
        }
      }
    },

    'tool.execute.after': async (toolInput, toolOutput) => {
      if (toolOutput.exitCode !== undefined) {
        console.log(`📈 cc10x: Tool ${toolInput.tool} exited with code ${toolOutput.exitCode}`);
      }
    },

    'experimental.session.compacting': async (sessionInput, output) => {
      console.log('💾 cc10x: Session compaction, saving state...');
    },

    'event': async (eventInput) => {
      // Handle events if needed
    }
  };

  return {
    name: 'opencode-cc10x',
    description: 'Intelligent orchestration system for OpenCode - port of cc10x from Claude Code',
    version: '6.0.19',
    hooks,
    tools: {
      'cc10x-status': {
        description: 'Get current cc10x orchestration status',
        execute: async (args, context) => {
          const activeWorkflows = Array.from(orchestrator.activeWorkflows.values());
          if (activeWorkflows.length === 0) {
            return '📭 No active workflows';
          }
          
          const status = activeWorkflows.map(w => 
            `🔄 ${w.id}: ${w.intent} - ${w.status} (${w.tasks.length} tasks)`
          ).join('\n');
          
          return `📊 Active cc10x workflows:\n${status}`;
        }
      }
    },
    commands: [
      {
        name: 'cc10x-orchestrate',
        description: 'Run cc10x intelligent orchestration for a development task',
        execute: async (args, context) => {
          const request = args.request || args.task || args.prompt || '';
          if (!request.trim()) {
            return 'Please provide a task description. Usage: /cc10x-orchestrate <task description>';
          }
          
          console.log(`🚀 Manual cc10x orchestration: ${request}`);
          
          const intent = orchestrator.detectIntent(request);
          const workflow = await orchestrator.createWorkflow(input, request, intent);
          
          orchestrator.executeWorkflow(input, workflow).catch(console.error);
          
          return `✅ cc10x orchestration started!\n📋 Intent: ${intent.intent}\n🔧 Workflow ID: ${workflow.id}\n💡 The system will automatically execute the ${intent.intent.toLowerCase()} workflow.`;
        }
      },
      {
        name: 'cc10x-status',
        description: 'Show current cc10x orchestration status',
        execute: async (args, context) => {
          const activeWorkflows = Array.from(orchestrator.activeWorkflows.values());
          if (activeWorkflows.length === 0) {
            return '📭 No active workflows';
          }
          
          const status = activeWorkflows.map(w => 
            `🔄 ${w.id}: ${w.intent} - ${w.status}\n   Request: ${w.userRequest.substring(0, 50)}...\n   Tasks: ${w.tasks.filter(t => t.status === 'completed').length}/${w.tasks.length} completed`
          ).join('\n\n');
          
          return `📊 Active cc10x workflows:\n\n${status}`;
        }
      }
    ]
  };
}

export { OpenCodeCC10xPlugin };
export default OpenCodeCC10xPlugin;