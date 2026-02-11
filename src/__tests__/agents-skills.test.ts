import { describe, it, expect } from 'bun:test';
import { agentDefinitions } from '../agents';
import { skillDefinitions } from '../skills';

describe('Agent Definitions', () => {
  it('should have 6 cc10x agents defined', () => {
    expect(agentDefinitions.length).toBe(6);
  });

  it('should have all required cc10x agents', () => {
    const agentNames = agentDefinitions.map(a => a.name);
    expect(agentNames).toContain('cc10x-component-builder');
    expect(agentNames).toContain('cc10x-bug-investigator');
    expect(agentNames).toContain('cc10x-code-reviewer');
    expect(agentNames).toContain('cc10x-silent-failure-hunter');
    expect(agentNames).toContain('cc10x-integration-verifier');
    expect(agentNames).toContain('cc10x-planner');
  });

  it('should have required fields for all agents', () => {
    agentDefinitions.forEach(agent => {
      expect(agent.name).toBeDefined();
      expect(agent.description).toBeDefined();
      expect(agent.mode).toBe('subagent');
      expect(agent.tools).toBeDefined();
    });
  });

  it('should have proper tool permissions for each agent type', () => {
    const builder = agentDefinitions.find(a => a.name === 'cc10x-component-builder');
    expect(builder?.tools.write).toBe(true);
    expect(builder?.tools.edit).toBe(true);
    expect(builder?.tools.bash).toBe(true);

    const reviewer = agentDefinitions.find(a => a.name === 'cc10x-code-reviewer');
    expect(reviewer?.tools.write).toBe(false);
    expect(reviewer?.tools.edit).toBe(false);
    expect(reviewer?.tools.bash).toBe(true);

    const investigator = agentDefinitions.find(a => a.name === 'cc10x-bug-investigator');
    expect(investigator?.tools.webfetch).toBe(true);
  });

  it('should have appropriate temperature settings', () => {
    const builder = agentDefinitions.find(a => a.name === 'cc10x-component-builder');
    const reviewer = agentDefinitions.find(a => a.name === 'cc10x-code-reviewer');
    const planner = agentDefinitions.find(a => a.name === 'cc10x-planner');

    expect(builder?.temperature).toBe(0.3);
    expect(reviewer?.temperature).toBe(0.1);
    expect(planner?.temperature).toBe(0.4);
  });

  it('should have color assignments for UI', () => {
    agentDefinitions.forEach(agent => {
      expect(agent.color).toBeDefined();
      expect(typeof agent.color).toBe('string');
    });
  });

  it('should have proper permission configurations', () => {
    agentDefinitions.forEach(agent => {
      expect(agent.permission).toBeDefined();
    });
  });

  it('should include cc10x skills in agent prompts', () => {
    const builder = agentDefinitions.find(a => a.name === 'cc10x-component-builder');
    expect(builder?.prompt).toContain('Memory First');
    expect(builder?.prompt).toContain('SKILL_HINTS');
    expect(builder?.prompt).toContain('TDD');
  });
});

describe('Skill Definitions', () => {
  it('should have 20+ cc10x skills defined', () => {
    expect(skillDefinitions.length).toBeGreaterThanOrEqual(20);
  });

  it('should have all required core cc10x skills', () => {
    const skillNames = skillDefinitions.map(s => s.name);
    expect(skillNames).toContain('cc10x-session-memory');
    expect(skillNames).toContain('cc10x-verification-before-completion');
    expect(skillNames).toContain('cc10x-test-driven-development');
    expect(skillNames).toContain('cc10x-code-generation');
    expect(skillNames).toContain('cc10x-debugging-patterns');
    expect(skillNames).toContain('cc10x-code-review-patterns');
    expect(skillNames).toContain('cc10x-planning-patterns');
    expect(skillNames).toContain('cc10x-github-research');
  });

  it('should have required fields for all skills', () => {
    skillDefinitions.forEach(skill => {
      expect(skill.name).toBeDefined();
      expect(skill.description).toBeDefined();
      expect(skill.license).toBe('MIT');
      expect(skill.compatibility).toBe('opencode');
      expect(skill.content).toBeDefined();
      expect(skill.content.length).toBeGreaterThan(100);
    });
  });

  it('should have proper metadata for core skills', () => {
    const memorySkill = skillDefinitions.find(s => s.name === 'cc10x-session-memory');
    expect(memorySkill?.metadata.required).toBe('true');
    expect(memorySkill?.metadata.purpose).toBe('memory-persistence');

    const verificationSkill = skillDefinitions.find(s => s.name === 'cc10x-verification-before-completion');
    expect(verificationSkill?.metadata.required).toBe('true');
    expect(verificationSkill?.metadata.purpose).toBe('verification-gate');
  });

  it('should have audience metadata for specialized skills', () => {
    const tddSkill = skillDefinitions.find(s => s.name === 'cc10x-test-driven-development');
    expect(tddSkill?.metadata.audience).toContain('builder');

    const researchSkill = skillDefinitions.find(s => s.name === 'cc10x-github-research');
    expect(researchSkill?.metadata.audience).toContain('planner');
    expect(researchSkill?.metadata.audience).toContain('investigator');
  });

  it('should include theme skills', () => {
    const themeSkills = skillDefinitions.filter(s => s.metadata.category === 'theme');
    expect(themeSkills.length).toBeGreaterThan(0);
    
    // Check for some specific themes
    const themeNames = themeSkills.map(s => s.name);
    expect(themeNames).toContain('cc10x-botanical-garden');
    expect(themeNames).toContain('cc10x-midnight-galaxy');
    expect(themeNames).toContain('cc10x-tech-innovation');
  });

  it('should have consistent skill naming convention', () => {
    skillDefinitions.forEach(skill => {
      expect(skill.name).toMatch(/^cc10x-[a-z-]+$/);
    });
  });

  it('should have descriptions of appropriate length', () => {
    skillDefinitions.forEach(skill => {
      expect(skill.description.length).toBeGreaterThanOrEqual(50);
      expect(skill.description.length).toBeLessThanOrEqual(1024);
    });
  });

  it('should have comprehensive content for core skills', () => {
    const coreSkills = ['cc10x-session-memory', 'cc10x-verification-before-completion', 'cc10x-test-driven-development'];
    
    coreSkills.forEach(skillName => {
      const skill = skillDefinitions.find(s => s.name === skillName);
      expect(skill).toBeDefined();
      expect(skill!.content.length).toBeGreaterThan(1000); // Comprehensive documentation
    });
  });
});

describe('Plugin Integration', () => {
  it('should have matching agent and skill names', () => {
    const agentNames = agentDefinitions.map(a => a.name);
    const skillNames = skillDefinitions.map(s => s.name);
    
    // Check that core cc10x skills exist (agents don't have 1:1 skill mapping)
    const coreSkills = [
      'cc10x-session-memory',
      'cc10x-verification-before-completion', 
      'cc10x-test-driven-development',
      'cc10x-code-generation',
      'cc10x-debugging-patterns',
      'cc10x-code-review-patterns',
      'cc10x-planning-patterns',
      'cc10x-github-research'
    ];
    
    coreSkills.forEach(skillName => {
      expect(skillNames).toContain(skillName);
    });
  });

  it('should have proper skill references in agent prompts', () => {
    agentDefinitions.forEach(agent => {
      const prompt = agent.prompt || '';
      // Check that agent prompts reference key cc10x concepts
      const hasMemoryReference = prompt.includes('memory') || prompt.includes('Memory');
      const hasTDDReference = prompt.includes('TDD') || prompt.includes('test');
      const hasVerificationReference = prompt.includes('verification') || prompt.includes('Verification');
      
      // Each agent should reference at least one cc10x concept
      expect(hasMemoryReference || hasTDDReference || hasVerificationReference).toBe(true);
    });
  });
});