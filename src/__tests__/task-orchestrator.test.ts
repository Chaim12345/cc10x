import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { taskOrchestrator } from '../task-orchestrator';

// Mock PluginContext
const createMockContext = () => ({
  taskCreate: async (options: any): Promise<{ taskId: string }> => {
    return { taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
  },
  taskUpdate: async (options: any): Promise<void> => {
    console.log(`Mock task update: ${options.taskId} -> ${options.status}`);
  }
});

describe('TaskOrchestrator', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = createMockContext();
    // Clear any existing workflows to start fresh
    taskOrchestrator.activeWorkflows.clear();
  });

  describe('createWorkflowTask', () => {
    it('should create BUILD workflow with correct task hierarchy', async () => {
      const workflowTask = await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'build a user authentication system',
        intent: 'BUILD',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      expect(workflowTask).toBeDefined();
      // The returned task is the first agent task (component-builder)
      expect(workflowTask.subject).toContain('component-builder');
      expect(workflowTask.agentType).toBe('component-builder');
      expect(workflowTask.id).toBeDefined();
      
      // Check that the workflow contains the correct agent tasks
      const workflows = taskOrchestrator.getActiveWorkflows();
      const workflow = workflows[0];
      expect(workflow.tasks.length).toBeGreaterThanOrEqual(4); // builder, reviewer, hunter, verifier, memory
      expect(workflow.tasks.some(t => t.agentType === 'component-builder')).toBe(true);
      expect(workflow.tasks.some(t => t.agentType === 'code-reviewer')).toBe(true);
      expect(workflow.tasks.some(t => t.agentType === 'silent-failure-hunter')).toBe(true);
      expect(workflow.tasks.some(t => t.agentType === 'integration-verifier')).toBe(true);
    });

    it('should create DEBUG workflow with correct task hierarchy', async () => {
      const workflowTask = await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'debug the payment error',
        intent: 'DEBUG',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      expect(workflowTask).toBeDefined();
      expect(workflowTask.subject).toContain('bug-investigator');
      expect(workflowTask.agentType).toBe('bug-investigator');
      
      const workflows = taskOrchestrator.getActiveWorkflows();
      const workflow = workflows[0];
      expect(workflow.tasks.some(t => t.agentType === 'bug-investigator')).toBe(true);
      expect(workflow.tasks.some(t => t.agentType === 'code-reviewer')).toBe(true);
      expect(workflow.tasks.some(t => t.agentType === 'integration-verifier')).toBe(true);
    });

    it('should create REVIEW workflow with single task', async () => {
      const workflowTask = await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'review this code',
        intent: 'REVIEW',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      expect(workflowTask).toBeDefined();
      expect(workflowTask.subject).toContain('code-reviewer');
      expect(workflowTask.agentType).toBe('code-reviewer');
      
      const workflows = taskOrchestrator.getActiveWorkflows();
      const workflow = workflows[0];
      expect(workflow.tasks.length).toBe(2); // reviewer + memory update
      expect(workflow.tasks.some(t => t.agentType === 'code-reviewer')).toBe(true);
    });

    it('should create PLAN workflow with single task', async () => {
      const workflowTask = await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'plan the database schema',
        intent: 'PLAN',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      expect(workflowTask).toBeDefined();
      expect(workflowTask.subject).toContain('planner');
      expect(workflowTask.agentType).toBe('planner');
      
      const workflows = taskOrchestrator.getActiveWorkflows();
      const workflow = workflows[0];
      expect(workflow.tasks.length).toBe(2); // planner + memory update
      expect(workflow.tasks.some(t => t.agentType === 'planner')).toBe(true);
    });

    it('should include memory update task in all workflows', async () => {
      const workflowTask = await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'build something',
        intent: 'BUILD',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      // Check that the workflow was stored
      const workflows = taskOrchestrator.getActiveWorkflows();
      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows[0];
      const hasMemoryUpdateTask = workflow.tasks.some(task => 
        task.subject.includes('Memory Update')
      );
      expect(hasMemoryUpdateTask).toBe(true);
    });

    it('should set up correct dependencies for BUILD workflow', async () => {
      const workflowTask = await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'build a feature',
        intent: 'BUILD',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      const workflows = taskOrchestrator.getActiveWorkflows();
      const workflow = workflows[0];
      
      // Find verifier task
      const verifierTask = workflow.tasks.find(t => t.agentType === 'integration-verifier');
      expect(verifierTask).toBeDefined();
      expect(verifierTask.blockedBy.length).toBeGreaterThanOrEqual(2);
      expect(verifierTask.blockedBy.some(id => id.includes('reviewer'))).toBe(true);
      expect(verifierTask.blockedBy.some(id => id.includes('hunter'))).toBe(true);
    });

    it('should set up parallel execution for reviewer and hunter', async () => {
      const workflowTask = await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'build a feature',
        intent: 'BUILD',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      const workflows = taskOrchestrator.getActiveWorkflows();
      const workflow = workflows[0];
      
      const reviewerTask = workflow.tasks.find(t => t.subject.includes('code-reviewer'));
      const hunterTask = workflow.tasks.find(t => t.subject.includes('silent-failure-hunter'));
      
      expect(reviewerTask).toBeDefined();
      expect(hunterTask).toBeDefined();
      
      // Both should be blocked by builder only (parallel execution)
      expect(reviewerTask.blockedBy).toEqual([expect.stringContaining('builder')]);
      expect(hunterTask.blockedBy).toEqual([expect.stringContaining('builder')]);
    });
  });

  describe('getRunnableTasks', () => {
    it('should return tasks that are ready to run', async () => {
      await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'build a feature',
        intent: 'BUILD',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      const runnableTasks = await taskOrchestrator.getRunnableTasks(mockCtx);
      
      // First task (builder) should be runnable (no dependencies)
      expect(runnableTasks.length).toBeGreaterThan(0);
      expect(runnableTasks[0].agentType).toBe('component-builder');
    });

    it('should not return tasks with incomplete dependencies', async () => {
      await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'build a feature',
        intent: 'BUILD',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      // Initially, only builder should be runnable (no dependencies)
      let runnableTasks = await taskOrchestrator.getRunnableTasks(mockCtx);
      const builderTasks = runnableTasks.filter(t => t.agentType === 'component-builder');
      expect(builderTasks.length).toBe(1);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status correctly', async () => {
      await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'build a feature',
        intent: 'BUILD',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      const workflows = taskOrchestrator.getActiveWorkflows();
      const workflow = workflows[0];
      const builderTask = workflow.tasks.find(t => t.agentType === 'component-builder');

      if (builderTask) {
        await taskOrchestrator.updateTaskStatus(mockCtx, builderTask.id, 'in_progress');
        expect(builderTask.status).toBe('in_progress');
        
        await taskOrchestrator.updateTaskStatus(mockCtx, builderTask.id, 'completed');
        expect(builderTask.status).toBe('completed');
      }
    });
  });

  describe('checkForActiveWorkflows', () => {
    it('should return active workflow if exists', async () => {
      await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'build a feature',
        intent: 'BUILD',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      const activeWorkflow = await taskOrchestrator.checkForActiveWorkflows(mockCtx);
      expect(activeWorkflow).toBeDefined();
      expect(activeWorkflow?.status).toBe('active');
    });

    it('should return null if no active workflows', async () => {
      // Ensure no workflows exist
      taskOrchestrator.activeWorkflows.clear();
      const activeWorkflow = await taskOrchestrator.checkForActiveWorkflows(mockCtx);
      expect(activeWorkflow).toBeNull();
    });
  });

  describe('completeWorkflow', () => {
    it('should mark workflow as completed', async () => {
      await taskOrchestrator.createWorkflowTask(mockCtx, {
        userRequest: 'build a feature',
        intent: 'BUILD',
        memory: { activeContext: '', patterns: '', progress: '' }
      });

      const workflows = taskOrchestrator.getActiveWorkflows();
      const workflowId = workflows[0].id;

      await taskOrchestrator.completeWorkflow(workflowId);
      
      // Check directly in the activeWorkflows map (not filtered by status)
      const completedWorkflow = taskOrchestrator['activeWorkflows'].get(workflowId);
      expect(completedWorkflow?.status).toBe('completed');
    });
  });

  describe('recordExecutionResult', () => {
    it('should record execution results without errors', async () => {
      await expect(taskOrchestrator.recordExecutionResult(mockCtx, {
        tool: 'bash',
        command: 'npm test',
        exitCode: 0,
        timestamp: new Date().toISOString()
      })).resolves.toBe(undefined);
    });
  });
});