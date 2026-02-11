import { describe, it, expect } from 'bun:test';
import { detectIntent } from '../intent-detection';

describe('Intent Detection', () => {
  describe('detectIntent', () => {
    it('should detect BUILD intent for build-related keywords', () => {
      const result = detectIntent('build a user authentication system');
      expect(result.intent).toBe('BUILD');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('build');
    });

    it('should detect DEBUG intent for error-related keywords', () => {
      const result = detectIntent('debug the payment processing error');
      expect(result.intent).toBe('DEBUG');
      expect(result.keywords).toContain('debug');
    });

    it('should detect REVIEW intent for review-related keywords', () => {
      const result = detectIntent('review this code for best practices');
      expect(result.intent).toBe('REVIEW');
      expect(result.keywords).toContain('review');
    });

    it('should detect PLAN intent for planning-related keywords', () => {
      const result = detectIntent('plan the database schema architecture');
      expect(result.intent).toBe('PLAN');
      expect(result.keywords).toContain('plan');
    });

    it('should prioritize DEBUG over other intents', () => {
      const result = detectIntent('build and debug the authentication system');
      expect(result.intent).toBe('DEBUG'); // DEBUG has priority
    });

    it('should handle ambiguous cases with default BUILD', () => {
      const result = detectIntent('create a new feature');
      expect(result.intent).toBe('BUILD'); // Default for development tasks
    });

    it('should include reasoning in result', () => {
      const result = detectIntent('implement a new API endpoint');
      expect(result.reasoning).toBeDefined();
      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should return confidence between 0 and 100', () => {
      const result = detectIntent('fix the bug in the login system');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should handle memory context for intent refinement', () => {
      const memory = {
        activeContext: '## Current Focus\nDebugging authentication issues',
        patterns: '',
        progress: ''
      };
      const result = detectIntent('check the logs', memory);
      // Memory context suggesting DEBUG should influence the result
      expect(result.intent).toBe('DEBUG');
    });

    it('should handle empty or null memory gracefully', () => {
      const result = detectIntent('build something', null);
      expect(result.intent).toBe('BUILD');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect multiple keywords and score accordingly', () => {
      const result = detectIntent('create and implement a new feature with tests');
      expect(result.intent).toBe('BUILD');
      expect(result.keywords.length).toBeGreaterThan(1);
    });

    it('should handle case-insensitive keyword matching', () => {
      const result = detectIntent('BUILD A NEW APPLICATION');
      expect(result.intent).toBe('BUILD');
      expect(result.keywords).toContain('build');
    });
  });
});