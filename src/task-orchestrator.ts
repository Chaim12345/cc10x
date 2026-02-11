import { WorkflowType } from './intent-detection';

export interface TaskInfo {
  id: string;
  subject: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  agentType: string;
  blockedBy?: string[];
  activeForm?: string;
  result?: any;
}

export interface WorkflowTask {
  id: string;
  type: WorkflowType;
  userRequest: string;
  memory: any;
  tasks: TaskInfo[];
  createdAt: string;
  status: 'active' | 'completed' | 'failed';
}

class TaskOrchestrator {
  private activeWorkflows: Map<string, WorkflowTask> = new Map();

  async createWorkflowTask(
    input: any, 
    options: {
      userRequest: string;
      intent: WorkflowType;
      memory: any;
    }
  ): Promise<TaskInfo> {
    const workflowId = `CC10X-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow: WorkflowTask = {
      id: workflowId,
      type: options.intent,
      userRequest: options.userRequest,
      memory: options.memory,
      tasks: [],
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    // Create task hierarchy based on workflow type
    const tasks = this.createTaskHierarchy(workflowId, options.intent, options.userRequest, options.memory);
    workflow.tasks = tasks;

    this.activeWorkflows.set(workflowId, workflow);

    // Create the parent workflow task in OpenCode's task system
    const parentTask = await this.createOpenCodeTask(ctx, {
      subject: `CC10X ${options.intent}: ${options.userRequest.substring(0, 50)}`,
      description: this.buildWorkflowDescription(workflow),
      activeForm: `Starting ${options.intent} workflow`
    });

    // Update workflow with OpenCode task ID
    workflow.tasks[0].id = parentTask.id;

    console.log(`📋 Created workflow ${workflowId} with ${tasks.length} tasks`);
    return workflow.tasks[0];
  }

  private createTaskHierarchy(
    workflowId: string, 
    intent: WorkflowType, 
    userRequest: string,
    memory: any
  ): TaskInfo[] {
    const tasks: TaskInfo[] = [];
    const timestamp = new Date().toISOString();

    switch (intent) {
      case 'BUILD':
        tasks.push(
          {
            id: `${workflowId}-builder`,
            subject: 'CC10X component-builder: Implement feature',
            description: `Build feature with TDD: ${userRequest}\n\nPlan: ${this.extractPlanFile(memory) || 'N/A'}`,
            status: 'pending',
            agentType: 'component-builder',
            activeForm: 'Building components with TDD'
          },
          {
            id: `${workflowId}-reviewer`,
            subject: 'CC10X code-reviewer: Review implementation',
            description: 'Review code quality, patterns, security',
            status: 'pending',
            agentType: 'code-reviewer',
            blockedBy: [`${workflowId}-builder`],
            activeForm: 'Reviewing code quality'
          },
          {
            id: `${workflowId}-hunter`,
            subject: 'CC10X silent-failure-hunter: Hunt edge cases',
            description: 'Find silent failures and edge cases',
            status: 'pending',
            agentType: 'silent-failure-hunter',
            blockedBy: [`${workflowId}-builder`],
            activeForm: 'Hunting for failures'
          },
          {
            id: `${workflowId}-verifier`,
            subject: 'CC10X integration-verifier: Verify implementation',
            description: 'End-to-end validation of the implementation',
            status: 'pending',
            agentType: 'integration-verifier',
            blockedBy: [`${workflowId}-reviewer`, `${workflowId}-hunter`],
            activeForm: 'Verifying integration'
          }
        );
        break;

      case 'DEBUG':
        tasks.push(
          {
            id: `${workflowId}-investigator`,
            subject: 'CC10X bug-investigator: Investigate issue',
            description: `Debug issue with log-first approach: ${userRequest}`,
            status: 'pending',
            agentType: 'bug-investigator',
            activeForm: 'Investigating bug'
          },
          {
            id: `${workflowId}-reviewer`,
            subject: 'CC10X code-reviewer: Validate fix',
            description: 'Review fix for correctness and quality',
            status: 'pending',
            agentType: 'code-reviewer',
            blockedBy: [`${workflowId}-investigator`],
            activeForm: 'Reviewing fix'
          },
          {
            id: `${workflowId}-verifier`,
            subject: 'CC10X integration-verifier: Verify fix',
            description: 'Verify the fix resolves the issue',
            status: 'pending',
            agentType: 'integration-verifier',
            blockedBy: [`${workflowId}-reviewer`],
            activeForm: 'Verifying fix'
          }
        );
        break;

      case 'REVIEW':
        tasks.push(
          {
            id: `${workflowId}-reviewer`,
            subject: 'CC10X code-reviewer: Comprehensive review',
            description: `Review code with 80%+ confidence: ${userRequest}`,
            status: 'pending',
            agentType: 'code-reviewer',
            activeForm: 'Reviewing code'
          }
        );
        break;

      case 'PLAN':
        tasks.push(
          {
            id: `${workflowId}-planner`,
            subject: 'CC10X planner: Create comprehensive plan',
            description: `Create detailed plan: ${userRequest}`,
            status: 'pending',
            agentType: 'planner',
            activeForm: 'Creating plan'
          }
        );
        break;
    }

    // Add memory update task (workflow-final)
    tasks.push({
      id: `${workflowId}-memory-update`,
      subject: 'CC10X Memory Update',
      description: 'Persist workflow learnings to memory bank',
      status: 'pending',
      agentType: 'router', // Main assistant does this
      blockedBy: tasks.map(t => t.id),
      activeForm: 'Updating memory'
    });

    return tasks;
  }

  private buildWorkflowDescription(workflow: WorkflowTask): string {
    const taskList = workflow.tasks.map(t => 
      `- ${t.subject} (${t.status})${t.blockedBy ? ` [blocked by: ${t.blockedBy.join(', ')}]` : ''}`
    ).join('\n');

    return `
User Request: ${workflow.userRequest}
Workflow Type: ${workflow.type}
Created: ${workflow.createdAt}

Task Hierarchy:
${taskList}

Memory Context:
- Active Context: ${workflow.memory.activeContext ? 'Loaded' : 'Empty'}
- Patterns: ${workflow.memory.patterns ? 'Loaded' : 'Empty'}
- Progress: ${workflow.memory.progress ? 'Loaded' : 'Empty'}

Follow the cc10x workflow strictly. Check blockedBy dependencies before proceeding.
Parallel execution: code-reviewer and silent-failure-hunter can run simultaneously.
    `.trim();
  }

  private extractPlanFile(memory: any): string | null {
    // Look for plan file reference in activeContext.md References section
    const activeContext = memory.activeContext || '';
    const referencesMatch = activeContext.match(/## References\n([\s\S]*?)(?=\n##|\n$)/);
    
    if (referencesMatch) {
      const references = referencesMatch[1];
      const planMatch = references.match(/- Plan:\s*`([^`]+)`/);
      if (planMatch) {
        return planMatch[1];
      }
    }
    return null;
  }

  private async createOpenCodeTask(
    ctx: PluginContext, 
    options: { subject: string; description: string; activeForm: string }
  ): Promise<TaskInfo> {
    try {
      // Use OpenCode's task creation via client
      const result = await input.client.app.task.create({
        subject: options.subject,
        description: options.description,
        activeForm: options.activeForm
      });
      
      return {
        id: result.taskId,
        subject: options.subject,
        description: options.description,
        status: 'pending',
        agentType: 'workflow',
        activeForm: options.activeForm
      };
    } catch (error) {
      console.error('Failed to create OpenCode task:', error);
      // Return local task ID if OpenCode task creation fails
      return {
        id: `local-${Date.now()}`,
        subject: options.subject,
        description: options.description,
        status: 'pending',
        agentType: 'workflow',
        activeForm: options.activeForm
      };
    }
  }

  async updateTaskStatus(
    input: any, 
    taskId: string, 
    status: TaskInfo['status'], 
    result?: any
  ): Promise<void> {
    // Update local workflow state
    for (const workflow of this.activeWorkflows.values()) {
      const task = workflow.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
        task.result = result;
        break;
      }
    }

    // Update OpenCode task if it's an OpenCode task ID
    if (taskId.startsWith('task_') || taskId.length > 20) {
      try {
        await input.client.app.task.update({
          taskId: taskId,
          status: status
        });
      } catch (error) {
        console.warn('Could not update OpenCode task status:', error);
      }
    }
  }

  async recordExecutionResult(
    input: any,
    result: { tool: string; command: string; exitCode: number; timestamp: string }
  ): Promise<void> {
    // Store execution results for verification
    // This would be used by the verification agents
    console.log(`📊 Recorded execution: ${result.tool} ${result.command} → exit ${result.exitCode}`);
  }

  async getRunnableTasks(input: any): Promise<TaskInfo[]> {
    const runnableTasks: TaskInfo[] = [];

    for (const workflow of this.activeWorkflows.values()) {
      if (workflow.status !== 'active') continue;

      for (const task of workflow.tasks) {
        if (task.status !== 'pending') continue;

        // Check if all blockedBy tasks are completed
        if (task.blockedBy) {
          const allUnblocked = task.blockedBy.every(blockedId => {
            const blockedTask = workflow.tasks.find(t => t.id === blockedId);
            return blockedTask?.status === 'completed';
          });
          
          if (!allUnblocked) continue;
        }

        runnableTasks.push(task);
      }
    }

    return runnableTasks;
  }

  async checkForActiveWorkflows(ctx: PluginContext): Promise<WorkflowTask | null> {
    // Check if there are any active workflows to resume
    for (const workflow of this.activeWorkflows.values()) {
      if (workflow.status === 'active') {
        const hasPendingTasks = workflow.tasks.some(t => t.status === 'pending');
        if (hasPendingTasks) {
          return workflow;
        }
      }
    }
    return null;
  }

  async completeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.status = 'completed';
      console.log(`✅ Workflow ${workflowId} completed`);
    }
  }

  getActiveWorkflows(): WorkflowTask[] {
    return Array.from(this.activeWorkflows.values()).filter(w => w.status === 'active');
  }
}

export const taskOrchestrator = new TaskOrchestrator();