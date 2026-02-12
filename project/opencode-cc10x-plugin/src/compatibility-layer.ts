import { getKnownMemoryDirs, isMemoryPath } from './memory-paths';

// Compatibility layer for cc10x helper I/O on OpenCode
// These wrap OpenCode's native tools with cc10x-expected interfaces

export async function readFile(input: any, path: string): Promise<string> {
  try {
    // Test/runtime compatibility: prefer direct mock methods when available.
    if (typeof input?.readFile === 'function') {
      return await input.readFile(path);
    }
    // Use OpenCode's read tool via client
    const result = await input.client?.app?.fs?.read(path);
    return result as string;
  } catch (error: any) {
    if (error.code === 'ENOENT' || error.message?.includes('not found')) {
      throw new Error(`File not found: ${path}`);
    }
    throw error;
  }
}

export async function writeFile(input: any, path: string, content: string): Promise<void> {
  try {
    if (typeof input?.writeFile === 'function') {
      await input.writeFile(path, content);
      return;
    }
    // Use OpenCode's write tool via client
    await input.client?.app?.fs?.write(path, content);
  } catch (error) {
    console.error(`Failed to write file ${path}:`, error);
    throw error;
  }
}

export async function editFile(input: any, path: string, options: {
  oldString: string;
  newString: string;
}): Promise<void> {
  try {
    if (typeof input?.editFile === 'function') {
      await input.editFile(path, options);
      return;
    }
    // Use OpenCode's edit tool via client
    await input.client?.app?.fs?.edit(path, options);
  } catch (error) {
    console.error(`Failed to edit file ${path}:`, error);
    throw error;
  }
}

export async function mkdir(input: any, ...args: string[]): Promise<void> {
  try {
    if (typeof input?.bash === 'function') {
      const dir = args[0] || args.join(' ');
      const result = await input.bash('mkdir', ['-p', dir]);
      if (result.exitCode !== 0) {
        throw new Error(`mkdir failed: ${result.stderr}`);
      }
      return;
    }
    // Use OpenCode's shell ($) for mkdir - execute as tagged template
    const $ = input.$;
    if (typeof $ === 'function') {
      const dir = args[0] || args.join(' ');
      // Bun shell expects tagged template syntax: $`mkdir -p dir`
      const result = await $`mkdir -p ${dir}`;
      // result is BunShellPromise with exitCode, stdout, stderr
      if (result.exitCode !== 0) {
        throw new Error(`mkdir failed: ${result.stderr.toString()}`);
      }
    } else {
      throw new Error('Shell not available');
    }
  } catch (error) {
    console.error(`Failed to create directory:`, error);
    throw error;
  }
}

// Wrapper for bash commands with proper permission handling
export async function bash(input: any, command: string, args: string[] = []): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  try {
    if (typeof input?.bash === 'function') {
      return await input.bash(command, args);
    }
    const $ = input.$;
    if (typeof $ !== 'function') {
      throw new Error('Shell not available');
    }
    // Build command string for tagged template
    const fullCommand = [command, ...args].join(' ');
    const result = await $`${fullCommand}`;
    // BunShellPromise has exitCode, stdout, stderr as Buffer
    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString()
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
  const memoryDirs = getKnownMemoryDirs();
  
  if (tool === 'read' && args?.filePath) {
    return isMemoryPath(args.filePath);
  }
  
  if (tool === 'edit' && args?.filePath) {
    return isMemoryPath(args.filePath);
  }
  
  if (tool === 'write' && args?.filePath) {
    // Write is permission-free for any file in a memory directory (for new files).
    const filePath = String(args.filePath).replace(/\\/g, '/');
    return memoryDirs.some((dir) => filePath.includes(`${dir}/`) || filePath === dir);
  }
  
  if (tool === 'bash' && args?.command) {
    const command = args.command;
    // mkdir for memory directory is permission-free
    if (command === 'mkdir' && args.args?.includes('-p') && 
        args.args?.some((arg: string) => {
          const normalizedArg = String(arg).replace(/\\/g, '/');
          return memoryDirs.some((dir) => normalizedArg.includes(dir));
        })) {
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
    /__mocks__\//,
    /(^|\/|[-_])test($|[\W_])/i,  // test at start, after dash/underscore, or as directory
    /(^|\/|[-_])spec($|[\W_])/i,  // spec at start, after dash/underscore, or as directory
    /\.test\.js$/i,
    /\.spec\.js$/i,
    /test\.py$/i,
    /test\.go$/i,
    /test\.rs$/i,
    /test\.java$/i,
    /test\.ts$/i,
    /test\.tsx$/i
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
