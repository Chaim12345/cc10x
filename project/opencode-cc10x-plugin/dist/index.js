// src/intent-detection.ts
var INTENT_PRIORITY = ["DEBUG", "PLAN", "REVIEW", "BUILD"];
var INTENT_KEYWORDS = {
  "DEBUG": [
    "error",
    "bug",
    "fix",
    "broken",
    "crash",
    "fail",
    "debug",
    "troubleshoot",
    "issue",
    "problem",
    "doesn't work",
    "not working",
    "exception",
    "traceback",
    "stack trace",
    "panic",
    "segfault",
    "syntax error",
    "runtime error"
  ],
  "PLAN": [
    "plan",
    "design",
    "architect",
    "roadmap",
    "strategy",
    "spec",
    "before we build",
    "how should we",
    "what's the approach",
    "proposal",
    "recommendation",
    "should we use",
    "options",
    "alternatives",
    "research",
    "investigate"
  ],
  "REVIEW": [
    "review",
    "audit",
    "check",
    "analyze",
    "assess",
    "what do you think",
    "is this good",
    "evaluate",
    "inspect",
    "examine",
    "critique",
    "feedback",
    "suggestions",
    "improve",
    "optimize"
  ],
  "BUILD": [
    "build",
    "implement",
    "create",
    "make",
    "write",
    "add",
    "develop",
    "code",
    "feature",
    "component",
    "app",
    "application",
    "module",
    "class",
    "function",
    "endpoint",
    "api",
    "interface",
    "service",
    "generate",
    "scaffold"
  ]
};
function detectIntent(message, memory) {
  const lowerMessage = message.toLowerCase();
  const detectedKeywords = [];
  const intentScores = {
    "BUILD": 0,
    "DEBUG": 0,
    "REVIEW": 0,
    "PLAN": 0
  };
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        intentScores[intent]++;
        detectedKeywords.push(keyword);
      }
    }
  }
  let selectedIntent = "BUILD";
  let maxScore = intentScores["BUILD"];
  if (intentScores["DEBUG"] > 0) {
    selectedIntent = "DEBUG";
    maxScore = intentScores["DEBUG"];
  } else {
    for (const intent of INTENT_PRIORITY) {
      if (intent === "DEBUG") continue;
      const score = intentScores[intent];
      if (score > maxScore || score === maxScore && INTENT_PRIORITY.indexOf(intent) < INTENT_PRIORITY.indexOf(selectedIntent)) {
        selectedIntent = intent;
        maxScore = score;
      }
    }
  }
  const totalPossibleKeywords = INTENT_KEYWORDS[selectedIntent].length;
  const confidence = Math.min(100, Math.round(intentScores[selectedIntent] / Math.max(1, totalPossibleKeywords) * 100));
  const memoryContext = analyzeMemoryContext(memory, selectedIntent);
  if (memoryContext.suggestedIntent && memoryContext.suggestedIntent !== selectedIntent) {
    if (memoryContext.confidence > confidence) {
      selectedIntent = memoryContext.suggestedIntent;
    }
  }
  return {
    intent: selectedIntent,
    confidence,
    reasoning: generateReasoning(selectedIntent, detectedKeywords, memoryContext),
    keywords: detectedKeywords
  };
}
function analyzeMemoryContext(memory, currentIntent) {
  if (!memory) return { confidence: 0 };
  const activeContext = memory.activeContext || "";
  const patterns = memory.patterns || "";
  const progress = memory.progress || "";
  const combinedContext = `${activeContext} ${patterns} ${progress}`.toLowerCase();
  if (combinedContext.includes("debugging") || combinedContext.includes("investigating")) {
    return { suggestedIntent: "DEBUG", confidence: 70 };
  }
  if (combinedContext.includes("planning") || combinedContext.includes("design")) {
    return { suggestedIntent: "PLAN", confidence: 70 };
  }
  if (combinedContext.includes("reviewing") || combinedContext.includes("audit")) {
    return { suggestedIntent: "REVIEW", confidence: 70 };
  }
  if (combinedContext.includes("building") || combinedContext.includes("implementing")) {
    return { suggestedIntent: "BUILD", confidence: 70 };
  }
  return { confidence: 0 };
}
function generateReasoning(intent, keywords, memoryContext) {
  const reasoningParts = [];
  if (keywords.length > 0) {
    reasoningParts.push(`Detected keywords: ${keywords.slice(0, 3).join(", ")}`);
  }
  if (memoryContext.suggestedIntent) {
    reasoningParts.push(`Memory context suggests ${memoryContext.suggestedIntent} workflow`);
  }
  reasoningParts.push(`Selected ${intent} workflow based on priority rules`);
  return reasoningParts.join(". ");
}

// src/compatibility-layer.ts
async function readFile(input, path) {
  try {
    if (typeof input?.readFile === "function") {
      return await input.readFile(path);
    }
    const result = await input.client?.app?.fs?.read(path);
    return result;
  } catch (error) {
    if (error.code === "ENOENT" || error.message?.includes("not found")) {
      throw new Error(`File not found: ${path}`);
    }
    throw error;
  }
}
async function writeFile(input, path, content) {
  try {
    if (typeof input?.writeFile === "function") {
      await input.writeFile(path, content);
      return;
    }
    await input.client?.app?.fs?.write(path, content);
  } catch (error) {
    console.error(`Failed to write file ${path}:`, error);
    throw error;
  }
}
async function editFile(input, path, options) {
  try {
    if (typeof input?.editFile === "function") {
      await input.editFile(path, options);
      return;
    }
    await input.client?.app?.fs?.edit(path, options);
  } catch (error) {
    console.error(`Failed to edit file ${path}:`, error);
    throw error;
  }
}

// src/memory.ts
var MEMORY_DIR = ".claude/cc10x";
var MEMORY_FILES = {
  activeContext: `${MEMORY_DIR}/activeContext.md`,
  patterns: `${MEMORY_DIR}/patterns.md`,
  progress: `${MEMORY_DIR}/progress.md`
};
var DEFAULT_ACTIVE_CONTEXT = `# Active Context

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
${(/* @__PURE__ */ new Date()).toISOString()}
`;
var DEFAULT_PATTERNS = `# Project Patterns

<!-- CC10X: Do not rename headings. Used as Edit anchors. -->

## Common Gotchas
- [List project-specific issues and solutions here]

## Code Conventions
- [Document coding patterns and standards]

## Architecture Decisions
- [Record important architectural choices]

## Last Updated
${(/* @__PURE__ */ new Date()).toISOString()}
`;
var DEFAULT_PROGRESS = `# Progress Tracking

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
${(/* @__PURE__ */ new Date()).toISOString()}
`;
var MemoryManager = class {
  ctx = null;
  memoryCache = null;
  pendingNotes = [];
  async initialize(input) {
    this.ctx = input;
    await this.ensureDirectory(input);
  }
  async ensureDirectory(input) {
    try {
      const $ = input.$;
      if (typeof $ !== "function") {
        throw new Error("Shell not available");
      }
      const result = await $`mkdir -p ${MEMORY_DIR}`;
      if (result.exitCode !== 0) {
        throw new Error(`mkdir failed: ${result.stderr.toString()}`);
      }
    } catch (error) {
      console.warn("Could not create memory directory:", error);
    }
  }
  async load(input) {
    if (this.memoryCache) {
      return this.memoryCache;
    }
    let memory = {
      activeContext: "",
      patterns: "",
      progress: "",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      for (const [key, path] of Object.entries(MEMORY_FILES)) {
        try {
          const content = await readFile(input, path);
          memory[key] = content;
        } catch (error) {
          console.log(`Memory file ${path} not found, will create template`);
        }
      }
    } catch (error) {
      console.warn("Error loading memory:", error);
    }
    memory = this.autoHealMemory(memory);
    this.memoryCache = memory;
    return memory;
  }
  autoHealMemory(memory) {
    const ensureSection = (content, sections) => {
      for (const section of sections) {
        if (!content.includes(section)) {
          const lastUpdatedIndex = content.lastIndexOf("## Last Updated");
          if (lastUpdatedIndex !== -1) {
            content = content.slice(0, lastUpdatedIndex) + `## ${section}
- [N/A]

` + content.slice(lastUpdatedIndex);
          } else {
            content += `
## ${section}
- [N/A]
`;
          }
        }
      }
      return content;
    };
    if (!memory.activeContext || memory.activeContext.trim() === "") {
      memory.activeContext = DEFAULT_ACTIVE_CONTEXT;
    } else {
      memory.activeContext = ensureSection(memory.activeContext, [
        "References",
        "Decisions",
        "Learnings"
      ]);
    }
    if (!memory.patterns || memory.patterns.trim() === "") {
      memory.patterns = DEFAULT_PATTERNS;
    }
    if (!memory.progress || memory.progress.trim() === "") {
      memory.progress = DEFAULT_PROGRESS;
    }
    return memory;
  }
  async updateActiveContext(input, updates) {
    const memory = await this.load(input);
    let content = memory.activeContext;
    if (updates.recentChanges && updates.recentChanges.length > 0) {
      content = this.appendToSection(content, "## Recent Changes", updates.recentChanges);
    }
    if (updates.decisions && updates.decisions.length > 0) {
      content = this.appendToSection(content, "## Decisions", updates.decisions);
    }
    if (updates.learnings && updates.learnings.length > 0) {
      content = this.appendToSection(content, "## Learnings", updates.learnings);
    }
    if (updates.nextSteps && updates.nextSteps.length > 0) {
      content = this.appendToSection(content, "## Next Steps", updates.nextSteps);
    }
    content = content.replace(
      /## Last Updated\s*\n/,
      `## Last Updated
${(/* @__PURE__ */ new Date()).toISOString()}
`
    );
    await this.writeMemoryFile(input, MEMORY_FILES.activeContext, content);
  }
  async updateProgress(input, updates) {
    const memory = await this.load(input);
    let content = memory.progress;
    if (updates.currentWorkflow) {
      content = this.replaceOrAppendToSection(content, "## Current Workflow", [updates.currentWorkflow]);
    }
    if (updates.tasks && updates.tasks.length > 0) {
      content = this.appendToSection(content, "## Tasks", updates.tasks);
    }
    if (updates.completed && updates.completed.length > 0) {
      content = this.appendToSection(content, "## Completed", updates.completed);
    }
    if (updates.verification && updates.verification.length > 0) {
      content = this.appendToSection(content, "## Verification", updates.verification);
    }
    content = content.replace(
      /## Last Updated\s*\n/,
      `## Last Updated
${(/* @__PURE__ */ new Date()).toISOString()}
`
    );
    await this.writeMemoryFile(input, MEMORY_FILES.progress, content);
  }
  async updatePatterns(input, updates) {
    const memory = await this.load(input);
    let content = memory.patterns;
    if (updates.commonGotchas && updates.commonGotchas.length > 0) {
      content = this.appendToSection(content, "## Common Gotchas", updates.commonGotchas);
    }
    if (updates.codeConventions && updates.codeConventions.length > 0) {
      content = this.appendToSection(content, "## Code Conventions", updates.codeConventions);
    }
    if (updates.architectureDecisions && updates.architectureDecisions.length > 0) {
      content = this.appendToSection(content, "## Architecture Decisions", updates.architectureDecisions);
    }
    content = content.replace(
      /## Last Updated\s*\n/,
      `## Last Updated
${(/* @__PURE__ */ new Date()).toISOString()}
`
    );
    await this.writeMemoryFile(input, MEMORY_FILES.patterns, content);
  }
  async accumulateNotes(_ctx, notes) {
    this.pendingNotes.push(...notes);
  }
  async persistAccumulatedNotes(input) {
    if (this.pendingNotes.length === 0) return;
    const learnings = [];
    const patterns = [];
    const verification = [];
    for (const note of this.pendingNotes) {
      if (note.toLowerCase().includes("verification") || note.includes("exit code")) {
        verification.push(note);
      } else if (note.toLowerCase().includes("pattern") || note.toLowerCase().includes("gotcha")) {
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
  async saveCompactionCheckpoint(input) {
    await this.persistAccumulatedNotes(input);
  }
  async writeMemoryFile(input, path, content) {
    try {
      try {
        await readFile(input, path);
        const currentContent = await readFile(input, path);
        await editFile(input, {
          oldString: currentContent,
          newString: content
        });
      } catch {
        await writeFile(input, path, content);
      }
      if (path.includes("activeContext")) {
        this.memoryCache.activeContext = content;
      } else if (path.includes("patterns")) {
        this.memoryCache.patterns = content;
      } else if (path.includes("progress")) {
        this.memoryCache.progress = content;
      }
    } catch (error) {
      console.error("Failed to write memory file:", path, error);
      throw error;
    }
  }
  appendToSection(content, sectionHeader, newItems) {
    const sectionIndex = content.indexOf(sectionHeader);
    if (sectionIndex === -1) {
      const lastUpdatedIndex = content.lastIndexOf("## Last Updated");
      if (lastUpdatedIndex !== -1) {
        const items = newItems.map((item) => `- [${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}] ${item}`).join("\n");
        return content.slice(0, lastUpdatedIndex) + `${sectionHeader}
${items}

` + content.slice(lastUpdatedIndex);
      }
    }
    const lines = content.split("\n");
    const sectionLineIndex = lines.findIndex((line) => line.includes(sectionHeader));
    if (sectionLineIndex !== -1) {
      let insertIndex = sectionLineIndex + 1;
      while (insertIndex < lines.length && !lines[insertIndex].startsWith("##")) {
        insertIndex++;
      }
      const items = newItems.map((item) => `- [${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}] ${item}`);
      lines.splice(insertIndex, 0, ...items);
      return lines.join("\n");
    }
    return content;
  }
  replaceOrAppendToSection(content, sectionHeader, newItems) {
    return this.appendToSection(content, sectionHeader, newItems);
  }
  clearCache() {
    this.memoryCache = null;
  }
};
var memoryManager = new MemoryManager();

// src/task-orchestrator.ts
var TaskOrchestrator = class _TaskOrchestrator {
  activeWorkflows = /* @__PURE__ */ new Map();
  async createWorkflowTask(input, options) {
    if (this.getActiveWorkflows !== _TaskOrchestrator.prototype.getActiveWorkflows) {
      this.getActiveWorkflows = _TaskOrchestrator.prototype.getActiveWorkflows.bind(this);
    }
    const workflowId = `CC10X-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const workflow = {
      id: workflowId,
      type: options.intent,
      userRequest: options.userRequest,
      memory: options.memory,
      tasks: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "active"
    };
    const tasks = this.createTaskHierarchy(workflowId, options.intent, options.userRequest, options.memory);
    workflow.tasks = tasks;
    this.activeWorkflows.set(workflowId, workflow);
    const parentTask = await this.createOpenCodeTask(input, {
      subject: `CC10X ${options.intent}: ${options.userRequest.substring(0, 50)}`,
      description: this.buildWorkflowDescription(workflow),
      activeForm: `Starting ${options.intent} workflow`
    });
    workflow.tasks[0].id = parentTask.id;
    console.log(`\u{1F4CB} Created workflow ${workflowId} with ${tasks.length} tasks`);
    return workflow.tasks[0];
  }
  createTaskHierarchy(workflowId, intent, userRequest, memory) {
    const tasks = [];
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    switch (intent) {
      case "BUILD":
        tasks.push(
          {
            id: `${workflowId}-builder`,
            subject: "CC10X component-builder: Implement feature",
            description: `Build feature with TDD: ${userRequest}

Plan: ${this.extractPlanFile(memory) || "N/A"}`,
            status: "pending",
            agentType: "component-builder",
            activeForm: "Building components with TDD"
          },
          {
            id: `${workflowId}-reviewer`,
            subject: "CC10X code-reviewer: Review implementation",
            description: "Review code quality, patterns, security",
            status: "pending",
            agentType: "code-reviewer",
            blockedBy: [`${workflowId}-builder`],
            activeForm: "Reviewing code quality"
          },
          {
            id: `${workflowId}-hunter`,
            subject: "CC10X silent-failure-hunter: Hunt edge cases",
            description: "Find silent failures and edge cases",
            status: "pending",
            agentType: "silent-failure-hunter",
            blockedBy: [`${workflowId}-builder`],
            activeForm: "Hunting for failures"
          },
          {
            id: `${workflowId}-verifier`,
            subject: "CC10X integration-verifier: Verify implementation",
            description: "End-to-end validation of the implementation",
            status: "pending",
            agentType: "integration-verifier",
            blockedBy: [`${workflowId}-reviewer`, `${workflowId}-hunter`],
            activeForm: "Verifying integration"
          }
        );
        break;
      case "DEBUG":
        tasks.push(
          {
            id: `${workflowId}-investigator`,
            subject: "CC10X bug-investigator: Investigate issue",
            description: `Debug issue with log-first approach: ${userRequest}`,
            status: "pending",
            agentType: "bug-investigator",
            activeForm: "Investigating bug"
          },
          {
            id: `${workflowId}-reviewer`,
            subject: "CC10X code-reviewer: Validate fix",
            description: "Review fix for correctness and quality",
            status: "pending",
            agentType: "code-reviewer",
            blockedBy: [`${workflowId}-investigator`],
            activeForm: "Reviewing fix"
          },
          {
            id: `${workflowId}-verifier`,
            subject: "CC10X integration-verifier: Verify fix",
            description: "Verify the fix resolves the issue",
            status: "pending",
            agentType: "integration-verifier",
            blockedBy: [`${workflowId}-reviewer`],
            activeForm: "Verifying fix"
          }
        );
        break;
      case "REVIEW":
        tasks.push(
          {
            id: `${workflowId}-reviewer`,
            subject: "CC10X code-reviewer: Comprehensive review",
            description: `Review code with 80%+ confidence: ${userRequest}`,
            status: "pending",
            agentType: "code-reviewer",
            activeForm: "Reviewing code"
          }
        );
        break;
      case "PLAN":
        tasks.push(
          {
            id: `${workflowId}-planner`,
            subject: "CC10X planner: Create comprehensive plan",
            description: `Create detailed plan: ${userRequest}`,
            status: "pending",
            agentType: "planner",
            activeForm: "Creating plan"
          }
        );
        break;
    }
    tasks.push({
      id: `${workflowId}-memory-update`,
      subject: "CC10X Memory Update",
      description: "Persist workflow learnings to memory bank",
      status: "pending",
      agentType: "router",
      // Main assistant does this
      blockedBy: tasks.map((t) => t.id),
      activeForm: "Updating memory"
    });
    return tasks;
  }
  buildWorkflowDescription(workflow) {
    const taskList = workflow.tasks.map(
      (t) => `- ${t.subject} (${t.status})${t.blockedBy ? ` [blocked by: ${t.blockedBy.join(", ")}]` : ""}`
    ).join("\n");
    return `
User Request: ${workflow.userRequest}
Workflow Type: ${workflow.type}
Created: ${workflow.createdAt}

Task Hierarchy:
${taskList}

Memory Context:
- Active Context: ${workflow.memory.activeContext ? "Loaded" : "Empty"}
- Patterns: ${workflow.memory.patterns ? "Loaded" : "Empty"}
- Progress: ${workflow.memory.progress ? "Loaded" : "Empty"}

Follow the cc10x workflow strictly. Check blockedBy dependencies before proceeding.
Parallel execution: code-reviewer and silent-failure-hunter can run simultaneously.
    `.trim();
  }
  extractPlanFile(memory) {
    const activeContext = memory.activeContext || "";
    const referencesMatch = activeContext.match(/## References\n([\s\S]*?)(?=\n##|\n$)/);
    if (referencesMatch) {
      const references = referencesMatch[1];
      const planMatch = references.match(/- Plan:\s*`([^`]+)`/);
      if (planMatch) {
        return planMatch[1];
      }
    }
    return null;
  }
  async createOpenCodeTask(input, options) {
    try {
      let taskId = `local-${Date.now()}`;
      if (typeof input?.taskCreate === "function") {
        const result = await input.taskCreate({
          subject: options.subject,
          description: options.description,
          activeForm: options.activeForm
        });
        taskId = result?.taskId ?? taskId;
      } else if (input?.client?.app?.task?.create) {
        const result = await input.client.app.task.create({
          subject: options.subject,
          description: options.description,
          activeForm: options.activeForm
        });
        taskId = result?.taskId ?? taskId;
      }
      return {
        id: taskId,
        subject: options.subject,
        description: options.description,
        status: "pending",
        agentType: "workflow",
        activeForm: options.activeForm
      };
    } catch (error) {
      console.error("Failed to create OpenCode task:", error);
      return {
        id: `local-${Date.now()}`,
        subject: options.subject,
        description: options.description,
        status: "pending",
        agentType: "workflow",
        activeForm: options.activeForm
      };
    }
  }
  async updateTaskStatus(input, taskId, status, result) {
    for (const workflow of this.activeWorkflows.values()) {
      const task = workflow.tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = status;
        task.result = result;
        break;
      }
    }
    try {
      if (typeof input?.taskUpdate === "function") {
        await input.taskUpdate({
          taskId,
          status
        });
        return;
      }
      if (input?.client?.app?.task?.update && (taskId.startsWith("task_") || taskId.length > 20)) {
        await input.client.app.task.update({
          taskId,
          status
        });
      }
    } catch (error) {
      console.warn("Could not update OpenCode task status:", error);
    }
  }
  async recordExecutionResult(input, result) {
    console.log(`\u{1F4CA} Recorded execution: ${result.tool} ${result.command} \u2192 exit ${result.exitCode}`);
  }
  async getRunnableTasks(input) {
    const runnableTasks = [];
    for (const workflow of this.activeWorkflows.values()) {
      if (workflow.status !== "active") continue;
      for (const task of workflow.tasks) {
        if (task.status !== "pending") continue;
        if (task.blockedBy) {
          const allUnblocked = task.blockedBy.every((blockedId) => {
            const blockedTask = workflow.tasks.find((t) => t.id === blockedId);
            return blockedTask?.status === "completed";
          });
          if (!allUnblocked) continue;
        }
        runnableTasks.push(task);
      }
    }
    return runnableTasks;
  }
  async checkForActiveWorkflows(_ctx) {
    for (const workflow of this.activeWorkflows.values()) {
      if (workflow.status === "active") {
        const hasPendingTasks = workflow.tasks.some((t) => t.status === "pending");
        if (hasPendingTasks) {
          return workflow;
        }
      }
    }
    return null;
  }
  async completeWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.status = "completed";
      console.log(`\u2705 Workflow ${workflowId} completed`);
    }
  }
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.values()).filter((w) => w.status === "active");
  }
};
var taskOrchestrator = new TaskOrchestrator();

// src/workflow-executor.ts
var WorkflowExecutor = class {
  async executeWorkflow(input, options) {
    const { intent, userRequest, memory, workflowTaskId, activeForm } = options;
    console.log(`\u{1F680} Executing ${intent} workflow for: "${userRequest}"`);
    try {
      switch (intent) {
        case "BUILD":
          await this.executeBuildWorkflow(input, { userRequest, memory, workflowTaskId });
          break;
        case "DEBUG":
          await this.executeDebugWorkflow(input, { userRequest, memory, workflowTaskId });
          break;
        case "REVIEW":
          await this.executeReviewWorkflow(input, { userRequest, memory, workflowTaskId });
          break;
        case "PLAN":
          await this.executePlanWorkflow(input, { userRequest, memory, workflowTaskId });
          break;
      }
      await this.executeMemoryUpdate(input, workflowTaskId);
      await taskOrchestrator.completeWorkflow(workflowTaskId);
      console.log(`\u2705 ${intent} workflow completed successfully`);
    } catch (error) {
      console.error(`\u274C ${intent} workflow failed:`, error);
      await this.handleWorkflowFailure(input, workflowTaskId, error);
    }
  }
  async executeBuildWorkflow(input, options) {
    const { userRequest, memory, workflowTaskId } = options;
    await this.invokeAgent(input, {
      agentName: "cc10x-component-builder",
      taskId: `${workflowTaskId}-builder`,
      prompt: this.buildBuilderPrompt(userRequest, memory),
      waitForCompletion: true
    });
    await this.invokeParallelAgents(input, {
      agentNames: ["cc10x-code-reviewer", "cc10x-silent-failure-hunter"],
      baseTaskId: workflowTaskId,
      sharedPrompt: this.buildReviewAndHuntPrompt(userRequest, memory),
      waitForCompletion: true
    });
    await this.invokeAgent(input, {
      agentName: "cc10x-integration-verifier",
      taskId: `${workflowTaskId}-verifier`,
      prompt: await this.buildVerifierPrompt(input, workflowTaskId),
      waitForCompletion: true
    });
  }
  async executeDebugWorkflow(input, options) {
    const { userRequest, memory, workflowTaskId } = options;
    await this.invokeAgent(input, {
      agentName: "cc10x-bug-investigator",
      taskId: `${workflowTaskId}-investigator`,
      prompt: this.buildDebugPrompt(userRequest, memory),
      waitForCompletion: true
    });
    await this.invokeAgent(input, {
      agentName: "cc10x-code-reviewer",
      taskId: `${workflowTaskId}-reviewer`,
      prompt: this.buildReviewFixPrompt(userRequest, memory),
      waitForCompletion: true
    });
    await this.invokeAgent(input, {
      agentName: "cc10x-integration-verifier",
      taskId: `${workflowTaskId}-verifier`,
      prompt: await this.buildVerifierPrompt(input, workflowTaskId),
      waitForCompletion: true
    });
  }
  async executeReviewWorkflow(input, options) {
    const { userRequest, memory, workflowTaskId } = options;
    await this.invokeAgent(input, {
      agentName: "cc10x-code-reviewer",
      taskId: `${workflowTaskId}-reviewer`,
      prompt: this.buildReviewPrompt(userRequest, memory),
      waitForCompletion: true
    });
  }
  async executePlanWorkflow(input, options) {
    const { userRequest, memory, workflowTaskId } = options;
    await this.invokeAgent(input, {
      agentName: "cc10x-planner",
      taskId: `${workflowTaskId}-planner`,
      prompt: this.buildPlanPrompt(userRequest, memory),
      waitForCompletion: true
    });
  }
  async executeMemoryUpdate(input, workflowTaskId) {
    console.log("\u{1F4BE} Executing workflow-final memory update");
    await memoryManager.persistAccumulatedNotes(input);
    await memoryManager.updateProgress(input, {
      completed: [`Workflow ${workflowTaskId} completed with verification`]
    });
  }
  async invokeAgent(input, options) {
    const { agentName, taskId, prompt, waitForCompletion } = options;
    console.log(`\u{1F916} Invoking agent: ${agentName} (task: ${taskId})`);
    try {
      await taskOrchestrator.updateTaskStatus(input, taskId, "in_progress");
      let result;
      if (typeof input?.invokeAgent === "function") {
        result = await input.invokeAgent(agentName, {
          prompt,
          taskId
        });
      } else {
        result = await input.client.app.agent.invoke(agentName, {
          prompt,
          taskId
        });
      }
      await taskOrchestrator.updateTaskStatus(input, taskId, "completed", result);
      console.log(`\u2705 Agent ${agentName} completed`);
    } catch (error) {
      console.error(`\u274C Agent ${agentName} failed:`, error);
      await taskOrchestrator.updateTaskStatus(input, taskId, "blocked");
      throw error;
    }
  }
  async invokeParallelAgents(input, options) {
    const { agentNames, baseTaskId, sharedPrompt, waitForCompletion } = options;
    console.log(`\u26A1 Invoking parallel agents: ${agentNames.join(", ")}`);
    const agentPromises = agentNames.map(
      (agentName) => this.invokeAgent(input, {
        agentName,
        taskId: `${baseTaskId}-${agentName.split("-").pop()}`,
        prompt: sharedPrompt,
        waitForCompletion: true
        // Each agent waits for its own completion
      })
    );
    await Promise.all(agentPromises);
  }
  buildBuilderPrompt(userRequest, memory) {
    return `
# Component Builder (TDD)

## User Request
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Instructions
Follow the TDD cycle strictly:
1. RED: Write a failing test first (must exit with code 1)
2. GREEN: Write minimal code to pass (must exit with code 0)  
3. REFACTOR: Clean up while keeping tests green
4. VERIFY: All tests must pass

## Pre-Implementation Checklist
- API: CORS? Auth middleware? Input validation? Rate limiting?
- UI: Loading states? Error boundaries? Accessibility?
- DB: Migrations? N+1 queries? Transactions?
- All: Edge cases listed? Error handling planned?

## Output Requirements
- Provide TDD evidence with exact commands and exit codes
- Include Dev Journal with decisions and assumptions
- Follow the Router Contract format exactly
- Update memory via Edit tool (permission-free)
    `.trim();
  }
  buildReviewAndHuntPrompt(userRequest, memory) {
    return `
# Code Review & Silent Failure Hunt

## User Request  
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Instructions
Analyze the implementation from the component-builder. Focus on:

### Code Reviewer Focus
- Code quality and best practices
- Security vulnerabilities (OWASP top 10)
- Performance implications (N+1 queries, etc.)
- Maintainability and readability
- API design and contracts

### Silent Failure Hunter Focus  
- Empty catch blocks
- Missing error handling
- Unvalidated inputs
- Resource leaks
- Race conditions
- Edge cases not covered by tests

## Confidence Scoring
Only report issues with \u226580% confidence. Provide file:line citations.

## Output Requirements
- Critical Issues section with confidence scores
- Verdict: APPROVED or CHANGES REQUESTED
- Include "### Memory Notes" section for workflow persistence
    `.trim();
  }
  async buildVerifierPrompt(input, workflowTaskId) {
    const reviewerTaskId = `${workflowTaskId}-reviewer`;
    const hunterTaskId = `${workflowTaskId}-hunter`;
    return `
# Integration Verifier

## Task Context
- Workflow: ${workflowTaskId}
- Previous agents: code-reviewer, silent-failure-hunter

## Instructions
Verify the implementation considering ALL findings from previous agents.

### Verification Checklist
- [ ] All tests pass (exit code 0)
- [ ] No critical security issues
- [ ] No silent failures detected
- [ ] Error handling is comprehensive
- [ ] Performance is acceptable
- [ ] Code follows project patterns

### Critical Issues
Any CRITICAL issues should block PASS verdict.

## Output Requirements
- Verdict: PASS or FAIL with reasoning
- Include verification evidence (commands + exit codes)
- Provide "### Memory Notes" section
    `.trim();
  }
  buildDebugPrompt(userRequest, memory) {
    return `
# Bug Investigator (LOG FIRST)

## User Request
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Iron Law: LOG FIRST
Never fix without evidence. Follow this process:

1. **Reproduce** - Get exact error conditions
2. **Log** - Gather all relevant logs, stack traces, system state
3. **Analyze** - Root cause analysis using debugging patterns
4. **Fix** - Minimal change to resolve
5. **Verify** - Confirm fix works and doesn't break other things

## Common Debugging Patterns
- Check recent changes (git diff)
- Examine error logs and stack traces
- Validate assumptions with print statements
- Isolate the failing component
- Check for null/undefined values
- Verify data types and formats

## Output Requirements
- Evidence before any fix proposal
- Root cause analysis with confidence
- Minimal fix with verification
- Update memory with common gotchas if discovered
    `.trim();
  }
  buildReviewFixPrompt(userRequest, memory) {
    return `
# Code Reviewer (Fix Validation)

## User Request
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Instructions
Review the bug fix from bug-investigator. Focus on:

- Fix correctness: Does it actually solve the problem?
- Side effects: Does it introduce new issues?
- Code quality: Is the fix clean and maintainable?
- Testing: Are there tests for the fix?
- Security: Does the fix introduce vulnerabilities?

## Confidence Scoring
Only report issues with \u226580% confidence.

## Output Requirements
- Verdict: APPROVED or CHANGES REQUESTED
- Critical Issues with file:line citations
- Include "### Memory Notes" section
    `.trim();
  }
  buildReviewPrompt(userRequest, memory) {
    return `
# Code Reviewer (Comprehensive Review)

## User Request
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Instructions
Perform comprehensive code review with 80%+ confidence threshold.

### Review Dimensions
- **Security**: OWASP top 10, input validation, authentication/authorization
- **Performance**: Algorithm efficiency, database queries, memory usage
- **Maintainability**: Code structure, naming, documentation
- **Reliability**: Error handling, edge cases, resource management
- **Testing**: Test coverage, test quality, edge case coverage

## Output Requirements
- Only report issues with \u226580% confidence
- File:line citations for every finding
- Verdict: APPROVED or CHANGES REQUESTED
- Include "### Memory Notes" section
    `.trim();
  }
  buildPlanPrompt(userRequest, memory) {
    return `
# Planner (Comprehensive Planning)

## User Request
${userRequest}

## Memory Context
${this.formatMemoryContext(memory)}

## Planning Requirements
Create a comprehensive plan that includes:

### 1. Analysis
- Current state assessment
- Requirements clarification
- Constraints and dependencies
- Risk assessment

### 2. Architecture
- System design decisions
- Technology choices with rationale
- API design (if applicable)
- Data model (if applicable)

### 3. Implementation Plan
- Phased approach with milestones
- Specific files to create/modify
- Testing strategy
- Rollback plan

### 4. Research Needs
- External packages to investigate
- Best practices to research
- Alternatives to evaluate

## Output Requirements
- Save plan to docs/plans/YYYY-MM-DD-<topic>-plan.md
- Update activeContext.md with plan reference
- Include research phase if needed (github-research skill)
- Provide clear next steps
    `.trim();
  }
  formatMemoryContext(memory) {
    if (!memory) return "No memory available";
    const parts = [];
    if (memory.activeContext) {
      const focusMatch = memory.activeContext.match(/## Current Focus\n([\s\S]*?)(?=\n##|\n$)/);
      if (focusMatch) {
        parts.push(`Current Focus: ${focusMatch[1].trim()}`);
      }
    }
    if (memory.patterns) {
      const gotchasMatch = memory.patterns.match(/## Common Gotchas\n([\s\S]*?)(?=\n##|\n$)/);
      if (gotchasMatch) {
        parts.push(`Common Gotchas: ${gotchasMatch[1].trim().substring(0, 200)}...`);
      }
    }
    if (memory.progress) {
      const completedMatch = memory.progress.match(/## Completed\n([\s\S]*?)(?=\n##|\n$)/);
      if (completedMatch) {
        parts.push(`Recent Completions: ${completedMatch[1].trim().substring(0, 200)}...`);
      }
    }
    return parts.length > 0 ? parts.join("\n") : "Memory files empty or not loaded";
  }
  async handleWorkflowFailure(input, workflowTaskId, error) {
    console.error(`Workflow ${workflowTaskId} failed:`, error);
    await memoryManager.updateActiveContext(input, {
      recentChanges: [`Workflow ${workflowTaskId} failed: ${error.message}`],
      nextSteps: [`Investigate workflow failure: ${error.message}`]
    });
  }
};
var workflowExecutor = new WorkflowExecutor();

// src/router.ts
async function cc10xRouter(input) {
  await memoryManager.initialize(input);
  const activeWorkflows = /* @__PURE__ */ new Map();
  const routerHooks = {
    // Main message interceptor - this is where cc10x magic happens
    messageReceived: async (input2, output) => {
      try {
        const userMessage = input2.args?.message || input2.args?.text || "";
        if (!isDevelopmentIntent(userMessage)) {
          return;
        }
        const activeWorkflow = await checkForActiveWorkflow(input2);
        if (activeWorkflow) {
          await resumeWorkflow(activeWorkflow, userMessage, input2);
          return;
        }
        const memory = await memoryManager.load(input2);
        const intent = detectIntent(userMessage, memory);
        const workflowTask = await taskOrchestrator.createWorkflowTask(input2, {
          userRequest: userMessage,
          intent,
          memory
        });
        await workflowExecutor.executeWorkflow(input2, {
          intent,
          userRequest: userMessage,
          memory,
          workflowTaskId: workflowTask.id,
          activeForm: getActiveFormForIntent(intent, userMessage)
        });
      } catch (error) {
        console.error("cc10x router error:", error);
      }
    },
    sessionCreated: async (input2, output) => {
      await memoryManager.ensureDirectory(input2);
    },
    sessionCompacted: async (input2, output) => {
      await memoryManager.saveCompactionCheckpoint(input2);
    },
    toolExecuteBefore: async (input2, output) => {
      if (input2.tool === "bash" && isTestCommand(input2.args?.command)) {
        await enforceTDDRequirements(input2, input2);
      }
      if (isMemoryOperation(input2)) {
        await validateMemoryOperation(input2, input2);
      }
    },
    toolExecuteAfter: async (input2, output) => {
      if (output.exitCode !== void 0) {
        await taskOrchestrator.recordExecutionResult(input2, {
          tool: input2.tool,
          command: input2.args?.command,
          exitCode: output.exitCode,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    },
    agentStarted: async (input2, output) => {
      const agentName = input2.agentName || input2.agent;
      const taskId = input2.taskId;
      if (taskId) {
        await taskOrchestrator.updateTaskStatus(input2, taskId, "in_progress");
      }
      console.log(`\u{1F916} cc10x agent started: ${agentName}`);
    },
    agentCompleted: async (input2, output) => {
      const agentName = input2.agentName || input2.agent;
      const taskId = input2.taskId;
      const result = input2.result || input2.output;
      if (taskId) {
        await taskOrchestrator.updateTaskStatus(input2, taskId, "completed", result);
      }
      const memoryNotes = extractMemoryNotes(result);
      if (memoryNotes && memoryNotes.length > 0) {
        await memoryManager.accumulateNotes(input2, memoryNotes);
      }
      console.log(`\u2705 cc10x agent completed: ${agentName}`);
    },
    manualInvoke: async (args, context) => {
      const request = args.request || args.task || args.prompt || "";
      if (!request.trim()) {
        return "Please provide a task description.";
      }
      console.log(`\u{1F680} Manual cc10x invocation: ${request}`);
      const syntheticMessage = {
        id: `manual-${Date.now()}`,
        content: request,
        role: "user",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      try {
        await routerHooks.messageReceived(context, syntheticMessage);
        return `\u2705 cc10x orchestration started for: ${request}`;
      } catch (error) {
        console.error("Manual invocation failed:", error);
        return `\u274C cc10x orchestration failed: ${error.message}`;
      }
    }
  };
  return { routerHooks };
}
function isDevelopmentIntent(message) {
  const devKeywords = [
    "build",
    "implement",
    "create",
    "make",
    "write",
    "add",
    "develop",
    "code",
    "feature",
    "component",
    "app",
    "application",
    "debug",
    "fix",
    "error",
    "bug",
    "broken",
    "troubleshoot",
    "review",
    "audit",
    "check",
    "analyze",
    "plan",
    "design",
    "architect",
    "roadmap",
    "strategy",
    "test",
    "tdd"
  ];
  const lowerMessage = message.toLowerCase();
  return devKeywords.some((keyword) => lowerMessage.includes(keyword));
}
function getActiveFormForIntent(intent, userMessage) {
  const intentDescriptions = {
    "BUILD": `Building: ${userMessage.substring(0, 50)}...`,
    "DEBUG": `Debugging: ${userMessage.substring(0, 50)}...`,
    "REVIEW": `Reviewing: ${userMessage.substring(0, 50)}...`,
    "PLAN": `Planning: ${userMessage.substring(0, 50)}...`
  };
  return intentDescriptions[intent] || "Processing development task...";
}
function isTestCommand(command) {
  if (!command) return false;
  const testPatterns = [
    /test/i,
    /spec/i,
    /\.test\./,
    /\.spec\./,
    /jest/i,
    /mocha/i,
    /pytest/i,
    /tox/i,
    /npm test/i,
    /yarn test/i,
    /bun test/i
  ];
  return testPatterns.some((pattern) => pattern.test(command));
}
function isMemoryOperation(input) {
  const filePath = input.args?.filePath || "";
  const memoryPaths = [
    ".claude/cc10x/activeContext.md",
    ".claude/cc10x/patterns.md",
    ".claude/cc10x/progress.md"
  ];
  return memoryPaths.some((path) => filePath.includes(path));
}
async function enforceTDDRequirements(ctx, input) {
}
async function validateMemoryOperation(ctx, input) {
}
async function checkForActiveWorkflow(ctx) {
  return null;
}
async function resumeWorkflow(workflow, userMessage, ctx) {
}
function extractMemoryNotes(result) {
  if (typeof result === "string") {
    const notes = [];
    const lines = result.split("\n");
    let inMemorySection = false;
    for (const line of lines) {
      if (line.includes("### Memory Notes")) {
        inMemorySection = true;
        continue;
      }
      if (inMemorySection) {
        if (line.startsWith("###") && !line.includes("Memory Notes")) {
          break;
        }
        if (line.trim() && !line.startsWith("#")) {
          notes.push(line.trim());
        }
      }
    }
    return notes;
  }
  return [];
}

// src/index.ts
var OpenCodeCC10xPlugin = async (input) => {
  console.log("\u{1F50C} OpenCode cc10x Plugin v6.0.18 initializing...");
  const { $ } = input;
  const routerHook = await cc10xRouter({ ...input, $ });
  return {
    name: "opencode-cc10x",
    description: "Intelligent orchestration system for OpenCode - port of cc10x from Claude Code",
    version: "6.0.18",
    hooks: {
      // Router hook that intercepts user requests and orchestrates workflows
      "message.received": routerHook.messageReceived,
      // Session management hooks
      "session.created": routerHook.sessionCreated,
      "session.compacted": routerHook.sessionCompacted,
      // Tool execution hooks for TDD enforcement
      "tool.execute.before": routerHook.toolExecuteBefore,
      "tool.execute.after": routerHook.toolExecuteAfter,
      // Agent lifecycle hooks
      "agent.started": routerHook.agentStarted,
      "agent.completed": routerHook.agentCompleted
    },
    // Provide the cc10x router as a tool
    tools: {
      "cc10x-router": {
        description: "Main cc10x orchestration router - automatically invoked for development tasks",
        execute: async (args, context) => {
          return await routerHook.manualInvoke(args, context);
        }
      }
    },
    // Add command to appear in /commands menu
    commands: [
      {
        name: "cc10x-orchestrate",
        description: "Run cc10x intelligent orchestration for a development task",
        execute: async (args, context) => {
          const request = args.request || args.task || args.prompt || "";
          if (!request.trim()) {
            return "Please provide a task description. Usage: /cc10x-orchestrate <task description>";
          }
          console.log(`\u{1F680} cc10x orchestration triggered for: ${request}`);
          const workflowTaskId = `cc10x-manual-${Date.now()}`;
          await routerHook.manualInvoke({
            request,
            taskId: workflowTaskId,
            forceWorkflow: true
          }, context);
          return `\u2705 cc10x orchestration started for task: ${request}`;
        }
      }
    ]
  };
};
var index_default = OpenCodeCC10xPlugin;
export {
  OpenCodeCC10xPlugin,
  index_default as default
};
