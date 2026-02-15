import { taskOrchestrator } from './task-orchestrator';
import { memoryManager } from './memory';
import { WorkflowType } from './intent-detection';

export interface WorkflowOptions {
  intent: WorkflowType;
  userRequest: string;
  memory: any;
  workflowTaskId: string;
  activeForm: string;
}

export class WorkflowExecutor {
  
  async executeWorkflow(
    input: any, 
    options: WorkflowOptions
  ): Promise<void> {
    const { intent, userRequest, memory, workflowTaskId, activeForm } = options;
    
    console.log(`🚀 Executing ${intent} workflow for: "${userRequest}"`);

    try {
      switch (intent) {
        case 'BUILD':
          await this.executeBuildWorkflow(input, { userRequest, memory, workflowTaskId });
          break;
        case 'DEBUG':
          await this.executeDebugWorkflow(input, { userRequest, memory, workflowTaskId });
          break;
        case 'REVIEW':
          await this.executeReviewWorkflow(input, { userRequest, memory, workflowTaskId });
          break;
        case 'PLAN':
          await this.executePlanWorkflow(input, { userRequest, memory, workflowTaskId });
          break;
      }

      // Final memory update (workflow-final)
      await this.executeMemoryUpdate(input, workflowTaskId);
      
      // Mark workflow complete
      await taskOrchestrator.completeWorkflow(workflowTaskId);
      
      console.log(`✅ ${intent} workflow completed successfully`);

    } catch (error) {
      console.error(`❌ ${intent} workflow failed:`, error);
      await this.handleWorkflowFailure(input, workflowTaskId, error);
      const message = (error as any)?.message || String(error);
      await taskOrchestrator.failWorkflow(workflowTaskId, message);
    }
  }

  private async executeBuildWorkflow(
    input: any, 
    options: { userRequest: string; memory: any; workflowTaskId: string }
  ): Promise<void> {
    const { userRequest, memory, workflowTaskId } = options;

    // Step 1: component-builder (TDD)
    await this.invokeAgent(input, {
      agentName: 'cc10x-component-builder',
      taskId: `${workflowTaskId}-builder`,
      prompt: this.buildBuilderPrompt(userRequest, memory),
      waitForCompletion: true
    });

    // Step 2: Parallel execution - code-reviewer and silent-failure-hunter
    await this.invokeParallelAgents(input, {
      agentNames: ['cc10x-code-reviewer', 'cc10x-silent-failure-hunter'],
      baseTaskId: workflowTaskId,
      sharedPrompt: this.buildReviewAndHuntPrompt(userRequest, memory),
      waitForCompletion: true
    });

    // Step 3: integration-verifier
    await this.invokeAgent(input, {
      agentName: 'cc10x-integration-verifier',
      taskId: `${workflowTaskId}-verifier`,
      prompt: await this.buildVerifierPrompt(input, workflowTaskId),
      waitForCompletion: true
    });
  }

  private async executeDebugWorkflow(
    input: any, 
    options: { userRequest: string; memory: any; workflowTaskId: string }
  ): Promise<void> {
    const { userRequest, memory, workflowTaskId } = options;

    // Step 1: bug-investigator (log-first)
    await this.invokeAgent(input, {
      agentName: 'cc10x-bug-investigator',
      taskId: `${workflowTaskId}-investigator`,
      prompt: this.buildDebugPrompt(userRequest, memory),
      waitForCompletion: true
    });

    // Step 2: code-reviewer (validate fix)
    await this.invokeAgent(input, {
      agentName: 'cc10x-code-reviewer',
      taskId: `${workflowTaskId}-reviewer`,
      prompt: this.buildReviewFixPrompt(userRequest, memory),
      waitForCompletion: true
    });

    // Step 3: integration-verifier
    await this.invokeAgent(input, {
      agentName: 'cc10x-integration-verifier',
      taskId: `${workflowTaskId}-verifier`,
      prompt: await this.buildVerifierPrompt(input, workflowTaskId),
      waitForCompletion: true
    });
  }

  private async executeReviewWorkflow(
    input: any, 
    options: { userRequest: string; memory: any; workflowTaskId: string }
  ): Promise<void> {
    const { userRequest, memory, workflowTaskId } = options;

    // Single step: code-reviewer
    await this.invokeAgent(input, {
      agentName: 'cc10x-code-reviewer',
      taskId: `${workflowTaskId}-reviewer`,
      prompt: this.buildReviewPrompt(userRequest, memory),
      waitForCompletion: true
    });
  }

  private async executePlanWorkflow(
    input: any, 
    options: { userRequest: string; memory: any; workflowTaskId: string }
  ): Promise<void> {
    const { userRequest, memory, workflowTaskId } = options;

    // Single step: planner
    await this.invokeAgent(input, {
      agentName: 'cc10x-planner',
      taskId: `${workflowTaskId}-planner`,
      prompt: this.buildPlanPrompt(userRequest, memory),
      waitForCompletion: true
    });
  }

  private async executeMemoryUpdate(
    input: any, 
    workflowTaskId: string
  ): Promise<void> {
    // This is the workflow-final memory persistence
    // The main assistant (router) handles this
    console.log('💾 Executing workflow-final memory update');
    
    // Persist any accumulated memory notes
    await memoryManager.persistAccumulatedNotes(input);
    
    // Update progress.md with completion
    await memoryManager.updateProgress(input, {
      completed: [`Workflow ${workflowTaskId} completed with verification`]
    });
  }

  private async invokeAgent(
    input: any, 
    options: {
      agentName: string;
      taskId: string;
      prompt: string;
      waitForCompletion: boolean;
    }
  ): Promise<void> {
    const { agentName, taskId, prompt, waitForCompletion } = options;

    console.log(`🤖 Invoking agent: ${agentName} (task: ${taskId})`);

    try {
      // Update task status to in_progress
      await taskOrchestrator.updateTaskStatus(input, taskId, 'in_progress');

      // Invoke the agent using OpenCode's agent system
      let result: any;
      if (typeof input?.invokeAgent === 'function') {
        result = await input.invokeAgent(agentName, {
          prompt: prompt,
          taskId: taskId
        });
      } else {
        result = await input.client.app.agent.invoke(agentName, {
          prompt: prompt,
          taskId: taskId
        });
      }

      // Update task status to completed
      await taskOrchestrator.updateTaskStatus(input, taskId, 'completed', result);

      console.log(`✅ Agent ${agentName} completed`);
    } catch (error) {
      console.error(`❌ Agent ${agentName} failed:`, error);
      await taskOrchestrator.updateTaskStatus(input, taskId, 'blocked');
      throw error;
    }
  }

  private async invokeParallelAgents(
    input: any, 
    options: {
      agentNames: string[];
      baseTaskId: string;
      sharedPrompt: string;
      waitForCompletion: boolean;
    }
  ): Promise<void> {
    const { agentNames, baseTaskId, sharedPrompt, waitForCompletion } = options;

    console.log(`⚡ Invoking parallel agents: ${agentNames.join(', ')}`);

    // Create promises for all agents
    const agentPromises = agentNames.map(agentName => 
      this.invokeAgent(input, {
        agentName,
        taskId: `${baseTaskId}-${agentName.split('-').pop()}`,
        prompt: sharedPrompt,
        waitForCompletion: true // Each agent waits for its own completion
      })
    );

    // Wait for all to complete
    await Promise.all(agentPromises);
  }

  private buildBuilderPrompt(userRequest: string, memory: any): string {
    return `
# Component Builder (TDD)

## User Request
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Instructions
Follow the TDD cycle strictly:
1. RED: Write a failing test first (must exit with code 1)
2. GREEN: Write minimal code to pass (must exit with code 0)  
3. REFACTOR: Clean up while keeping tests green
4. VERIFY: All tests must pass

## Pre-Implementation Checklist
- API: CORS? Auth middleware? Input validation? Rate limiting?
- UI: Loading states? Error boundaries? Accessibility?
- DB: Migrations? N+1 queries? Transactions?
- All: Edge cases listed? Error handling planned?

## Output Requirements
- Provide TDD evidence with exact commands and exit codes
- Include Dev Journal with decisions and assumptions
- Follow the Router Contract format exactly
- Update memory via Edit tool (permission-free)
    `.trim();
  }

  private buildReviewAndHuntPrompt(userRequest: string, memory: any): string {
    return `
# Code Review & Silent Failure Hunt

## User Request  
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Instructions
Analyze the implementation from the component-builder. Focus on:

### Code Reviewer Focus
- Code quality and best practices
- Security vulnerabilities (OWASP top 10)
- Performance implications (N+1 queries, etc.)
- Maintainability and readability
- API design and contracts

### Silent Failure Hunter Focus  
- Empty catch blocks
- Missing error handling
- Unvalidated inputs
- Resource leaks
- Race conditions
- Edge cases not covered by tests

## Confidence Scoring
Only report issues with ≥80% confidence. Provide file:line citations.

## Output Requirements
- Critical Issues section with confidence scores
- Verdict: APPROVED or CHANGES REQUESTED
- Include "### Memory Notes" section for workflow persistence
    `.trim();
  }

  private async buildVerifierPrompt(
    input: any, 
    workflowTaskId: string
  ): Promise<string> {
    // Collect findings from previous agents
    const reviewerTaskId = `${workflowTaskId}-reviewer`;
    const hunterTaskId = `${workflowTaskId}-hunter`;
    
    // In a full implementation, would fetch task results
    // For now, provide template
    return `
# Integration Verifier

## Task Context
- Workflow: ${workflowTaskId}
- Previous agents: code-reviewer, silent-failure-hunter

## Instructions
Verify the implementation considering ALL findings from previous agents.

### Verification Checklist
- [ ] All tests pass (exit code 0)
- [ ] No critical security issues
- [ ] No silent failures detected
- [ ] Error handling is comprehensive
- [ ] Performance is acceptable
- [ ] Code follows project patterns

### Critical Issues
Any CRITICAL issues should block PASS verdict.

## Output Requirements
- Verdict: PASS or FAIL with reasoning
- Include verification evidence (commands + exit codes)
- Provide "### Memory Notes" section
    `.trim();
  }

  private buildDebugPrompt(userRequest: string, memory: any): string {
    return `
# Bug Investigator (LOG FIRST)

## User Request
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Iron Law: LOG FIRST
Never fix without evidence. Follow this process:

1. **Reproduce** - Get exact error conditions
2. **Log** - Gather all relevant logs, stack traces, system state
3. **Analyze** - Root cause analysis using debugging patterns
4. **Fix** - Minimal change to resolve
5. **Verify** - Confirm fix works and doesn't break other things

## Common Debugging Patterns
- Check recent changes (git diff)
- Examine error logs and stack traces
- Validate assumptions with print statements
- Isolate the failing component
- Check for null/undefined values
- Verify data types and formats

## Output Requirements
- Evidence before any fix proposal
- Root cause analysis with confidence
- Minimal fix with verification
- Update memory with common gotchas if discovered
    `.trim();
  }

  private buildReviewFixPrompt(userRequest: string, memory: any): string {
    return `
# Code Reviewer (Fix Validation)

## User Request
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Instructions
Review the bug fix from bug-investigator. Focus on:

- Fix correctness: Does it actually solve the problem?
- Side effects: Does it introduce new issues?
- Code quality: Is the fix clean and maintainable?
- Testing: Are there tests for the fix?
- Security: Does the fix introduce vulnerabilities?

## Confidence Scoring
Only report issues with ≥80% confidence.

## Output Requirements
- Verdict: APPROVED or CHANGES REQUESTED
- Critical Issues with file:line citations
- Include "### Memory Notes" section
    `.trim();
  }

  private buildReviewPrompt(userRequest: string, memory: any): string {
    return `
# Code Reviewer (Comprehensive Review)

## User Request
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Instructions
Perform comprehensive code review with 80%+ confidence threshold.

### Review Dimensions
- **Security**: OWASP top 10, input validation, authentication/authorization
- **Performance**: Algorithm efficiency, database queries, memory usage
- **Maintainability**: Code structure, naming, documentation
- **Reliability**: Error handling, edge cases, resource management
- **Testing**: Test coverage, test quality, edge case coverage

## Output Requirements
- Only report issues with ≥80% confidence
- File:line citations for every finding
- Verdict: APPROVED or CHANGES REQUESTED
- Include "### Memory Notes" section
    `.trim();
  }

  private buildPlanPrompt(userRequest: string, memory: any): string {
    return `
# Planner (Comprehensive Planning)

## User Request
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Planning Requirements
Create a comprehensive plan that includes:

### 1. Analysis
- Current state assessment
- Requirements clarification
- Constraints and dependencies
- Risk assessment

### 2. Architecture
- System design decisions
- Technology choices with rationale
- API design (if applicable)
- Data model (if applicable)

### 3. Implementation Plan
- Phased approach with milestones
- Specific files to create/modify
- Testing strategy
- Rollback plan

### 4. Research Needs
- External packages to investigate
- Best practices to research
- Alternatives to evaluate

## Output Requirements
- Save plan to docs/plans/YYYY-MM-DD-<topic>-plan.md
- Update activeContext.md with plan reference
- Include research phase if needed (github-research skill)
- Provide clear next steps
    `.trim();
  }

  private formatMemoryContext(memory: any): string {
    if (!memory) return 'No memory available';
    
    const parts: string[] = [];
    
    if (memory.activeContext) {
      const focusMatch = memory.activeContext.match(/## Current Focus\n([\s\S]*?)(?=\n##|\n$)/);
      if (focusMatch) {
        parts.push(`Current Focus: ${focusMatch[1].trim()}`);
      }
    }
    
    if (memory.patterns) {
      const gotchasMatch = memory.patterns.match(/## Common Gotchas\n([\s\S]*?)(?=\n##|\n$)/);
      if (gotchasMatch) {
        parts.push(`Common Gotchas: ${gotchasMatch[1].trim().substring(0, 200)}...`);
      }
    }
    
    if (memory.progress) {
      const completedMatch = memory.progress.match(/## Completed\n([\s\S]*?)(?=\n##|\n$)/);
      if (completedMatch) {
        parts.push(`Recent Completions: ${completedMatch[1].trim().substring(0, 200)}...`);
      }
    }
    
    return parts.length > 0 ? parts.join('\n') : 'Memory files empty or not loaded';
  }

  private async handleWorkflowFailure(
    input: any, 
    workflowTaskId: string, 
    error: any
  ): Promise<void> {
    console.error(`Workflow ${workflowTaskId} failed:`, error);
    
    // Update memory with failure
    await memoryManager.updateActiveContext(input, {
      recentChanges: [`Workflow ${workflowTaskId} failed: ${error.message}`],
      nextSteps: [`Investigate workflow failure: ${error.message}`]
    });

    // Could create TODO task for remediation
    // This would use OpenCode's task system
  }
}

export const workflowExecutor = new WorkflowExecutor();
