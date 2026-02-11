import type { Plugin } from '@opencode-ai/plugin';
import { cc10xRouter } from './router';

export const OpenCodeCC10xPlugin: Plugin = async (input) => {
  console.log('🔌 OpenCode cc10x Plugin v6.0.19 initializing...');

  const { $ } = input;
  
  // Set up the router hook with shell access
  const routerHook = await cc10xRouter({ ...input, $ });

  return {
    name: 'opencode-cc10x',
    description: 'Intelligent orchestration system for OpenCode - port of cc10x from Claude Code',
    version: '6.0.19',
    hooks: {
      // Router hook that intercepts user requests and orchestrates workflows
      'message.received': routerHook.messageReceived,
      
      // Session management hooks
      'session.created': routerHook.sessionCreated,
      'session.compacted': routerHook.sessionCompacted,
      
      // Tool execution hooks for TDD enforcement
      'tool.execute.before': routerHook.toolExecuteBefore,
      'tool.execute.after': routerHook.toolExecuteAfter,
      
      // Agent lifecycle hooks
      'agent.started': routerHook.agentStarted,
      'agent.completed': routerHook.agentCompleted,
    },
    // Provide the cc10x router as a tool
    tools: {
      'cc10x-router': {
        description: 'Main cc10x orchestration router - automatically invoked for development tasks',
        execute: async (args, context) => {
          return await routerHook.manualInvoke(args, context);
        }
      }
    },
    // Add command to appear in /commands menu
    commands: [
      {
        name: 'cc10x-orchestrate',
        description: 'Run cc10x intelligent orchestration for a development task',
        execute: async (args, context) => {
          const request = args.request || args.task || args.prompt || '';
          if (!request.trim()) {
            return 'Please provide a task description. Usage: /cc10x-orchestrate <task description>';
          }
          
          console.log(`🚀 cc10x orchestration triggered for: ${request}`);
          
          // Create a workflow task through the orchestrator
          const workflowTaskId = `cc10x-manual-${Date.now()}`;
          
          // Use the router's manual invoke to start orchestration
          await routerHook.manualInvoke({
            request,
            taskId: workflowTaskId,
            forceWorkflow: true
          }, context);
          
          return `✅ cc10x orchestration started for task: ${request}`;
        }
      }
    ]
  };
};

export default OpenCodeCC10xPlugin;