export { integration_verifier } from './agents/integration-verifier.js'
export { bug_investigator } from './agents/bug-investigator.js'
export { component_builder } from './agents/component-builder.js'
export { silent_failure_hunter } from './agents/silent-failure-hunter.js'
export { planner } from './agents/planner.js'
export { code_reviewer } from './agents/code-reviewer.js'

export const agents = {
  'integration-verifier': integration_verifier,
  'bug-investigator': bug_investigator,
  'component-builder': component_builder,
  'silent-failure-hunter': silent_failure_hunter,
  'planner': planner,
  'code-reviewer': code_reviewer
};
