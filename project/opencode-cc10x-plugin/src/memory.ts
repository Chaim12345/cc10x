import { readFile, writeFile, editFile } from './compatibility-layer';
import { buildMemoryFiles, getKnownMemoryDirs, getPreferredMemoryDir } from './memory-paths';

export interface CC10XMemory {
  activeContext: string;
  patterns: string;
  progress: string;
  lastUpdated: string;
}

const DEFAULT_ACTIVE_CONTEXT = `# Active Context

<!-- CC10X: Do not rename headings. Used as Edit anchors. -->

## Current Focus
- [None yet - first workflow]

## Recent Changes
- [Initial cc10x setup]

## Next Steps
- [Awaiting first task]

## Decisions
- [No decisions recorded yet]

## Learnings
- [No learnings yet]

## References
- Plan: N/A
- Design: N/A
- Research: N/A

## Blockers
- [None]

## Last Updated
${new Date().toISOString()}
`;

const DEFAULT_PATTERNS = `# Project Patterns

<!-- CC10X: Do not rename headings. Used as Edit anchors. -->

## Common Gotchas
- [List project-specific issues and solutions here]

## Code Conventions
- [Document coding patterns and standards]

## Architecture Decisions
- [Record important architectural choices]

## Last Updated
${new Date().toISOString()}
`;

const DEFAULT_PROGRESS = `# Progress Tracking

<!-- CC10X: Do not rename headings. Used as Edit anchors. -->

## Current Workflow
- [None active]

## Tasks
- [ ] [No tasks yet]

## Completed
- [ ] [No completions yet]

## Verification
- [None yet]

## Last Updated
${new Date().toISOString()}
`;

export class MemoryManager {
  private ctx: any | null = null;
  private memoryCache: CC10XMemory | null = null;
  private pendingNotes: string[] = [];
  private memoryDir = getPreferredMemoryDir();

  private get memoryFiles() {
    return buildMemoryFiles(this.memoryDir);
  }

  async initialize(input: any): Promise<void> {
    this.ctx = input;
    this.memoryDir = getPreferredMemoryDir();
    await this.ensureDirectory(input);
  }

  async ensureDirectory(input: any): Promise<void> {
    try {
      // Use OpenCode's shell to create directory (permission-free)
      const $ = input.$;
      if (typeof $ !== 'function') {
        throw new Error('Shell not available');
      }
      const result = await $`mkdir -p ${this.memoryDir}`;
      if (result.exitCode !== 0) {
        throw new Error(`mkdir failed: ${result.stderr.toString()}`);
      }
    } catch (error) {
      console.warn('Could not create memory directory:', error);
      // Don't throw - directory might already exist
    }
  }

  async load(input: any): Promise<CC10XMemory> {
    if (this.memoryCache) {
      return this.memoryCache;
    }

    let memory: CC10XMemory = {
      activeContext: '',
      patterns: '',
      progress: '',
      lastUpdated: new Date().toISOString()
    };

    try {
      const preferredFiles = this.memoryFiles;
      const fallbackFiles = getKnownMemoryDirs().map((dir) => buildMemoryFiles(dir));

      // Try to read each memory file from preferred location, then fall back to legacy path.
      for (const [key, preferredPath] of Object.entries(preferredFiles)) {
        try {
          const content = await readFile(input, preferredPath);
          memory[key as keyof CC10XMemory] = content;
          continue;
        } catch {}

        let loaded = false;
        for (const files of fallbackFiles) {
          const candidate = files[key as keyof typeof files] as string;
          if (candidate === preferredPath) continue;
          try {
            const content = await readFile(input, candidate);
            memory[key as keyof CC10XMemory] = content;
            loaded = true;
            break;
          } catch {}
        }

        if (!loaded) {
          console.log(`Memory file ${preferredPath} not found, will create template`);
        }
      }
    } catch (error) {
      console.warn('Error loading memory:', error);
    }

    // Ensure required sections exist (auto-heal)
    memory = this.autoHealMemory(memory);
    this.memoryCache = memory;
    return memory; // Return cached reference
  }

  private autoHealMemory(memory: CC10XMemory): CC10XMemory {
    // Ensure required sections exist in each file
    const ensureSection = (content: string, sections: string[]): string => {
      for (const section of sections) {
        if (!content.includes(section)) {
          // Insert section before Last Updated
          const lastUpdatedIndex = content.lastIndexOf('## Last Updated');
          if (lastUpdatedIndex !== -1) {
            content = content.slice(0, lastUpdatedIndex) + 
                     `## ${section}\n- [N/A]\n\n` + 
                     content.slice(lastUpdatedIndex);
          } else {
            // Append at end
            content += `\n## ${section}\n- [N/A]\n`;
          }
        }
      }
      return content;
    };

    // Handle empty activeContext - create full template
    if (!memory.activeContext || memory.activeContext.trim() === '') {
      memory.activeContext = DEFAULT_ACTIVE_CONTEXT;
    } else {
      memory.activeContext = ensureSection(memory.activeContext, [
        'References', 'Decisions', 'Learnings'
      ]);
    }

    // Handle empty patterns - create full template
    if (!memory.patterns || memory.patterns.trim() === '') {
      memory.patterns = DEFAULT_PATTERNS;
    }

    // Handle empty progress - create full template
    if (!memory.progress || memory.progress.trim() === '') {
      memory.progress = DEFAULT_PROGRESS;
    }

    return memory;
  }

  async updateActiveContext(input: any, updates: {
    recentChanges?: string[];
    decisions?: string[];
    learnings?: string[];
    nextSteps?: string[];
  }): Promise<void> {
    const memory = await this.load(input);
    let content = memory.activeContext;

    // Update Recent Changes
    if (updates.recentChanges && updates.recentChanges.length > 0) {
      content = this.appendToSection(content, '## Recent Changes', updates.recentChanges);
    }

    // Update Decisions
    if (updates.decisions && updates.decisions.length > 0) {
      content = this.appendToSection(content, '## Decisions', updates.decisions);
    }

    // Update Learnings
    if (updates.learnings && updates.learnings.length > 0) {
      content = this.appendToSection(content, '## Learnings', updates.learnings);
    }

    // Update Next Steps
    if (updates.nextSteps && updates.nextSteps.length > 0) {
      content = this.appendToSection(content, '## Next Steps', updates.nextSteps);
    }

    // Update Last Updated timestamp
    content = this.replaceLastUpdated(content);

    await this.writeMemoryFile(input, this.memoryFiles.activeContext, content);
  }

  async updateProgress(input: any, updates: {
    currentWorkflow?: string;
    tasks?: string[];
    completed?: string[];
    verification?: string[];
  }): Promise<void> {
    const memory = await this.load(input);
    let content = memory.progress;

    if (updates.currentWorkflow) {
      content = this.replaceOrAppendToSection(content, '## Current Workflow', [updates.currentWorkflow]);
    }

    if (updates.tasks && updates.tasks.length > 0) {
      content = this.appendToSection(content, '## Tasks', updates.tasks);
    }

    if (updates.completed && updates.completed.length > 0) {
      content = this.appendToSection(content, '## Completed', updates.completed);
    }

    if (updates.verification && updates.verification.length > 0) {
      content = this.appendToSection(content, '## Verification', updates.verification);
    }

    // Update Last Updated timestamp
    content = this.replaceLastUpdated(content);

    await this.writeMemoryFile(input, this.memoryFiles.progress, content);
  }

  async updatePatterns(input: any, updates: {
    commonGotchas?: string[];
    codeConventions?: string[];
    architectureDecisions?: string[];
  }): Promise<void> {
    const memory = await this.load(input);
    let content = memory.patterns;

    if (updates.commonGotchas && updates.commonGotchas.length > 0) {
      content = this.appendToSection(content, '## Common Gotchas', updates.commonGotchas);
    }

    if (updates.codeConventions && updates.codeConventions.length > 0) {
      content = this.appendToSection(content, '## Code Conventions', updates.codeConventions);
    }

    if (updates.architectureDecisions && updates.architectureDecisions.length > 0) {
      content = this.appendToSection(content, '## Architecture Decisions', updates.architectureDecisions);
    }

    // Update Last Updated timestamp
    content = this.replaceLastUpdated(content);

    await this.writeMemoryFile(input, this.memoryFiles.patterns, content);
  }

  async accumulateNotes(_ctx: any, notes: string[]): Promise<void> {
    this.pendingNotes.push(...notes);
  }

  async persistAccumulatedNotes(input: any): Promise<void> {
    if (this.pendingNotes.length === 0) return;

    // Categorize notes and distribute to appropriate files
    const learnings: string[] = [];
    const patterns: string[] = [];
    const verification: string[] = [];

    for (const note of this.pendingNotes) {
      if (note.toLowerCase().includes('verification') || note.includes('exit code')) {
        verification.push(note);
      } else if (note.toLowerCase().includes('pattern') || note.toLowerCase().includes('gotcha')) {
        patterns.push(note);
      } else {
        learnings.push(note);
      }
    }

    if (learnings.length > 0) {
      await this.updateActiveContext(input, { learnings });
    }

    if (patterns.length > 0) {
      await this.updatePatterns(input, { commonGotchas: patterns });
    }

    if (verification.length > 0) {
      await this.updateProgress(input, { verification });
    }

    this.pendingNotes = [];
  }

  async saveCompactionCheckpoint(input: any): Promise<void> {
    // Save critical state before compaction
    await this.persistAccumulatedNotes(input);
  }

  private async writeMemoryFile(input: any, path: string, content: string): Promise<void> {
    try {
      // Use Edit for existing files, Write for new ones
      try {
        await readFile(input, path);
        // File exists, use Edit
        const currentContent = await readFile(input, path);
        await editFile(input, path, {
          oldString: currentContent,
          newString: content
        });
      } catch {
        // File doesn't exist, use Write
        await writeFile(input, path, content);
      }
      
      // Update cache
      if (path.includes('activeContext')) {
        this.memoryCache!.activeContext = content;
      } else if (path.includes('patterns')) {
        this.memoryCache!.patterns = content;
      } else if (path.includes('progress')) {
        this.memoryCache!.progress = content;
      }
    } catch (error) {
      console.error('Failed to write memory file:', path, error);
      throw error;
    }
  }

  private appendToSection(content: string, sectionHeader: string, newItems: string[]): string {
    const sectionIndex = content.indexOf(sectionHeader);
    if (sectionIndex === -1) {
      // Section doesn't exist, add it before Last Updated
      const lastUpdatedIndex = content.lastIndexOf('## Last Updated');
      if (lastUpdatedIndex !== -1) {
        const items = newItems.map(item => `- [${new Date().toISOString().split('T')[0]}] ${item}`).join('\n');
        return content.slice(0, lastUpdatedIndex) + 
               `${sectionHeader}\n${items}\n\n` + 
               content.slice(lastUpdatedIndex);
      }
    }

    // Find the section and append items
    const lines = content.split('\n');
    const sectionLineIndex = lines.findIndex(line => line.includes(sectionHeader));
    
    if (sectionLineIndex !== -1) {
      // Find next section or end of file
      let insertIndex = sectionLineIndex + 1;
      while (insertIndex < lines.length && !lines[insertIndex].startsWith('##')) {
        insertIndex++;
      }
      
      const items = newItems.map(item => `- [${new Date().toISOString().split('T')[0]}] ${item}`);
      lines.splice(insertIndex, 0, ...items);
      
      return lines.join('\n');
    }

    return content;
  }

  private replaceOrAppendToSection(content: string, sectionHeader: string, newItems: string[]): string {
    const lines = content.split('\n');
    const sectionLineIndex = lines.findIndex(line => line.includes(sectionHeader));
    const replacementItems = newItems.map(item => `- [${new Date().toISOString().split('T')[0]}] ${item}`);

    if (sectionLineIndex === -1) {
      const lastUpdatedIndex = content.lastIndexOf('## Last Updated');
      if (lastUpdatedIndex !== -1) {
        return content.slice(0, lastUpdatedIndex) +
               `${sectionHeader}\n${replacementItems.join('\n')}\n\n` +
               content.slice(lastUpdatedIndex);
      }
      return `${content}\n${sectionHeader}\n${replacementItems.join('\n')}\n`;
    }

    let nextSectionIndex = sectionLineIndex + 1;
    while (nextSectionIndex < lines.length && !lines[nextSectionIndex].startsWith('##')) {
      nextSectionIndex++;
    }

    lines.splice(sectionLineIndex + 1, nextSectionIndex - (sectionLineIndex + 1), ...replacementItems);
    return lines.join('\n');
  }

  private replaceLastUpdated(content: string): string {
    const nextStamp = `${new Date().toISOString()}`;
    const withBlockReplace = content.replace(
      /## Last Updated\s*\n(?:[^\n]*\n)?/,
      `## Last Updated\n${nextStamp}\n`
    );

    if (withBlockReplace === content) {
      return `${content.trimEnd()}\n\n## Last Updated\n${nextStamp}\n`;
    }
    return withBlockReplace;
  }

  clearCache(): void {
    this.memoryCache = null;
  }
}

export const memoryManager = new MemoryManager();
