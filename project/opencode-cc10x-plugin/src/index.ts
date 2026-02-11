import type { Plugin } from '@opencode-ai/plugin';
import { cc10xRouter } from './router';
import { agentDefinitions } from './agents';
import { skillDefinitions } from './skills';

export const OpenCodeCC10xPlugin: Plugin = async (ctx) => {
  console.log('🔌 OpenCode cc10x Plugin v6.0.18 initializing...');

  // Register all cc10x agents
  for (const agent of agentDefinitions) {
    ctx.registerAgent?.(agent);
  }

  // Register all cc10x skills
  for (const skill of skillDefinitions) {
    ctx.registerSkill?.(skill);
  }

  // Set up the router hook
  const routerHook = await cc10xRouter(ctx);

  return {
    name: 'opencode-cc10x',
    description: 'Intelligent orchestration system for OpenCode - port of cc10x from Claude Code',
    version: '6.0.18',
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
    }
  };
};

export default OpenCodeCC10xPlugin;