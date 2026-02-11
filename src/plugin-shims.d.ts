// Shim declarations for missing OpenCode plugin types
// This file provides the types that cc10x expects but are not in the current @opencode-ai/plugin

import type { PluginInput } from '@opencode-ai/plugin';

// Declare module augmentation to add missing types
declare module '@opencode-ai/plugin' {
  // Plugin context (what cc10x calls PluginContext)
  export interface PluginContext extends PluginInput {
    sessionID: string;
    agent: string;
    taskId?: string;
    client: any;
    project: any;
    directory: string;
    worktree: string;
    $: any; // BunShell
  }

  // Tool input/output (what cc10x expects)
  export interface ToolInput {
    tool: string;
    sessionID: string;
    callID: string;
    args?: any;
    agentName?: string;
    agent?: string;
    taskId?: string;
    result?: any;
    output?: any;
  }

  export interface ToolOutput {
    exitCode?: number;
    title?: string;
    output?: string;
    metadata?: any;
  }

  // Agent and skill definitions
  export interface AgentDefinition {
    name: string;
    description: string;
    model: string;
    context: 'fork' | 'continue';
    tools: string[];
    skills: string[];
  }

  export interface SkillDefinition {
    name: string;
    description: string;
    tools: string[];
    execution: 'auto' | 'manual';
  }

  // Workflow and task types
  export interface WorkflowState {
    id: string;
    intent: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    tasks: TaskState[];
    memory: any;
    createdAt: string;
    updatedAt: string;
  }

  export interface TaskState {
    id: string;
    subject: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    assignee?: string;
    result?: any;
    confidence?: number;
    blockers?: string[];
    createdAt: string;
    updatedAt: string;
  }

  export interface WorkflowOptions {
    userRequest: string;
    intent: IntentDetectionResult;
    memory: any;
    workflowTaskId?: string;
    activeForm?: string;
  }

  export interface IntentDetectionResult {
    intent: 'BUILD' | 'DEBUG' | 'REVIEW' | 'PLAN';
    confidence: number;
    keywords?: string[];
  }

  export type WorkflowType = 'BUILD' | 'DEBUG' | 'REVIEW' | 'PLAN';

  // Extend Hooks interface with the old hook names for compatibility
  export interface Hooks {
    'message.received'?: (input: ToolInput, output: ToolOutput) => Promise<void>;
    'session.created'?: (input: any, output: any) => Promise<void>;
    'session.compacted'?: (input: any, output: any) => Promise<void>;
    'agent.started'?: (input: any, output: any) => Promise<void>;
    'agent.completed'?: (input: any, output: any) => Promise<void>;
  }
}

// Export types for use in other files
export type { PluginContext, ToolInput, ToolOutput, AgentDefinition, SkillDefinition, WorkflowState, TaskState, WorkflowOptions, IntentDetectionResult, WorkflowType };