import type { SkillDefinition } from '@opencode-ai/plugin';

export const skillDefinitions: SkillDefinition[] = [
  {
    name: 'cc10x-session-memory',
    description: 'MANDATORY: Load and update .claude/cc10x/ memory files. All cc10x agents use this for persistence.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'cc10x-agents',
      purpose: 'memory-persistence',
      required: 'true'
    },
    content: `# Session Memory (MANDATORY)

## The Iron Law
EVERY WORKFLOW MUST:
1. LOAD memory at START (and before key decisions)
2. UPDATE memory at END (and after learnings/decisions)

**Brevity Rule:** Memory is an index, not a document. Be brief—one line per item.

## Memory Surfaces (Types)
1. **Index / Working Memory**: .claude/cc10x/activeContext.md
   - "What matters right now": focus, next steps, active decisions, learnings
   - Links to durable artifacts (plans/research)
2. **Long-Term Project Memory**: .claude/cc10x/patterns.md
   - Conventions, architecture decisions, common gotchas, reusable solutions
3. **Progress + Evidence Memory**: .claude/cc10x/progress.md
   - What's done/remaining + verification evidence (commands + exit codes)
4. **Artifact Memory (Durable)**: docs/plans/*, docs/research/*
5. **Tasks (Execution State)**: OpenCode Tasks

## Permission-Free Operations
- Create memory directory: Bash(command="mkdir -p .claude/cc10x")
- **Read memory files**: Read tool (FREE)
- **Create NEW memory file**: Write tool (FREE if file doesn't exist)
- **Update EXISTING memory**: Edit tool (FREE - no permission prompt)

**CRITICAL: Use Write for NEW files, Edit for UPDATES.**

## At Workflow START (REQUIRED)
1. Bash(command="mkdir -p .claude/cc10x")
2. Read(file_path=".claude/cc10x/activeContext.md")
3. Read(file_path=".claude/cc10x/patterns.md")
4. Read(file_path=".claude/cc10x/progress.md")

## At Workflow END (REQUIRED)
Use Edit tool (NO permission prompt) to update:
- activeContext.md: add Recent Changes, Decisions, Learnings
- progress.md: add Completed items with verification evidence
- patterns.md: only if discovered reusable convention/gotcha

## Read Triggers
Read memory BEFORE:
- Making architectural decisions (check patterns.md)
- Starting to build something (check progress.md)
- Debugging an error (check activeContext.md + patterns.md)
- Making any decision (check Decisions section)

## File Purposes
- activeContext.md: current state + pointers
- patterns.md: reusable knowledge (conventions, gotchas)
- progress.md: execution tracking + hard evidence

## Memory File Contract
- Do NOT rename top-level headers or section headers
- Only add content inside existing sections
- After every Edit, Read back to confirm change applied
- If Edit fails, STOP and retry with exact anchor

## Red Flags - STOP IMMEDIATELY
- Starting work WITHOUT loading memory
- Making decisions WITHOUT checking Decisions section  
- Completing work WITHOUT updating memory
- Saying "I'll remember" instead of writing to memory

## Integration with Agents
- WRITE agents (component-builder, bug-investigator, planner): load and update memory directly
- READ-ONLY agents (code-reviewer, silent-failure-hunter, integration-verifier): output Memory Notes section
- Main assistant (router) persists read-only agent notes via Edit tool

## Rationalization Prevention
| Excuse | Reality |
|--------|---------|
| "I know what we decided" | Check the Decisions section. |
| "Small task, no need" | Small tasks have context too. Always update. |
| "I'll remember" | You won't. Write it down. |
| "Memory is optional" | Memory is MANDATORY. No exceptions.`
  },
  {
    name: 'cc10x-verification-before-completion',
    description: 'Enforces evidence-before-claims principle. All agents must provide verification evidence before marking tasks complete.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-agents',
      purpose: 'verification-gate',
      required: 'true'
    },
    content: `# Verification Before Completion

**Iron Law:** No claim without evidence. Exit code 0 or it didn't happen.

## The Gate
Before marking ANY task complete, you MUST provide:
1. **Commands executed** - exact commands with full arguments
2. **Exit codes** - actual exit codes (0 for success, non-zero for failure)
3. **Output evidence** - relevant output showing success/failure
4. **Verification steps** - how you confirmed it works

## Evidence Requirements by Agent

### component-builder (TDD)
- **RED Phase**: Test command → exit code 1 + failure message
- **GREEN Phase**: Implementation command → exit code 0 + test results (X/X)
- **Verification**: All tests pass command → exit code 0

### bug-investigator
- **Reproduction**: Command to reproduce issue → exit code showing error
- **Fix verification**: Command after fix → exit code 0
- **Regression test**: Command to ensure no side effects → exit code 0

### code-reviewer
- **Static analysis**: Commands run (grep, lint) → exit codes
- **Code inspection**: Specific file:line references with evidence
- **Confidence**: Only report issues with ≥80% confidence

### integration-verifier
- **Test suite**: Full test command → exit 0 (X/X passed)
- **Application start**: Start command → exit 0
- **Manual verification**: Steps taken with results

## Output Format
Always include in your response:

### Verification Evidence
- \`[command]\` → exit [code] ([X/X] tests passed)
- [Additional verification steps with results]

### Confidence Level
- **High**: Multiple verification methods confirm
- **Medium**: Single verification method but thorough
- **Low**: Limited verification, needs follow-up

## Router Contract
Include in YAML contract:
\`\`\`yaml
VERIFICATION_EVIDENCE:
  - command: "npm test"
    exit_code: 0
    output: "X/X tests passed"
CONFIDENCE: 85
STATUS: PASS | FAIL
\`\`\`

## Common Violations (STOP THESE)
- "Tests should pass" (without running them)
- "It looks good" (without evidence)
- "I think it works" (without verification)
- "All tests passed" (without showing exit code)

## Reminder
If you cannot provide concrete evidence with exit codes, the task is NOT complete.`
  },
  {
    name: 'cc10x-test-driven-development',
    description: 'Enforces RED-GREEN-REFACTOR TDD cycle. Used by component-builder and bug-investigator.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'builder, investigator',
      purpose: 'tdd-enforcement',
      required: 'true'
    },
    content: `# Test-Driven Development (TDD)

**Cycle:** RED → GREEN → REFACTOR. No exceptions.

## The Three Phases

### RED Phase (Failing Test)
1. Write a test that fails for the desired functionality
2. Run the test - MUST exit with code 1
3. Verify the failure is for the right reason
4. **Evidence required**: Test command, exit code 1, failure message

### GREEN Phase (Minimal Implementation)
1. Write the minimal code to make the test pass
2. Run the test - MUST exit with code 0
3. Do NOT write more code than necessary
4. **Evidence required**: Implementation command, exit code 0, test results

### REFACTOR Phase (Clean Up)
1. Improve code structure while keeping tests green
2. Remove duplication
3. Improve naming and organization
4. Run tests continuously - must stay green (exit 0)
5. **Evidence required**: Refactor commands, final test run exit 0

## TDD Rules

### Never Skip RED
- No implementation without failing test first
- Even if you know exactly how to implement
- The test defines the expected behavior

### Minimal GREEN
- Write the simplest code that makes test pass
- Don't anticipate future requirements
- Trust the refactor phase to improve structure

### Continuous Green
- Run tests frequently during refactor
- Never commit code that breaks tests
- Maintain 100% test pass rate during refactor

## Test Quality Requirements

### Unit Tests
- Test one thing per test
- Use descriptive test names
- Arrange-Act-Assert pattern
- Mock external dependencies

### Integration Tests  
- Test component interactions
- Use real dependencies where appropriate
- Test error handling paths

### Edge Cases
- Null/undefined inputs
- Boundary conditions
- Error conditions
- Empty collections

## Test Commands
Use appropriate commands for your stack:
- JavaScript/TypeScript: \`npm test\`, \`yarn test\`, \`bun test\`
- Python: \`pytest\`, \`python -m pytest\`, \`tox\`
- Go: \`go test\`
- Rust: \`cargo test\`
- Java: \`mvn test\`, \`gradle test\`

## Evidence Template
\`\`\`
### RED Phase
- Test file: path/to/test.ts
- Command: npm test -- test-file.test.ts
- Exit code: **1** (MUST be 1)
- Failure: Expected error message

### GREEN Phase  
- Implementation: path/to/impl.ts
- Command: npm test
- Exit code: **0** (MUST be 0)
- Tests passed: 5/5

### REFACTOR Phase
- Refactor commands: [commands run]
- Final test: npm test → exit 0
\`\`\`

## Common TDD Violations
- ❌ Writing implementation first
- ❌ Skipping RED phase ("I know it will fail")
- ❌ Writing extra features during GREEN
- ❌ Breaking tests during refactor
- ❌ Not showing exit codes

## For component-builder
TDD is NON-NEGOTIABLE. Every feature must follow RED→GREEN→REFACTOR.
Include TDD evidence in your output using the template above.

## For bug-investigator
Use TDD pattern for fixes:
1. RED: Write test that reproduces bug (should fail)
2. GREEN: Fix the bug (test should pass)
3. REFACTOR: Clean up the fix

## For integration-verifier
Verify that all tests pass (exit 0) before approving.`
  },
  {
    name: 'cc10x-code-generation',
    description: 'Provides code generation patterns for consistent, minimal implementations. Used by component-builder.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'builder',
      purpose: 'code-patterns',
      required: 'false'
    },
    content: `# Code Generation Patterns

**Principle:** Minimal code, match existing patterns, follow conventions.

## Code Quality Principles

### Minimalism
- Write the simplest code that works
- Don't anticipate future requirements
- Remove unused code immediately
- Prefer composition over inheritance

### Consistency
- Match existing code patterns in the project
- Follow established naming conventions
- Use same formatting and style
- Reuse existing utilities and helpers

### Clarity
- Self-documenting code through naming
- Simple logic over clever solutions
- Clear function and variable names
- Comments only for "why", not "what"

## Implementation Patterns

### Function Design
- Single responsibility per function
- Small, focused functions (<20 lines)
- Clear inputs and outputs
- Avoid side effects when possible

### Error Handling
- Fail fast with clear error messages
- Use appropriate error types
- Don't swallow errors
- Provide context in error messages

### Data Structures
- Choose appropriate structures for the use case
- Consider performance implications
- Document complex data shapes
- Use type safety where available

## API Design Patterns

### RESTful Endpoints
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Consistent URL patterns
- Proper status codes
- Request/response validation

### Function Signatures
- Clear parameter names and types
- Optional parameters with defaults
- Return consistent types
- Document edge cases

## Testing Patterns

### Test Structure
- Arrange-Act-Assert pattern
- One assertion per test when possible
- Use descriptive test names
- Test behavior, not implementation

### Mocking Strategy
- Mock external dependencies
- Use test doubles for slow operations
- Verify interactions when needed
- Prefer integration tests for critical paths

## Security Patterns

### Input Validation
- Validate all user inputs
- Sanitize data before use
- Use parameterized queries
- Implement rate limiting

### Authentication/Authorization
- Never hardcode secrets
- Use environment variables
- Implement proper session management
- Follow principle of least privilege

## Performance Patterns

### Database Queries
- Use indexes appropriately
- Avoid N+1 query problems
- Batch operations when possible
- Cache expensive computations

### Caching Strategy
- Cache read-heavy operations
- Implement cache invalidation
- Use appropriate TTLs
- Consider cache warming

## For component-builder
1. First, check patterns.md for project-specific conventions
2. Follow the minimal code principle
3. Match existing patterns exactly
4. Write tests before implementation (TDD)
5. Update patterns.md if you discover new conventions

## Code Generation Rules
- ✅ Use existing utilities and helpers
- ✅ Follow project naming conventions  
- ✅ Keep functions small and focused
- ✅ Write comprehensive tests
- ❌ Don't reinvent existing solutions
- ❌ Don't add unnecessary complexity
- ❌ Don't skip error handling

## When to Ask
- Unclear about project patterns → check patterns.md first
- Need to choose between approaches → consider trade-offs
- Performance critical → profile before optimizing
- Security sensitive → follow OWASP guidelines`
  },
  {
    name: 'cc10x-debugging-patterns',
    description: 'Systematic debugging approach and common patterns. Used by bug-investigator.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'investigator',
      purpose: 'debugging-methodology',
      required: 'false'
    },
    content: `# Debugging Patterns

**Methodology:** Systematic approach, evidence first, binary search narrowing.

## Debugging Methodology

### 1. Reproduce the Issue
- Get exact, reliable reproduction steps
- Identify consistent vs intermittent behavior
- Note environment and conditions
- Capture complete error information

### 2. Gather Evidence
- Stack traces and error messages
- Application logs (all levels)
- System state (memory, CPU, network)
- Recent changes (git diff, deployment history)
- Input data that triggered the issue

### 3. Form Hypotheses
- What changed recently?
- What component is failing?
- What conditions trigger the issue?
- What should happen vs what is happening?

### 4. Test Hypotheses
- Binary search approach (divide and conquer)
- Add logging to narrow down
- Isolate components
- Test with controlled inputs

### 5. Identify Root Cause
- The actual code defect
- Not just the symptom
- Understand why it happens
- Document the mechanism

### 6. Implement Fix
- Minimal change to resolve
- Address root cause, not symptoms
- Consider side effects
- Add tests to prevent regression

### 7. Verify Fix
- Original reproduction steps now work
- No new issues introduced
- Performance not degraded
- All existing tests still pass

## Common Debugging Patterns

### Binary Search Debugging
1. Identify roughly where issue occurs
2. Add logging/checks at midpoint
3. Narrow to half based on results
4. Repeat until exact location found

### Time Travel Debugging
1. Check recent changes (git log -p)
2. Identify when issue started
3. Compare working vs broken versions
4. Isolate the change that caused it

### Dependency Debugging
1. Check all external dependencies
2. Verify versions and compatibility
3. Test with minimal dependencies
4. Check for version conflicts

### State Debugging
1. Log state at key points
2. Compare expected vs actual state
3. Track state changes
4. Identify where state becomes invalid

### Race Condition Detection
1. Add timing logs with timestamps
2. Look for overlapping operations
3. Test with delays/sleeps
4. Check for unsynchronized access

## Tool-Based Debugging

### Git-Based
- \`git status\` - current state
- \`git diff\` - uncommitted changes
- \`git log -p\` - recent changes with diffs
- \`git bisect\` - binary search through history

### Log-Based
- Application logs (structured if possible)
- System logs (syslog, dmesg)
- Network logs (if applicable)
- Database query logs

### Static Analysis
- Linting rules violations
- Type checking errors
- Security scanning results
- Code complexity metrics

### Dynamic Analysis
- Profiling (CPU, memory)
- Tracing (distributed tracing)
- Debuggers (gdb, pdb, browser devtools)
- Network sniffers (wireshark, tcpdump)

## Stack Trace Analysis

### Reading Stack Traces
1. Start at the top (most recent call)
2. Look for your code frames
3. Identify the exact line and operation
4. Check for "Caused by" chains

### Common Patterns
- NullPointerException/TypeError - check for null/undefined
- IndexOutOfBounds - check array/list access
- Connection refused - check network/configuration
- Timeout - check blocking operations
- Memory error - check for leaks or large allocations

## Environment Debugging

### Configuration Issues
- Check environment variables
- Verify configuration files
- Test with minimal configuration
- Compare dev vs prod settings

### Dependency Issues
- Check package versions
- Verify installation integrity
- Test with clean install
- Check for version conflicts

### Permission Issues
- File system permissions
- Network access permissions
- Database access rights
- API key validity

## Performance Debugging

### Slow Operations
- Profile to identify bottlenecks
- Check database queries (N+1 problem)
- Look for blocking operations
- Check network latency
- Monitor resource usage (CPU, memory, I/O)

### Memory Leaks
- Monitor memory usage over time
- Check for unclosed resources
- Look for accumulating data structures
- Use heap profilers

## For bug-investigator

### LOG FIRST - Never Skip
1. **Reproduce** - Get exact steps, capture complete error
2. **Log Everything** - Stack trace, system state, recent changes
3. **Analyze** - Use patterns above to find root cause
4. **Fix** - Minimal change addressing root cause
5. **Verify** - Original steps now work, no regressions

### Evidence Requirements
- Reproduction steps with exact commands
- Error logs and stack traces
- Git context (recent changes)
- Before/after comparison
- Verification that fix works

### When to Use Research
- Unfamiliar error patterns
- Complex system interactions
- Need external examples
- Best practices for fix approach

## Common Gotchas to Check
- Off-by-one errors in loops
- Null/undefined handling
- Async/await mistakes
- Race conditions
- Configuration mismatches
- Environment differences
- Caching issues
- Timezone problems
- Character encoding issues

## Confidence Scoring
- **90%+**: Clear root cause with evidence
- **70-89%**: Likely cause with supporting evidence
- **50-69%**: Hypothesis needs more verification
- **<50%**: Speculation, gather more evidence

## Memory Updates
If you discover a new debugging pattern or common gotcha:
- Add to patterns.md Common Gotchas section
- Document the pattern and solution
- Update activeContext.md with recent learnings`
  },
  {
    name: 'cc10x-code-review-patterns',
    description: 'Comprehensive code review criteria and patterns. Used by code-reviewer for quality, security, and performance analysis.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'reviewer',
      purpose: 'code-quality-standards',
      required: 'false'
    },
    content: `# Code Review Patterns

**Standard:** 80%+ confidence threshold. No vague feedback.

## Review Categories

### Security (OWASP Top 10)
- **Injection**: SQL, NoSQL, OS command, LDAP injection
- **Broken Authentication**: Weak credentials, session management
- **Sensitive Data Exposure**: Unencrypted data, weak crypto
- **XML External Entities**: XXE vulnerabilities
- **Broken Access Control**: Authorization bypass, privilege escalation
- **Security Misconfiguration**: Default credentials, verbose errors
- **Cross-Site Scripting (XSS)**: Reflected, stored, DOM-based
- **Insecure Deserialization**: Arbitrary code execution
- **Using Components with Known Vulnerabilities**: Outdated dependencies
- **Insufficient Logging & Monitoring**: No audit trails

### Performance
- **Algorithm Complexity**: O(n²) vs O(n log n), unnecessary nested loops
- **Database Queries**: N+1 problems, missing indexes, full table scans
- **Memory Usage**: Memory leaks, unnecessary allocations, large object retention
- **Network**: Excessive requests, no caching, large payloads
- **Caching**: Missing cache, improper cache invalidation, cache stampede

### Maintainability
- **Code Complexity**: Cyclomatic complexity > 10, long functions (>50 lines)
- **Naming**: Unclear names, abbreviations, inconsistent conventions
- **Duplication**: Copy-pasted code, similar functions
- **Comments**: Outdated comments, commented-out code, missing explanations
- **Structure**: Tight coupling, violation of single responsibility

### Reliability
- **Error Handling**: Empty catch blocks, swallowed exceptions, missing validation
- **Resource Management**: Unclosed connections, file handles, database connections
- **Race Conditions**: Unsynchronized shared state, async timing issues
- **Input Validation**: Missing validation, type confusion, boundary checks
- **Edge Cases**: Null handling, empty collections, extreme values

### Testing
- **Test Coverage**: Missing tests for critical paths
- **Test Quality**: Brittle tests, implementation testing vs behavior testing
- **Edge Case Coverage**: Missing boundary tests, error path tests
- **Mocking**: Over-mocking, under-mocking, integration test gaps

## Review Process

### 1. Initial Scan
- Look for obvious red flags (security, empty catches)
- Check file size and complexity
- Identify high-risk areas (auth, payments, data)

### 2. Deep Dive
- Read the code thoroughly
- Understand the intent and implementation
- Check against requirements
- Look for subtle issues

### 3. Issue Classification
- **CRITICAL**: Security vulnerabilities, data loss, crashes
- **MAJOR**: Functional bugs, performance issues, reliability problems  
- **MINOR**: Code quality, style, minor improvements
- **SUGGESTION**: Optional improvements, best practices

### 4. Confidence Assessment
For each issue:
- How certain are you? (0-100%)
- What evidence do you have?
- Could you be wrong? Why?
- Only report if ≥80% confidence

## Issue Reporting Format

### Critical Issues (≥80% Confidence)
- **[File:line]** Issue description (Confidence: XX%)
  - **Evidence**: [specific code pattern]
  - **Impact**: [what could go wrong, severity]
  - **Fix**: [specific recommendation with code example]
  - **CWE**: [relevant CWE identifier if security]

### Positive Feedback
- **[File:line]** What's done well
  - **Why it's good**: [explanation]
  - **Example for others**: [learning point]

## Specific Patterns to Check

### Security Patterns
- \`eval()\` usage
- SQL string concatenation
- Hardcoded passwords/keys
- Insecure direct object references
- Missing CSRF protection
- Excessive error information

### Code Smells
- Long parameter lists (>3-4 parameters)
- Large classes (>500 lines)
- God objects (know too much, do too much)
- Feature envy (method uses data from other class)
- Data clumps (same parameters passed together)

### Anti-Patterns
- Copy-paste programming
- Magic numbers/strings
- Deep nesting (>3 levels)
- Busy waiting
- Poltergeists (objects that exist only to pass data)

## For Different Workflows

### BUILD Workflow
- Review component-builder's implementation
- Check TDD compliance (tests first, green phase)
- Verify test coverage and quality
- Look for silent failures (coordinate with hunter)

### DEBUG Workflow
- Review bug-investigator's fix
- Ensure fix addresses root cause, not symptoms
- Check for side effects and regressions
- Verify fix doesn't introduce new issues

### REVIEW Workflow
- Comprehensive review of user-specified code
- Full analysis across all categories
- Provide actionable feedback with examples
- Consider business context and priorities

## Confidence Scoring Guidelines

### 90%+ Confidence
- Clear violation of established pattern
- Security vulnerability with proof of concept
- Test failure with reproducible steps
- Code that will definitely cause runtime error

### 70-89% Confidence
- Likely issue with strong evidence
- Performance problem that's measurable
- Code smell that violates best practices
- Potential edge case not handled

### 50-69% Confidence
- Possible issue, needs more investigation
- Style preference rather than problem
- Edge case that may not occur in practice
- Alternative approach that might be better

### <50% Confidence
- Speculation without evidence
- Personal preference
- "I would do it differently" without technical merit
- Hypothetical scenarios

## Only Report ≥80% Confidence
If confidence < 80%, either:
1. Gather more evidence to increase confidence
2. Don't include in critical issues
3. Maybe mention as "consideration" if very important

## Memory Notes
Include in your output:
- Security patterns discovered
- Performance issues found
- Code quality standards applied
- Any new review criteria for this project
- Patterns to add to patterns.md

## Verdict Logic
- **APPROVED**: No critical issues (≥80% confidence) found
- **CHANGES REQUESTED**: Critical issues must be addressed before approval
- Consider business impact and timeline when setting severity`
  },
  {
    name: 'cc10x-github-research',
    description: 'Research external packages, best practices, and implementation examples from GitHub. Used by planner and bug-investigator when needed.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'planner, investigator',
      purpose: 'external-research',
      required: 'false'
    },
    content: `# GitHub Research

**Purpose:** Find real-world examples, best practices, and proven solutions.

## When to Use Research

### Planner Triggers
- Unfamiliar technology or framework
- Complex integration patterns needed
- Need to evaluate multiple approaches
- Best practices for new domain
- Performance/security considerations

### Bug-investigator Triggers
- Exhausted local debugging (3+ attempts failed)
- External service error needing context
- Unusual error pattern requiring community knowledge
- Need to see how others solved similar issues

### User Explicit Requests
- "Research this approach"
- "Find examples on GitHub"
- "What are best practices for X?"
- "How do others handle Y?"

## Research Process

### 1. Define Search Query
- Be specific about technology and problem
- Include relevant keywords
- Consider synonyms and related terms
- Focus on recent, well-maintained solutions

### 2. Search Strategy
- Look for popular repositories (stars, recent activity)
- Check repository quality (documentation, tests, issues)
- Prefer solutions with active maintenance
- Consider multiple approaches

### 3. Evaluate Results
- Code quality and patterns
- Community adoption and feedback
- License compatibility
- Performance characteristics
- Security considerations

### 4. Synthesize Findings
- Compare different approaches
- Identify trade-offs
- Recommend based on project context
- Provide concrete examples

## Research Output Format

### Research Document
Save to: \`docs/research/YYYY-MM-DD-<topic>-research.md\`

Include:
- Search queries used
- Repositories examined (with links)
- Code examples found
- Analysis of approaches
- Recommendations with rationale

### Memory Updates
- Update activeContext.md with research reference
- Record key findings in patterns.md if reusable
- Update progress.md with research completion

## For Planner
1. Identify research needs during analysis phase
2. Use github-research skill to gather information
3. Synthesize findings into recommendations
4. Document research in plan

## For Bug-investigator
1. When stuck, request github-research
2. Focus on similar issues and solutions
3. Look for debugging approaches
4. Consider alternative implementations

## Quality Criteria
- **Relevance**: Matches the specific problem
- **Quality**: Well-maintained, good practices
- **Evidence**: Working code, tests, documentation
- **Community**: Adoption and positive feedback
- **Compatibility**: License and technology fit

## Avoid
- Outdated or unmaintained solutions
- Security anti-patterns
- Overly complex solutions for simple problems
- Solutions with restrictive licenses
- Code without proper attribution

## Attribution
Always attribute sources:
- Repository name and link
- Author/ maintainer
- License information
- Any modifications made

## Integration with Plan
Research findings should directly inform:
- Technology choices
- Architecture decisions
- Implementation approach
- Risk assessment

## Confidence in Research
- **High**: Multiple quality sources agree
- **Medium**: Limited sources but consistent
- **Low**: Single source or conflicting information
- Document confidence level in research document`
  },
  {
    name: 'cc10x-planning-patterns',
    description: 'Comprehensive planning methodology and structure. Used by planner to create detailed, actionable plans.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'planner',
      purpose: 'planning-methodology',
      required: 'false'
    },
    content: `# Planning Patterns

**Goal:** Create comprehensive, actionable plans with clear next steps.

## Planning Structure

### 1. Executive Summary
- Problem statement
- Proposed solution overview
- Key decisions and rationale
- Success criteria

### 2. Requirements Analysis
- Functional requirements
- Non-functional requirements (performance, security, scalability)
- Constraints and assumptions
- Dependencies and risks

### 3. Architecture & Design
- System architecture diagram (if applicable)
- Technology choices with rationale
- API design (endpoints, data models)
- Database schema (if applicable)
- Security considerations

### 4. Implementation Plan
#### Phase 1: Foundation
- Setup and configuration
- Core data models
- Basic infrastructure
- Success criteria

#### Phase 2: Core Features
- Primary functionality
- User-facing features
- Integration points
- Success criteria

#### Phase 3: Polish & Optimization
- Performance improvements
- Error handling
- Edge cases
- Documentation

#### Phase 4: Deployment & Monitoring
- Deployment strategy
- Monitoring setup
- Rollback plan
- Success criteria

### 5. Risk Assessment
- Technical risks and mitigation
- Timeline risks
- Resource constraints
- External dependencies

### 6. Testing Strategy
- Unit testing approach
- Integration testing
- End-to-end testing
- Performance testing
- Security testing

### 7. Research Needs
- Unfamiliar technologies to investigate
- Best practices to research
- Alternatives to evaluate
- Proof of concepts needed

## Planning Process

### 1. Clarify Requirements
Ask user questions to understand:
- What problem are we solving?
- Who are the users?
- What are the success criteria?
- What are the constraints?
- What's the timeline?

### 2. Analyze Current State
- Existing codebase structure
- Current technologies and patterns
- Team capabilities and experience
- Infrastructure and deployment

### 3. Explore Options
- Multiple architectural approaches
- Technology choices with trade-offs
- Implementation strategies
- Consider "do nothing" option

### 4. Make Decisions
- Document rationale for each decision
- Consider alternatives and why rejected
- Get user input on key decisions
- Record decisions in patterns.md

### 5. Create Actionable Steps
- Specific files to create/modify
- Exact commands to run
- Clear acceptance criteria
- Dependencies between steps

## Plan Quality Checklist

### Completeness
- [ ] All requirements addressed
- [ ] Dependencies identified
- [ ] Risks assessed with mitigation
- [ ] Success criteria defined

### Clarity
- [ ] Easy to understand for implementer
- [ ] Specific, actionable steps
- [ ] No ambiguous language
- [ ] Clear ownership and responsibilities

### Feasibility
- [ ] Realistic timeline
- [ ] Available resources match scope
- [ ] Technical feasibility confirmed
- [ ] Dependencies can be satisfied

### Testability
- [ ] Success criteria measurable
- [ ] Verification steps defined
- [ ] Acceptance criteria clear
- [ ] Rollback plan defined

## For Planner Agent

### Before Creating Plan
1. Load memory (activeContext, patterns, progress)
2. Ask clarifying questions if requirements unclear
3. Consider project context and constraints
4. Identify research needs early

### During Planning
1. Follow the structure above
2. Document decisions with rationale
3. Consider multiple approaches
4. Identify risks and mitigation
5. Create specific, actionable steps

### After Planning
1. Save plan to docs/plans/YYYY-MM-DD-<topic>-plan.md
2. Update activeContext.md with plan reference
3. Record key decisions in patterns.md
4. Set next steps in activeContext.md
5. Request research if needed (github-research skill)

## Plan Template
\`\`\`markdown
# [Plan Title]

## Executive Summary
[One paragraph overview]

## Requirements Analysis
- Functional: [list]
- Non-functional: [performance, security, etc.]
- Constraints: [timeline, budget, technical]

## Architecture Decisions
- [Decision]: [Choice] - [Rationale]
- [Decision]: [Choice] - [Rationale]

## Implementation Phases
### Phase 1: [Name]
- [ ] Task 1
- [ ] Task 2
- Success criteria: [measurable]

### Phase 2: [Name]
- [ ] Task 1
- [ ] Task 2
- Success criteria: [measurable]

## Risk Assessment
- [Risk]: [Mitigation strategy]

## Testing Strategy
- [Test type]: [Approach]

## Research Needs
- [Topic] - [Why needed]

## Success Criteria
- [Measurable outcome 1]
- [Measurable outcome 2]
\`\`\`

## Common Planning Mistakes
- ❌ Vague, non-actionable steps
- ❌ Missing dependencies between tasks
- ❌ No risk assessment
- ❌ Unclear success criteria
- ❌ Ignoring team capabilities
- ❌ No rollback or contingency plan

## Integration with Build
The plan should be detailed enough that component-builder can:
- Follow phases sequentially
- Understand exact files to modify
- Know test commands to run
- Follow specific code patterns
- Verify completion against success criteria

## Memory Updates
- activeContext.md: Add plan reference in References section
- patterns.md: Record architectural decisions
- progress.md: Create tasks from plan phases

## User Interaction
- Ask clarifying questions before finalizing
- Present options with pros/cons
- Get approval on key decisions
- Confirm understanding of constraints`
  },
  {
    name: 'cc10x-brainstorming',
    description: 'Creative ideation and exploration of multiple approaches. Used by planner during analysis phase.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'planner',
      purpose: 'creative-ideation',
      required: 'false'
    },
    content: `# Brainstorming

**Goal:** Generate multiple creative approaches before settling on solution.

## When to Brainstorm

### Early in Planning
- When problem is open-ended
- Multiple valid approaches exist
- Need innovative solutions
- Exploring design space

### When Stuck
- Standard approaches don't fit
- Constraints limit usual solutions
- Need breakthrough thinking
- Considering radical alternatives

## Brainstorming Rules

### 1. Defer Judgment
- No criticism during idea generation
- All ideas welcome, no matter how wild
- Quantity over quality initially
- Build on others' ideas

### 2. Encourage Wild Ideas
- Unconventional approaches
- "What if" scenarios
- Challenge assumptions
- Think beyond current constraints

### 3. Seek Combinations
- Hybrid approaches
- Adapt solutions from other domains
- Combine multiple ideas
- Look for synergies

### 4. Stay Focused
- Keep problem statement visible
- Don't wander to unrelated topics
- Timebox brainstorming sessions
- Return to core requirements

## Brainstorming Techniques

### Mind Mapping
- Start with central problem
- Branch out with sub-problems
- Add solutions to each branch
- Look for connections between branches

### SCAMPER
- **Substitute**: What can we replace?
- **Combine**: What can we merge?
- **Adapt**: What can we borrow from elsewhere?
- **Modify**: What can we change?
- **Put to other uses**: How else could this work?
- **Eliminate**: What can we remove?
- **Reverse**: What if we did the opposite?

### Worst Possible Idea
- Deliberately think of terrible solutions
- Then reverse or improve them
- Breaks mental set patterns
- Often leads to innovative approaches

### Analogies
- How would nature solve this?
- How would other industries solve this?
- What's the historical precedent?
- What's the opposite domain's approach?

## For Planner

### During Analysis Phase
1. **Define problem clearly** - What exactly are we solving?
2. **Generate multiple approaches** - At least 3-5 distinct options
3. **Explore each briefly** - High-level pros/cons
4. **Evaluate against criteria** - Fit requirements, constraints
5. **Select and refine** - Choose best approach, enhance it

### Documenting Brainstorming

#### Options Considered
For each approach:
- **Description**: How it works
- **Pros**: Advantages
- **Cons**: Disadvantages
- **Complexity**: Implementation difficulty
- **Risk**: Potential issues
- **Fit**: How well it matches requirements

#### Decision Rationale
- Why chosen approach is best
- Why others were rejected
- Trade-offs accepted
- Risks and mitigations

## Creative Constraints

### Technical Constraints
- Current technology stack
- Team expertise
- Infrastructure limitations
- Budget and timeline

### Business Constraints  
- User needs and preferences
- Regulatory requirements
- Market conditions
- Competitive landscape

### Design Constraints
- Performance requirements
- Security requirements
- Scalability needs
- Maintainability requirements

## Evaluation Criteria

### Feasibility
- Can we build this with current resources?
- Do we have the necessary expertise?
- Is timeline realistic?

### Effectiveness
- Does it solve the core problem?
- How well does it meet requirements?
- What's the user experience?

### Efficiency
- Resource usage (CPU, memory, network)
- Development and maintenance cost
- Operational complexity

### Adaptability
- How well does it handle change?
- Can it scale if needed?
- Is it extensible for future needs?

## Common Brainstorming Pitfalls

### ❌ Early Convergence
- Settling on first reasonable idea
- Not exploring alternatives
- Missing better solutions

### ❌ Idea Killing
- Criticizing during generation
- Dismissing "crazy" ideas too quickly
- Not building on others' thoughts

### ❌ Scope Creep
- Adding unrelated features
- Losing focus on core problem
- Trying to solve too many problems

### ❌ Analysis Paralysis
- Too much discussion, no decisions
- Fear of making wrong choice
- Infinite refinement

## Output for Planning

### Include in Plan Document
- Options considered with pros/cons
- Decision rationale
- Alternative approaches documented
- Room for future pivots

### Update Memory
- Record key insights in activeContext.md
- Document decision in patterns.md
- Note creative approaches for future reference

## Examples

### Problem: "Build a task tracker"
**Options:**
1. **Simple file-based** - JSON file, CLI interface
   - Pros: Simple, fast to build, no dependencies
   - Cons: No collaboration, limited features
2. **Web app with database** - Full-stack with PostgreSQL
   - Pros: Scalable, collaborative, rich features
   - Cons: Complex, longer timeline
3. **Git-based** - Use git as backend, markdown files
   - Pros: Version control, simple, portable
   - Cons: Limited querying, git conflicts possible

**Selected:** Web app with database (best fits scalability and collaboration needs)

### Problem: "Debug intermittent crash"
**Options:**
1. **Add more logging** - Instrument code extensively
2. **Binary search** - Disable features until crash stops
3. **Statistical profiling** - Run many times, analyze patterns
4. **Race condition detection** - Use specialized tools

**Selected:** Combination: Add logging + statistical profiling (most likely to catch intermittent issues)

## Next Steps After Brainstorming
1. Evaluate options against criteria
2. Select best approach
3. Create detailed implementation plan
4. Identify research needs for selected approach
5. Document decision rationale

Remember: The goal is not to find the "perfect" solution, but a "good enough" solution that can be implemented and improved upon.`
  },
  {
    name: 'cc10x-architecture-patterns',
    description: 'System design patterns, API design principles, and architectural decision records. Used by all agents for consistent architecture.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-agents',
      purpose: 'architecture-guidance',
      required: 'false'
    },
    content: `# Architecture Patterns

**Purpose:** Consistent system design and API patterns across the project.

## System Architecture Patterns

### Layered Architecture
- **Presentation Layer**: UI, API endpoints, CLI
- **Business Logic Layer**: Services, domain models, use cases
- **Data Access Layer**: Repositories, data mappers, ORM
- **Infrastructure Layer**: Databases, external services, frameworks

### Microservices
- Service boundaries by business capability
- API contracts between services
- Independent deployment
- Service discovery and configuration

### Event-Driven
- Publish-subscribe patterns
- Event sourcing for audit trails
- Async processing for scalability
- Eventual consistency models

## API Design Patterns

### RESTful Principles
- Resource-oriented design
- Proper HTTP methods (GET, POST, PUT, DELETE)
- Stateless operations
- HATEOAS for discoverability
- Versioning strategy

### GraphQL
- Schema-first design
- Resolvers for data fetching
- N+1 query optimization
- Caching strategies

### gRPC
- Protocol buffers for contracts
- Streaming for real-time
- Strong typing
- Performance optimization

## Data Architecture

### Database Design
- Normalization vs denormalization
- Indexing strategies
- Partitioning and sharding
- Migration strategies

### Caching Patterns
- Cache-aside pattern
- Write-through caching
- Cache invalidation strategies
- Multi-level caching

## Security Architecture

### Authentication
- OAuth 2.0 / OpenID Connect
- JWT token management
- Session management
- Multi-factor authentication

### Authorization
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Principle of least privilege
- Defense in depth

### Data Protection
- Encryption at rest and in transit
- Secrets management
- PII handling and GDPR compliance
- Audit logging

## Reliability Patterns

### Error Handling
- Retry with exponential backoff
- Circuit breaker pattern
- Bulkhead isolation
- Graceful degradation

### Observability
- Structured logging
- Distributed tracing
- Metrics collection
- Health checks

### Deployment
- Blue-green deployments
- Canary releases
- Feature flags
- Rollback strategies

## Code Organization

### Project Structure
```
src/
├── domain/          # Business logic, entities
├── application/     # Use cases, services
├── infrastructure/  # External services, databases
├── presentation/    # API, UI, CLI
└── shared/          # Common utilities
```

### Module Organization
- Feature-based modules
- Clear module boundaries
- Dependency direction (inner → outer)
- Interface segregation

## Decision Records (ADRs)

### Format
\`\`\`markdown
# ADR: [Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[Problem, constraints, forces]

## Decision
[What we decided]

## Consequences
[Positive and negative outcomes]

## Alternatives Considered
- [Alternative 1]: [Why rejected]
- [Alternative 2]: [Why rejected]
\`\`\`

### When to Create ADRs
- Significant architectural decisions
- Technology choices with trade-offs
- Pattern adoption or rejection
- Major refactoring decisions

## For All Agents

### Before Making Architectural Decisions
1. Check patterns.md for existing decisions
2. Consider established patterns in this project
3. Document new decisions in patterns.md
4. Update activeContext.md with decision context

### Consistency Rules
- Follow existing patterns unless there's a good reason not to
- Document deviations from patterns
- Consider migration path for inconsistencies
- Update patterns.md when establishing new conventions

### Common Gotchas
- Over-engineering for future requirements
- Premature optimization
- Ignoring operational concerns
- Underestimating complexity
- Not considering testing implications

## Technology Selection

### Evaluation Criteria
- **Fit**: Solves the problem effectively
- **Maturity**: Stable, well-tested, production-ready
- **Community**: Active development, good ecosystem
- **Learning Curve**: Team can become productive
- **Cost**: Licensing, hosting, maintenance
- **Compatibility**: Integrates with existing stack

### Decision Process
1. Define requirements and constraints
2. Research options (use github-research skill)
3. Create evaluation matrix
4. Proof of concept for top candidates
5. Final decision with rationale

## Performance Patterns

### Database
- Use appropriate indexes
- Avoid N+1 queries
- Connection pooling
- Query optimization

### Caching
- Cache expensive operations
- Implement cache invalidation
- Consider cache warming
- Use appropriate TTLs

### Async Processing
- Queue for long-running tasks
- Background job processing
- Event-driven communication
- Rate limiting

## Testing Architecture

### Test Pyramid
- Many unit tests (fast, isolated)
- Fewer integration tests (component interaction)
- Few end-to-end tests (full user journeys)

### Test Data Management
- Fixtures for consistent test data
- Database transactions for isolation
- Mock external dependencies
- Test environment parity

## Migration Patterns

### Database Migrations
- Versioned migration scripts
- Forward and backward compatibility
- Zero-downtime migrations
- Rollback procedures

### Code Migrations
- Strangler fig pattern for legacy replacement
- Feature flags for gradual rollout
- Deprecation strategies
- Compatibility layers

## Documentation

### Architecture Decision Records
- Store in docs/architecture/adr-XXX.md
- Link from patterns.md
- Keep updated with current state

### API Documentation
- OpenAPI/Swagger for REST APIs
- GraphQL schema documentation
- gRPC proto file comments
- Example requests/responses

### Code Documentation
- README for each module
- Inline comments for complex logic
- Architecture diagrams (mermaid, plantuml)
- Deployment guides

## For component-builder
- Follow established architecture patterns
- Ask if unsure about architectural approach
- Document any deviations from patterns
- Update patterns.md with new conventions

## For planner
- Consider architecture in planning phase
- Document architectural decisions in plan
- Research architectural patterns if needed
- Create ADRs for significant decisions

## For code-reviewer
- Check adherence to architectural patterns
- Flag architectural violations
- Consider consistency with existing code
- Suggest pattern improvements

## Memory Updates
When architectural decisions are made:
- Add to patterns.md Architecture Decisions section
- Reference in activeContext.md Decisions
- Create ADR document if significant
- Update relevant module documentation`
  },
  {
    name: 'cc10x-frontend-patterns',
    description: 'Frontend development patterns, accessibility, and UX best practices. Used by all agents for UI/UX work.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-agents',
      purpose: 'frontend-guidance',
      required: 'false'
    },
    content: `# Frontend Patterns

**Focus:** User experience, accessibility, performance, and maintainability.

## UI/UX Principles

### User-Centered Design
- Clear visual hierarchy
- Consistent interaction patterns
- Immediate feedback for user actions
- Error prevention and recovery
- Progressive disclosure of complexity

### Accessibility (WCAG 2.1 AA)
- **Perceivable**: Text alternatives, captions, color contrast
- **Operable**: Keyboard navigation, sufficient time, no seizures
- **Understandable**: Readable text, predictable behavior
- **Robust**: Compatible with assistive technologies

### Performance
- First Contentful Paint < 1s
- Time to Interactive < 3s
- Core Web Vitals optimization
- Efficient bundle size
- Lazy loading for non-critical resources

## Component Patterns

### Atomic Design
- **Atoms**: Basic elements (buttons, inputs, labels)
- **Molecules**: Simple component combinations
- **Organisms**: Complex UI sections
- **Templates**: Page layouts
- **Pages**: Specific instances with data

### Component API Design
- Clear, consistent props interface
- Sensible defaults
- Composition over configuration
- Prop drilling avoidance (context/state management)
- Type safety (TypeScript)

### State Management
- Local state for component-specific data
- Shared state for cross-component data
- Server state for API data (React Query, SWR)
- URL state for shareable links

## CSS Patterns

### CSS Architecture
- BEM (Block Element Modifier) naming
- CSS Modules for scoping
- CSS-in-JS for dynamic styles
- Utility-first (Tailwind) for consistency

### Responsive Design
- Mobile-first approach
- Breakpoint strategy (sm, md, lg, xl)
- Fluid typography and spacing
- Touch-friendly targets (44x44px minimum)

### Theming
- CSS custom properties for theming
- Design tokens for consistency
- Dark mode support
- Accessibility considerations (high contrast)

## JavaScript/TypeScript Patterns

### React Patterns
- Functional components with hooks
- Custom hooks for reusable logic
- Compound components for flexibility
- Render props for behavior sharing
- Error boundaries for error handling

### Vue Patterns
- Composition API for logic reuse
- Provide/inject for dependency injection
- Scoped slots for flexibility
- Mixins for cross-cutting concerns

### Angular Patterns
- Services for business logic
- Dependency injection
- RxJS for reactive programming
- NgModules for organization

## Performance Patterns

### Code Splitting
- Route-based splitting
- Component-based splitting
- Dynamic imports for heavy dependencies
- Preloading critical resources

### Image Optimization
- Modern formats (WebP, AVIF)
- Responsive images (srcset)
- Lazy loading for below-the-fold
- Image CDN with optimization

### Bundle Optimization
- Tree shaking for unused code
- Code minification and compression
- Dependency analysis (webpack-bundle-analyzer)
- Vendor chunking for caching

## Testing Frontend

### Unit Testing
- Component rendering and props
- User interactions (click, type, etc.)
- State changes and side effects
- Utility functions and hooks

### Integration Testing
- Component composition
- Data flow between components
- API integration with mocks
- State management interactions

### End-to-End Testing
- Critical user journeys
- Cross-browser compatibility
- Mobile responsiveness
- Performance budgets

### Testing Tools
- Jest/Vitest for unit tests
- React Testing Library/Vue Test Utils
- Cypress/Playwright for E2E
- Storybook for visual testing

## Accessibility Patterns

### Semantic HTML
- Proper heading hierarchy (h1-h6)
- Landmark elements (nav, main, footer)
- Alt text for images
- Form labels and descriptions

### Keyboard Navigation
- Logical tab order
- Visible focus indicators
- Skip links for navigation
- Keyboard shortcuts with alternatives

### Screen Reader Support
- ARIA labels and descriptions
- Live regions for dynamic content
- Proper table markup
- Form validation announcements

### Color and Contrast
- Minimum 4.5:1 contrast for normal text
- 3:1 for large text
- Color not sole information carrier
- High contrast mode support

## Internationalization (i18n)

### Text Management
- Externalize all user-facing strings
- Support for right-to-left (RTL) languages
- Date, time, number formatting
- Currency and unit localization

### Layout Considerations
- Text expansion for translations
- Cultural considerations for icons/colors
- Localized images and assets
- Font support for different scripts

## Error Handling

### User-Friendly Errors
- Clear, actionable error messages
- Appropriate error severity
- Recovery suggestions
- Technical details in logs, not UI

### Loading States
- Skeleton screens for content
- Progress indicators for operations
- Timeout handling
- Retry mechanisms

### Form Validation
- Real-time validation feedback
- Clear error messages
- Accessible error announcements
- Submission prevention for invalid data

## Security Patterns

### XSS Prevention
- Input sanitization
- Output encoding
- Content Security Policy (CSP)
- Avoid innerHTML with user data

### CSRF Protection
- Anti-CSRF tokens
- SameSite cookies
- CORS configuration
- State-changing operations require POST

### Data Protection
- No sensitive data in URLs
- Secure cookie flags (HttpOnly, Secure)
- Client-side encryption for sensitive data
- Secure storage (avoid localStorage for tokens)

## For component-builder
- Follow established frontend patterns
- Ensure accessibility from the start
- Write tests for user interactions
- Optimize performance (lazy loading, code splitting)
- Use semantic HTML and ARIA when needed

## For code-reviewer
- Check accessibility compliance
- Verify performance implications
- Review security considerations
- Ensure responsive design
- Validate error handling

## Common Frontend Gotchas
- ❌ Missing alt text on images
- ❌ Poor color contrast
- ❌ No keyboard navigation
- ❌ Large bundle sizes
- ❌ Missing error boundaries
- ❌ Unoptimized images
- ❌ No loading states
- ❌ Inline styles with user data (XSS risk)
- ❌ Missing form labels
- ❌ Fixed heights causing overflow

## Memory Updates
When frontend patterns are established or discovered:
- Add to patterns.md Code Conventions section
- Document component patterns and APIs
- Record accessibility requirements
- Note performance optimization techniques

## Tools and Libraries
- **Frameworks**: React, Vue, Angular, Svelte
- **Styling**: Tailwind, CSS Modules, styled-components
- **State**: Redux, Zustand, React Query, Pinia
- **Testing**: Jest, Vitest, Cypress, Playwright
- **Performance**: Lighthouse, WebPageTest, Bundle analyzers
- **Accessibility**: axe, Lighthouse, WAVE

## Browser Support
- Define target browsers in project
- Use feature detection (Modernizr)
- Polyfills for missing features
- Graceful degradation strategy

## Progressive Web Apps
- Service workers for offline
- Web app manifest
- Installability criteria
- Push notifications

## Design Systems
- Component library consistency
- Design token management
- Documentation with Storybook
- Versioning and backward compatibility`
  },
  {
    name: 'cc10x-session-memory-opencode',
    description: 'OpenCode-specific memory persistence patterns and session management. Adapts cc10x memory system to OpenCode context.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'router, all-agents',
      purpose: 'opencode-memory-adaptation',
      required: 'true'
    },
    content: `# OpenCode Session Memory Adaptation

**Purpose:** Adapt cc10x memory system to work with OpenCode's session management.

## OpenCode Context

### Session Management
- OpenCode manages conversation sessions
- Context compaction occurs automatically
- Memory must survive compaction
- Plugin hooks available for session events

### File Operations
- OpenCode provides Read, Write, Edit tools
- Permission system controls access
- Some operations are permission-free
- Memory operations should be permission-free

## Adaptation Strategy

### Memory Location
Keep same location for compatibility:
- \`.claude/cc10x/activeContext.md\`
- \`.claude/cc10x/patterns.md\`
- \`.claude/cc10x/progress.md\`

### Permission-Free Operations
Ensure these operations don't ask permission:
- Creating memory directory: \`mkdir -p .claude/cc10x\`
- Reading memory files: \`Read(file_path="...")\`
- Writing new memory files: \`Write(file_path="...", content="...")\`
- Editing existing memory: \`Edit(file_path="...", old_string="...", new_string="...")\`

### Session Hooks
Use OpenCode plugin hooks:
- \`session.created\` - Initialize memory directory
- \`session.compacted\` - Save checkpoint before compaction
- \`message.received\` - Load memory for new requests
- \`agent.completed\` - Accumulate memory notes

## OpenCode-Specific Patterns

### Task Integration
- Use OpenCode Task tool for workflow orchestration
- Mirror task status in progress.md
- Task IDs should be preserved across sessions
- Resume workflows from task state

### Agent Coordination
- Primary agents can invoke subagents
- Use Task tool for parallel execution
- Pass context between agents via task description
- Collect results from multiple agents

### Tool Usage
- Prefer Read over Bash(cat) for files
- Use Edit not Write for existing files
- Separate commands (no && chaining) for permission-free
- Capture exit codes for verification

## Migration from Claude Code

### Existing Memory Files
- Copy .claude/cc10x/ directory to project
- Files are compatible as-is
- Plugin will auto-heal missing sections
- No conversion needed

### Agent Differences
- Claude Code agents vs OpenCode agents
- Different tool interfaces
- Different permission models
- Similar but not identical execution

### Skill Loading
- Claude skills vs OpenCode skills
- Different discovery mechanisms
- Plugin provides compatibility layer
- Skills loaded via plugin registration

## OpenCode Configuration

### Required Permissions
\`\`\`json
{
  "permission": {
    "bash": {
      "mkdir -p .claude/cc10x": "allow",
      "git status": "allow",
      "git diff": "allow"
    },
    "edit": "allow",
    "write": "allow"
  }
}
\`\`\`

### Agent Configuration
\`\`\`json
{
  "agent": {
    "cc10x-component-builder": {
      "color": "green",
      "temperature": 0.3
    }
  }
}
\`\`\`

### Plugin Configuration
\`\`\`json
{
  "plugin": ["opencode-cc10x"],
  "permission": {
    "skill": {
      "cc10x:*": "allow"
    }
  }
}
\`\`\`

## Differences from Claude Code

| Aspect | Claude Code | OpenCode |
|--------|-------------|----------|
| Plugin format | Marketplace plugin | npm package |
| Agent invocation | Custom system | Task tool |
| Memory operations | Permission-free by default | Need permission config |
| Task system | Claude Code Tasks | OpenCode Task tool |
| Skills | Claude skills | OpenCode skills |
| Hooks | Not applicable | Plugin hooks available |

## Troubleshooting

### Memory Not Persisting
- Check directory permissions
- Verify Edit tool is permission-free for memory files
- Ensure plugin hooks are firing
- Check OpenCode logs for errors

### Agents Not Available
- Verify plugin loaded successfully
- Check agent configuration in opencode.json
- Restart OpenCode after plugin install
- Run \`opencode agent list\` to see available agents

### Permission Prompts
- Configure permissions in opencode.json
- Use Edit not Write for existing files
- Separate commands (no && chaining)
- Memory paths must match exactly

### Task System Issues
- Check Task tool permissions
- Verify task creation/update calls
- Ensure task IDs are preserved
- Check task status synchronization

## Best Practices

### Memory Operations
1. Always use separate tool calls (no chaining)
2. Read before Edit to get current content
3. Use stable anchors for Edit operations
4. Verify changes with Read-back
5. Update Last Updated timestamp

### Agent Communication
1. Use task system for coordination
2. Pass context via task description
3. Update task status appropriately
4. Handle parallel execution correctly
5. Collect results from multiple agents

### Error Handling
1. Don't let plugin errors crash OpenCode
2. Log errors appropriately
3. Provide fallback behavior
4. Graceful degradation when features unavailable

## Future Enhancements

### OpenCode Features
- Leverage new OpenCode capabilities as they become available
- Integrate with OpenCode's native memory if available
- Use OpenCode's agent system more fully
- Support OpenCode's permission model improvements

### Performance
- Cache memory reads during workflow
- Batch memory updates
- Optimize file operations
- Reduce plugin overhead

### Monitoring
- Add metrics for workflow execution
- Track success/failure rates
- Performance monitoring
- User feedback collection`
  },
  {
    name: 'cc10x-botanical-garden',
    description: 'Fresh and organic theme with vibrant garden-inspired colors. For lively presentations.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Botanical Garden Theme

A fresh and organic theme featuring vibrant garden-inspired colors for lively presentations.

## Color Palette

- **Fern Green**: #4a7c59 - Rich natural green
- **Marigold**: #f9a620 - Bright floral accent  
- **Terracotta**: #b7472a - Earthy warm tone
- **Cream**: #f5f3ed - Soft neutral backgrounds

## Typography

- **Headers**: DejaVu Serif Bold
- **Body Text**: DejaVu Sans

## Best Used For

Garden centers, food presentations, farm-to-table content, botanical brands, natural products.

## Usage

Apply this theme to presentations, documents, and artifacts for a fresh, organic aesthetic.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #4a7c59;
  --accent-color: #f9a620;
  --secondary-color: #b7472a;
  --background-color: #f5f3ed;
  --text-color: #333333;
  --header-font: 'DejaVu Serif', serif;
  --body-font: 'DejaVu Sans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Garden and landscape presentations
- Organic food and farm products
- Environmental and sustainability content
- Natural beauty and wellness brands
- Farmers markets and local food scenes`
  },
  {
    name: 'cc10x-midnight-galaxy',
    description: 'Dramatic and cosmic theme with deep purples and mystical tones for impactful presentations.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Midnight Galaxy Theme

A dramatic and cosmic theme with deep purples and mystical tones for impactful presentations.

## Color Palette

- **Deep Purple**: #2b1e3e - Rich dark base
- **Cosmic Blue**: #4a4e8f - Mystical mid-tone
- **Lavender**: #a490c2 - Soft accent color
- **Silver**: #e6e6fa - Light highlights and text

## Typography

- **Headers**: FreeSans Bold
- **Body Text**: FreeSans

## Best Used For

Entertainment industry, gaming presentations, nightlife venues, luxury brands, creative agencies.

## Usage

Apply this theme for dramatic, high-impact presentations with a cosmic aesthetic.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #2b1e3e;
  --accent-color: #4a4e8f;
  --secondary-color: #a490c2;
  --background-color: #1a1a2e;
  --text-color: #e6e6fa;
  --header-font: 'FreeSans', sans-serif;
  --body-font: 'FreeSans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Gaming and entertainment presentations
- Nightclub and venue promotions
- Luxury brand showcases
- Creative agency pitches
- Cosmic and space-themed content`
  },
  {
    name: 'cc10x-arctic-frost',
    description: 'Cool and crisp winter-inspired theme conveying clarity, precision, and professionalism.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Arctic Frost Theme

A cool and crisp winter-inspired theme that conveys clarity, precision, and professionalism.

## Color Palette

- **Ice Blue**: #d4e4f7 - Light backgrounds and highlights
- **Steel Blue**: #4a6fa5 - Primary accent color
- **Silver**: #c0c0c0 - Metallic accent elements
- **Crisp White**: #fafafa - Clean backgrounds and text

## Typography

- **Headers**: DejaVu Sans Bold
- **Body Text**: DejaVu Sans

## Best Used For

Healthcare presentations, technology solutions, winter sports, clean tech, pharmaceutical content.

## Usage

Apply this theme for professional, clean presentations with a cool, precise aesthetic.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #4a6fa5;
  --accent-color: #d4e4f7;
  --secondary-color: #c0c0c0;
  --background-color: #fafafa;
  --text-color: #333333;
  --header-font: 'DejaVu Sans', sans-serif;
  --body-font: 'DejaVu Sans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Medical and healthcare presentations
- Technology and software solutions
- Winter sports and outdoor equipment
- Clean technology and sustainability
- Pharmaceutical and research content`
  },
  {
    name: 'cc10x-desert-rose',
    description: 'Soft and sophisticated theme with dusty, muted tones perfect for elegant presentations.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Desert Rose Theme

A soft and sophisticated theme with dusty, muted tones perfect for elegant presentations.

## Color Palette

- **Dusty Rose**: #d4a5a5 - Soft primary color
- **Clay**: #b87d6d - Earthy accent
- **Sand**: #e8d5c4 - Warm neutral backgrounds
- **Deep Burgundy**: #5d2e46 - Rich dark contrast

## Typography

- **Headers**: FreeSans Bold
- **Body Text**: FreeSans

## Best Used For

Fashion presentations, beauty brands, wedding planning, interior design, boutique businesses.

## Usage

Apply this theme for elegant, sophisticated presentations with warm, muted colors.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #d4a5a5;
  --accent-color: #b87d6d;
  --secondary-color: #5d2e46;
  --background-color: #e8d5c4;
  --text-color: #5d2e46;
  --header-font: 'FreeSans', sans-serif;
  --body-font: 'FreeSans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Fashion and beauty presentations
- Wedding and event planning
- Interior design and decor
- Boutique and luxury brands
- Elegant lifestyle content`
  },
  {
    name: 'cc10x-forest-canopy',
    description: 'Natural and grounded theme featuring earth tones inspired by dense forest environments.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Forest Canopy Theme

A natural and grounded theme featuring earth tones inspired by dense forest environments.

## Color Palette

- **Forest Green**: #2d4a2b - Primary dark green
- **Sage**: #7d8471 - Muted green accent
- **Olive**: #a4ac86 - Light accent color
- **Ivory**: #faf9f6 - Backgrounds and text

## Typography

- **Headers**: FreeSerif Bold
- **Body Text**: FreeSans

## Best Used For

Environmental presentations, sustainability reports, outdoor brands, wellness content, organic products.

## Usage

Apply this theme for natural, earthy presentations with forest-inspired colors.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #2d4a2b;
  --accent-color: #7d8471;
  --secondary-color: #a4ac86;
  --background-color: #faf9f6;
  --text-color: #2d4a2b;
  --header-font: 'FreeSerif', serif;
  --body-font: 'FreeSans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Environmental and conservation presentations
- Sustainability and eco-friendly brands
- Outdoor and adventure content
- Wellness and natural health
- Organic and natural products`
  },
  {
    name: 'cc10x-golden-hour',
    description: 'Rich and warm autumnal palette creating an inviting and sophisticated atmosphere.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Golden Hour Theme

A rich and warm autumnal palette that creates an inviting and sophisticated atmosphere.

## Color Palette

- **Mustard Yellow**: #f4a900 - Bold primary accent
- **Terracotta**: #c1666b - Warm secondary color
- **Warm Beige**: #d4b896 - Neutral backgrounds
- **Chocolate Brown**: #4a403a - Dark text and anchors

## Typography

- **Headers**: FreeSans Bold
- **Body Text**: FreeSans

## Best Used For

Restaurant presentations, hospitality brands, fall campaigns, cozy lifestyle content, artisan products.

## Usage

Apply this theme for warm, inviting presentations with rich autumnal colors.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #f4a900;
  --accent-color: #c1666b;
  --secondary-color: #4a403a;
  --background-color: #d4b896;
  --text-color: #4a403a;
  --header-font: 'FreeSans', sans-serif;
  --body-font: 'FreeSans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Restaurant and food presentations
- Hospitality and travel brands
- Fall and autumn campaigns
- Cozy lifestyle content
- Artisan and handcrafted products`
  },
  {
    name: 'cc10x-tech-innovation',
    description: 'Bold and modern theme with high-contrast colors perfect for cutting-edge technology presentations.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Tech Innovation Theme

A bold and modern theme with high-contrast colors perfect for cutting-edge technology presentations.

## Color Palette

- **Electric Blue**: #0066ff - Vibrant primary accent
- **Neon Cyan**: #00ffff - Bright highlight color
- **Dark Gray**: #1e1e1e - Deep backgrounds
- **White**: #ffffff - Clean text and contrast

## Typography

- **Headers**: DejaVu Sans Bold
- **Body Text**: DejaVu Sans

## Best Used For

Tech startups, software launches, innovation showcases, AI/ML presentations, digital transformation content.

## Usage

Apply this theme for high-impact technology presentations with bold, modern colors.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #0066ff;
  --accent-color: #00ffff;
  --background-color: #1e1e1e;
  --text-color: #ffffff;
  --header-font: 'DejaVu Sans', sans-serif;
  --body-font: 'DejaVu Sans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Technology startup presentations
- Software product launches
- AI and machine learning showcases
- Digital transformation initiatives
- Innovation and R&D content`
  },
  {
    name: 'cc10x-ocean-depths',
    description: 'Professional and calming maritime theme evoking serenity of deep ocean waters.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Ocean Depths Theme

A professional and calming maritime theme that evokes the serenity of deep ocean waters.

## Color Palette

- **Deep Navy**: #1a2332 - Primary background color
- **Teal**: #2d8b8b - Accent color for highlights and emphasis
- **Seafoam**: #a8dadc - Secondary accent for lighter elements
- **Cream**: #f1faee - Text and light backgrounds

## Typography

- **Headers**: DejaVu Sans Bold
- **Body Text**: DejaVu Sans

## Best Used For

Corporate presentations, financial reports, professional consulting decks, trust-building content.

## Usage

Apply this theme for professional, trustworthy presentations with maritime-inspired colors.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #1a2332;
  --accent-color: #2d8b8b;
  --secondary-color: #a8dadc;
  --background-color: #f1faee;
  --text-color: #1a2332;
  --header-font: 'DejaVu Sans', sans-serif;
  --body-font: 'DejaVu Sans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Corporate and business presentations
- Financial reports and analysis
- Consulting and professional services
- Trust and security focused content
- Maritime and ocean-related themes`
  },
  {
    name: 'cc10x-sunset-boulevard',
    description: 'Warm and vibrant theme inspired by golden hour sunsets, perfect for energetic and creative presentations.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Sunset Boulevard Theme

A warm and vibrant theme inspired by golden hour sunsets, perfect for energetic and creative presentations.

## Color Palette

- **Burnt Orange**: #e76f51 - Primary accent color
- **Coral**: #f4a261 - Secondary warm accent
- **Warm Sand**: #e9c46a - Highlighting and backgrounds
- **Deep Purple**: #264653 - Dark contrast and text

## Typography

- **Headers**: DejaVu Serif Bold
- **Body Text**: DejaVu Sans

## Best Used For

Creative pitches, marketing presentations, lifestyle brands, event promotions, inspirational content.

## Usage

Apply this theme for energetic, creative presentations with warm sunset colors.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #e76f51;
  --accent-color: #f4a261;
  --secondary-color: #e9c46a;
  --background-color: #264653;
  --text-color: #e9c46a;
  --header-font: 'DejaVu Serif', serif;
  --body-font: 'DejaVu Sans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Creative and marketing presentations
- Lifestyle and entertainment brands
- Event and promotion materials
- Inspirational and motivational content
- Sunset and warm aesthetic designs`
  },
  {
    name: 'cc10x-modern-minimalist',
    description: 'Clean and contemporary theme with sophisticated grayscale palette for maximum versatility.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Modern Minimalist Theme

A clean and contemporary theme with a sophisticated grayscale palette for maximum versatility.

## Color Palette

- **Charcoal**: #36454f - Primary dark color
- **Slate Gray**: #708090 - Medium gray for accents
- **Light Gray**: #d3d3d3 - Backgrounds and dividers
- **White**: #ffffff - Text and clean backgrounds

## Typography

- **Headers**: DejaVu Sans Bold
- **Body Text**: DejaVu Sans

## Best Used For

Tech presentations, architecture portfolios, design showcases, modern business proposals, data visualization.

## Usage

Apply this theme for clean, professional presentations with timeless grayscale design.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #36454f;
  --accent-color: #708090;
  --secondary-color: #d3d3d3;
  --background-color: #ffffff;
  --text-color: #36454f;
  --header-font: 'DejaVu Sans', sans-serif;
  --body-font: 'DejaVu Sans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Technology and software presentations
- Architecture and design portfolios
- Business proposals and reports
- Data visualization and analytics
- Modern and minimalist aesthetic content`
  },
  {
    name: 'cc10x-midnight-galaxy-theme',
    description: 'Dramatic and cosmic theme with deep purples and mystical tones for impactful presentations.',
    license: 'MIT',
    compatibility: 'opencode',
    metadata: {
      audience: 'all-users',
      purpose: 'visual-theme',
      category: 'theme'
    },
    content: `# Midnight Galaxy Theme

A dramatic and cosmic theme with deep purples and mystical tones for impactful presentations.

## Color Palette

- **Deep Purple**: #2b1e3e - Rich dark base
- **Cosmic Blue**: #4a4e8f - Mystical mid-tone
- **Lavender**: #a490c2 - Soft accent color
- **Silver**: #e6e6fa - Light highlights and text

## Typography

- **Headers**: FreeSans Bold
- **Body Text**: FreeSans

## Best Used For

Entertainment industry, gaming presentations, nightlife venues, luxury brands, creative agencies.

## Usage

Apply this theme for dramatic, cosmic presentations with deep purple tones.

## CSS Variables

\`\`\`css
:root {
  --primary-color: #2b1e3e;
  --accent-color: #4a4e8f;
  --secondary-color: #a490c2;
  --background-color: #1a1a2e;
  --text-color: #e6e6fa;
  --header-font: 'FreeSans', sans-serif;
  --body-font: 'FreeSans', sans-serif;
}
\`\`\`

## Examples

Perfect for:
- Gaming and entertainment presentations
- Nightclub and venue promotions
- Luxury brand showcases
- Creative agency pitches
- Cosmic and space-themed content`
  }
];