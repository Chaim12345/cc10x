import { describe, it, expect } from 'bun:test';
import { 
  isPermissionFreeOperation, 
  isTestCommand, 
  isTestFile,
  extractExitCode 
} from '../compatibility-layer';

describe('Compatibility Layer', () => {
  describe('isPermissionFreeOperation', () => {
    it('should identify memory file reads as permission-free', () => {
      expect(isPermissionFreeOperation('read', { filePath: '.claude/cc10x/activeContext.md' })).toBe(true);
      expect(isPermissionFreeOperation('read', { filePath: '.claude/cc10x/patterns.md' })).toBe(true);
      expect(isPermissionFreeOperation('read', { filePath: '.claude/cc10x/progress.md' })).toBe(true);
    });

    it('should identify memory file writes as permission-free for new files', () => {
      // Write to memory directory should be permission-free (for new files)
      expect(isPermissionFreeOperation('write', { filePath: '.claude/cc10x/newfile.md' })).toBe(true);
    });

    it('should identify memory file edits as permission-free', () => {
      expect(isPermissionFreeOperation('edit', { filePath: '.claude/cc10x/activeContext.md' })).toBe(true);
    });

    it('should identify mkdir for memory directory as permission-free', () => {
      expect(isPermissionFreeOperation('bash', { 
        command: 'mkdir', 
        args: ['-p', '.claude/cc10x'] 
      })).toBe(true);
    });

    it('should return false for non-memory operations', () => {
      expect(isPermissionFreeOperation('read', { filePath: 'src/index.ts' })).toBe(false);
      expect(isPermissionFreeOperation('bash', { command: 'rm', args: ['-rf', 'node_modules'] })).toBe(false);
    });
  });

  describe('isTestCommand', () => {
    it('should identify npm test commands', () => {
      expect(isTestCommand('npm test')).toBe(true);
      expect(isTestCommand('npm test -- --watch')).toBe(true);
    });

    it('should identify yarn test commands', () => {
      expect(isTestCommand('yarn test')).toBe(true);
      expect(isTestCommand('yarn test:unit')).toBe(true);
    });

    it('should identify bun test commands', () => {
      expect(isTestCommand('bun test')).toBe(true);
      expect(isTestCommand('bun test --coverage')).toBe(true);
    });

    it('should identify pytest commands', () => {
      expect(isTestCommand('pytest')).toBe(true);
      expect(isTestCommand('python -m pytest')).toBe(true);
    });

    it('should identify test file patterns', () => {
      expect(isTestCommand('jest')).toBe(true);
      expect(isTestCommand('mocha')).toBe(true);
      expect(isTestCommand('tox')).toBe(true);
    });

    it('should return false for non-test commands', () => {
      expect(isTestCommand('npm start')).toBe(false);
      expect(isTestCommand('node index.js')).toBe(false);
      expect(isTestCommand('git status')).toBe(false);
    });

    it('should handle undefined command', () => {
      expect(isTestCommand(undefined)).toBe(false);
    });
  });

  describe('isTestFile', () => {
    it('should identify test files with .test extension', () => {
      expect(isTestFile('src/components/Button.test.tsx')).toBe(true);
      expect(isTestFile('src/utils/helpers.test.js')).toBe(true);
    });

    it('should identify test files with .spec extension', () => {
      expect(isTestFile('src/services/api.spec.ts')).toBe(true);
      expect(isTestFile('test/unit/models.spec.js')).toBe(true);
    });

    it('should identify files in __tests__ directories', () => {
      expect(isTestFile('src/__tests__/component.test.tsx')).toBe(true);
      expect(isTestFile('__tests__/integration.test.js')).toBe(true);
    });

    it('should identify files with test in name', () => {
      expect(isTestFile('test-file.js')).toBe(true);
      expect(isTestFile('my_test_file.py')).toBe(true);
    });

    it('should return false for non-test files', () => {
      expect(isTestFile('src/components/Button.tsx')).toBe(false);
      expect(isTestFile('src/index.js')).toBe(false);
      expect(isTestFile('README.md')).toBe(false);
    });
  });

  describe('extractExitCode', () => {
    it('should extract exitCode from result object', () => {
      expect(extractExitCode({ exitCode: 0 })).toBe(0);
      expect(extractExitCode({ exitCode: 1 })).toBe(1);
    });

    it('should fallback to code property', () => {
      expect(extractExitCode({ code: 0 })).toBe(0);
      expect(extractExitCode({ code: 1 })).toBe(1);
    });

    it('should return 0 for empty result', () => {
      expect(extractExitCode({})).toBe(0);
      expect(extractExitCode(null)).toBe(0);
      expect(extractExitCode(undefined)).toBe(0);
    });
  });
});