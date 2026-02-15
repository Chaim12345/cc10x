import { describe, expect, it } from 'bun:test';
import { normalizeToolName } from '../runtime-compat';

describe('runtime-compat', () => {
  describe('normalizeToolName', () => {
    it('normalizes known aliases', () => {
      expect(normalizeToolName('Execute')).toBe('bash');
      expect(normalizeToolName('create')).toBe('write');
      expect(normalizeToolName('BASH')).toBe('bash');
    });

    it('returns unknown tools unchanged', () => {
      expect(normalizeToolName('custom_tool')).toBe('custom_tool');
    });

    it('handles empty inputs safely', () => {
      expect(normalizeToolName('')).toBe('');
      expect(normalizeToolName(undefined)).toBe('');
    });
  });
});
