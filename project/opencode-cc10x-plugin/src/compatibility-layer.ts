import type { PluginContext } from '@opencode-ai/plugin';

// Compatibility layer to provide file operation methods similar to Claude Code
// These wrap OpenCode's native tools with cc10x-expected interfaces

export async function readFile(ctx: PluginContext, path: string): Promise<string> {
  try {
    // Use OpenCode's read tool
    const result = await ctx.readFile(path);
    return result as string;
  } catch (error: any) {
    if (error.code === 'ENOENT' || error.message?.includes('not found')) {
      throw new Error(`File not found: ${path}`);
    }
    throw error;
  }
}

export async function writeFile(ctx: PluginContext, path: string, content: string): Promise<void> {
  try {
    // Use OpenCode's write tool
    await ctx.writeFile(path, content);
  } catch (error) {
    console.error(`Failed to write file ${path}:`, error);
    throw error;
  }
}

export async function editFile(ctx: PluginContext, path: string, options: {
  oldString: string;
  newString: string;
}): Promise<void> {
  try {
    // Use OpenCode's edit tool
    await ctx.editFile(path, options);
  } catch (error) {
    console.error(`Failed to edit file ${path}:`, error);
    throw error;
  }
}

export async function mkdir(ctx: PluginContext, ...args: string[]): Promise<void> {
  try {
    // Use OpenCode's bash tool for mkdir
    await ctx.bash('mkdir', args);
  } catch (error) {
    console.error(`Failed to create directory:`, error);
    throw error;
  }
}

// Wrapper for bash commands with proper permission handling
export async function bash(ctx: PluginContext, command: string, args: string[] = []): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  try {
    const result = await ctx.bash(command, args);
    return {
      exitCode: result.exitCode || 0,
      stdout: result.stdout || '',
      stderr: result.stderr || ''
    };
  } catch (error: any) {
    return {
      exitCode: error.exitCode || 1,
      stdout: '',
      stderr: error.message || String(error)
    };
  }
}

// Permission checking utilities
export function isPermissionFreeOperation(tool: string, args: any): boolean {
  // Memory operations are permission-free in cc10x
  const memoryPaths = [
    '.claude/cc10x/activeContext.md',
    '.claude/cc10x/patterns.md',
    '.claude/cc10x/progress.md'
  ];
  
  if (tool === 'read' && args?.filePath) {
    return memoryPaths.some(path => args.filePath.includes(path));
  }
  
  if ((tool === 'write' || tool === 'edit') && args?.filePath) {
    return memoryPaths.some(path => args.filePath.includes(path));
  }
  
  if (tool === 'bash' && args?.command) {
    const command = args.command;
    // mkdir for memory directory is permission-free
    if (command === 'mkdir' && args.args?.includes('-p') && 
        args.args?.some((arg: string) => arg.includes('.claude/cc10x'))) {
      return true;
    }
  }
  
  return false;
}

// TDD enforcement utilities
export function validateTDDPhase(phase: 'RED' | 'GREEN' | 'REFACTOR', context: any): boolean {
  // This would validate TDD cycle compliance
  // For now, return true - full implementation would track state
  return true;
}

export function extractExitCode(result: any): number {
  return result?.exitCode ?? result?.code ?? 0;
}

export function isTestFile(filePath: string): boolean {
  const testPatterns = [
    /\.test\./i,
    /\.spec\./i,
    /__tests__\//,
    /test\./i,
    /spec\./i
  ];
  return testPatterns.some(pattern => pattern.test(filePath));
}

export function isTestCommand(command?: string): boolean {
  if (!command) return false;
  const testPatterns = [
    /test/i, /spec/i, /\.test\./, /\.spec\./, 
    /jest/i, /mocha/i, /pytest/i, /tox/i,
    /npm test/i, /yarn test/i, /bun test/i
  ];
  return testPatterns.some(pattern => pattern.test(command));
}