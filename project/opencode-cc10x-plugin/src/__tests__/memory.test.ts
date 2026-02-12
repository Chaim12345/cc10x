import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MemoryManager } from '../memory';

// Mock PluginContext
const createMockContext = () => {
  const files: Record<string, string> = {
    '.opencode/cc10x/activeContext.md': `# Active Context
## Current Focus
- Test focus

## Recent Changes
- Initial setup

## Next Steps
- Test next steps

## Decisions
- Test decision

## Learnings
- Test learning

## References
- Plan: N/A

## Blockers
- None

## Last Updated
2024-01-01T00:00:00.000Z`,
    '.opencode/cc10x/patterns.md': `# Project Patterns
## Common Gotchas
- Test gotcha

## Code Conventions
- Test convention

## Architecture Decisions
- Test decision

## Last Updated
2024-01-01T00:00:00.000Z`,
    '.opencode/cc10x/progress.md': `# Progress Tracking
## Current Workflow
- Test workflow

## Tasks
- [ ] Test task

## Completed
- [ ] Test completion

## Verification
- Test verification

## Last Updated
2024-01-01T00:00:00.000Z`
  };

  const calls = {
    writes: [] as Array<{ path: string; content: string }>,
    edits: [] as Array<{ path: string; oldString: string; newString: string }>,
    bash: [] as Array<{ command: string; args: string[] }>,
  };

  return {
    calls,
  readFile: async (path: string): Promise<string> => {
    if (files[path]) {
      return files[path];
    }
    throw new Error(`File not found: ${path}`);
  },
  writeFile: async (path: string, content: string): Promise<void> => {
    files[path] = content;
    calls.writes.push({ path, content });
  },
  editFile: async (path: string, options: { oldString: string; newString: string }): Promise<void> => {
    files[path] = options.newString;
    calls.edits.push({ path, oldString: options.oldString, newString: options.newString });
  },
  bash: async (command: string, args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
    calls.bash.push({ command, args });
    if (command === 'mkdir' && args.includes('-p') && args.some(arg => arg.includes('/cc10x'))) {
      return { exitCode: 0, stdout: '', stderr: '' };
    }
    return { exitCode: 1, stdout: '', stderr: 'Command not found' };
  },
  $: async (strings: TemplateStringsArray, ...values: any[]) => {
    const command = strings.reduce((acc, part, idx) => acc + part + (values[idx] ?? ''), '');
    calls.bash.push({ command: '$', args: [command] });
    return {
      exitCode: 0,
      stdout: Buffer.from(''),
      stderr: Buffer.from('')
    };
  }
};
};

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let mockCtx: any;

  beforeEach(() => {
    process.env.CC10X_MEMORY_DIR = '.opencode/cc10x';
    memoryManager = new MemoryManager();
    mockCtx = createMockContext();
  });

  afterEach(() => {
    delete process.env.CC10X_MEMORY_DIR;
    memoryManager.clearCache();
  });

  describe('initialize', () => {
    it('should initialize without errors', async () => {
      await expect(memoryManager.initialize(mockCtx)).resolves.toBe(undefined);
    });
  });

  describe('load', () => {
    it('should load all memory files', async () => {
      const memory = await memoryManager.load(mockCtx);
      
      expect(memory.activeContext).toBeDefined();
      expect(memory.patterns).toBeDefined();
      expect(memory.progress).toBeDefined();
    });

    it('should auto-heal missing sections', async () => {
      // Create a memory file with missing sections
      const brokenMemory = `# Active Context
## Current Focus
- Test focus
## Last Updated
2024-01-01T00:00:00.000Z`;
      
      mockCtx.readFile = async (path: string): Promise<string> => {
        if (path === '.opencode/cc10x/activeContext.md') {
          return brokenMemory;
        }
        throw new Error('File not found');
      };

      const memory = await memoryManager.load(mockCtx);
      
      // Should have added missing sections
      expect(memory.activeContext).toContain('## References');
      expect(memory.activeContext).toContain('## Decisions');
      expect(memory.activeContext).toContain('## Learnings');
    });

    it('should handle missing files gracefully', async () => {
      mockCtx.readFile = async (path: string): Promise<string> => {
        throw new Error('File not found');
      };

      const memory = await memoryManager.load(mockCtx);
      
      // Should create default content (auto-healed)
      expect(memory.activeContext).toContain('## Current Focus');
      expect(memory.activeContext).toContain('## Recent Changes');
      expect(memory.patterns).toContain('# Project Patterns');
      expect(memory.progress).toContain('# Progress Tracking');
    });

    it('should cache memory after first load', async () => {
      const memory1 = await memoryManager.load(mockCtx);
      const memory2 = await memoryManager.load(mockCtx);
      
      // Should return same cached instance (same reference)
      expect(memory1).toBe(memory2);
    });
  });

  describe('updateActiveContext', () => {
    it('should append to Recent Changes section', async () => {
      await memoryManager.initialize(mockCtx);
      await memoryManager.updateActiveContext(mockCtx, {
        recentChanges: ['Test change added']
      });

      const latestEdit = mockCtx.calls.edits[mockCtx.calls.edits.length - 1];
      expect(latestEdit.path).toBe('.opencode/cc10x/activeContext.md');
      expect(latestEdit.newString).toContain('Test change added');
    });

    it('should append to Decisions section', async () => {
      await memoryManager.initialize(mockCtx);
      await memoryManager.updateActiveContext(mockCtx, {
        decisions: ['Test decision made']
      });

      const latestEdit = mockCtx.calls.edits[mockCtx.calls.edits.length - 1];
      expect(latestEdit.path).toBe('.opencode/cc10x/activeContext.md');
      expect(latestEdit.newString).toContain('Test decision made');
    });

    it('should update Last Updated timestamp', async () => {
      await memoryManager.initialize(mockCtx);
      const beforeUpdate = new Date();
      
      await memoryManager.updateActiveContext(mockCtx, {
        recentChanges: ['Timestamp test']
      });

      const latestEdit = mockCtx.calls.edits[mockCtx.calls.edits.length - 1];
      expect(latestEdit.newString).toContain('## Last Updated');
      expect(latestEdit.newString).toMatch(/## Last Updated\n\d{4}-\d{2}-\d{2}T/);
      expect(new Date(latestEdit.newString.split('## Last Updated\n')[1].split('\n')[0]).getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('updateProgress', () => {
    it('should update current workflow', async () => {
      await memoryManager.initialize(mockCtx);
      await memoryManager.updateProgress(mockCtx, {
        currentWorkflow: 'Test workflow'
      });

      const latestEdit = mockCtx.calls.edits[mockCtx.calls.edits.length - 1];
      const occurrences = (latestEdit.newString.match(/Test workflow/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it('should append completed tasks', async () => {
      await memoryManager.initialize(mockCtx);
      await memoryManager.updateProgress(mockCtx, {
        completed: ['Test task completed']
      });

      const latestEdit = mockCtx.calls.edits[mockCtx.calls.edits.length - 1];
      expect(latestEdit.newString).toContain('Test task completed');
    });

    it('should add verification evidence', async () => {
      await memoryManager.initialize(mockCtx);
      await memoryManager.updateProgress(mockCtx, {
        verification: ['npm test → exit 0 (10/10)']
      });

      const latestEdit = mockCtx.calls.edits[mockCtx.calls.edits.length - 1];
      expect(latestEdit.newString).toContain('npm test → exit 0 (10/10)');
    });
  });

  describe('updatePatterns', () => {
    it('should add common gotchas', async () => {
      await memoryManager.initialize(mockCtx);
      await memoryManager.updatePatterns(mockCtx, {
        commonGotchas: ['Test gotcha discovered']
      });

      const latestEdit = mockCtx.calls.edits[mockCtx.calls.edits.length - 1];
      expect(latestEdit.path).toBe('.opencode/cc10x/patterns.md');
      expect(latestEdit.newString).toContain('Test gotcha discovered');
    });

    it('should add code conventions', async () => {
      await memoryManager.initialize(mockCtx);
      await memoryManager.updatePatterns(mockCtx, {
        codeConventions: ['Use TypeScript for all new code']
      });

      const latestEdit = mockCtx.calls.edits[mockCtx.calls.edits.length - 1];
      expect(latestEdit.newString).toContain('Use TypeScript for all new code');
    });
  });

  describe('accumulateNotes and persistAccumulatedNotes', () => {
    it('should accumulate notes and categorize them', async () => {
      await memoryManager.initialize(mockCtx);
      
      memoryManager.accumulateNotes(mockCtx, [
        'Learning: TDD improves code quality',
        'Pattern: Always check for null values',
        'Verification: npm test → exit 0'
      ]);

      expect((memoryManager as any).pendingNotes.length).toBe(3);
    });

    it('should persist accumulated notes to appropriate files', async () => {
      await memoryManager.initialize(mockCtx);
      
      memoryManager.accumulateNotes(mockCtx, [
        'Learning: New debugging technique discovered',
        'Verification: All tests passed with exit code 0'
      ]);

      await memoryManager.persistAccumulatedNotes(mockCtx);

      expect((memoryManager as any).pendingNotes.length).toBe(0);
      expect(mockCtx.calls.edits.some((e: any) => e.path.includes('activeContext.md'))).toBe(true);
      expect(mockCtx.calls.edits.some((e: any) => e.path.includes('progress.md'))).toBe(true);
    });
  });

  describe('ensureDirectory', () => {
    it('should create memory directory without errors', async () => {
      await expect(memoryManager.ensureDirectory(mockCtx)).resolves.toBe(undefined);
      expect(mockCtx.calls.bash.some((x: any) => x.command === '$' && x.args[0].includes('mkdir -p .opencode/cc10x'))).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear memory cache', async () => {
      await memoryManager.initialize(mockCtx);
      await memoryManager.load(mockCtx);
      
      memoryManager.clearCache();
      
      // Next load should re-read from files
      const memory = await memoryManager.load(mockCtx);
      expect(memory).toBeDefined();
    });
  });
});
