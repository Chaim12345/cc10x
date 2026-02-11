export type WorkflowType = 'BUILD' | 'DEBUG' | 'REVIEW' | 'PLAN';

export interface DetectionResult {
  intent: WorkflowType;
  confidence: number;
  reasoning: string;
  keywords: string[];
}

// Priority order: ERROR signals always win
const INTENT_PRIORITY: WorkflowType[] = ['DEBUG', 'PLAN', 'REVIEW', 'BUILD'];

const INTENT_KEYWORDS: Record<WorkflowType, string[]> = {
  'DEBUG': [
    'error', 'bug', 'fix', 'broken', 'crash', 'fail', 'debug', 'troubleshoot',
    'issue', 'problem', 'doesn\'t work', 'not working', 'exception', 'traceback',
    'stack trace', 'panic', 'segfault', 'syntax error', 'runtime error'
  ],
  'PLAN': [
    'plan', 'design', 'architect', 'roadmap', 'strategy', 'spec', 'before we build',
    'how should we', 'what\'s the approach', 'proposal', 'recommendation',
    'should we use', 'options', 'alternatives', 'research', 'investigate'
  ],
  'REVIEW': [
    'review', 'audit', 'check', 'analyze', 'assess', 'what do you think',
    'is this good', 'evaluate', 'inspect', 'examine', 'critique',
    'feedback', 'suggestions', 'improve', 'optimize'
  ],
  'BUILD': [
    'build', 'implement', 'create', 'make', 'write', 'add', 'develop', 'code',
    'feature', 'component', 'app', 'application', 'module', 'class', 'function',
    'endpoint', 'api', 'interface', 'service', 'generate', 'scaffold'
  ]
};

export function detectIntent(message: string, memory?: any): DetectionResult {
  const lowerMessage = message.toLowerCase();
  const detectedKeywords: string[] = [];
  const intentScores: Record<WorkflowType, number> = {
    'BUILD': 0,
    'DEBUG': 0, 
    'REVIEW': 0,
    'PLAN': 0
  };

  // Score each intent based on keyword matches
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        intentScores[intent as WorkflowType]++;
        detectedKeywords.push(keyword);
      }
    }
  }

  // Apply priority rules
  let selectedIntent: WorkflowType = 'BUILD'; // default
  let maxScore = intentScores['BUILD'];

  // Check for DEBUG priority (error signals always win)
  if (intentScores['DEBUG'] > 0) {
    selectedIntent = 'DEBUG';
    maxScore = intentScores['DEBUG'];
  } else {
    // For other intents, pick highest scoring with priority tie-breaking
    for (const intent of INTENT_PRIORITY) {
      if (intent === 'DEBUG') continue; // already handled
      
      const score = intentScores[intent];
      if (score > maxScore || (score === maxScore && INTENT_PRIORITY.indexOf(intent) < INTENT_PRIORITY.indexOf(selectedIntent))) {
        selectedIntent = intent;
        maxScore = score;
      }
    }
  }

  // Calculate confidence based on score and message length
  const totalPossibleKeywords = INTENT_KEYWORDS[selectedIntent].length;
  const confidence = Math.min(100, Math.round((intentScores[selectedIntent] / Math.max(1, totalPossibleKeywords)) * 100));

  // Check memory for context clues
  const memoryContext = analyzeMemoryContext(memory, selectedIntent);
  if (memoryContext.suggestedIntent && memoryContext.suggestedIntent !== selectedIntent) {
    // If memory strongly suggests different intent, adjust
    if (memoryContext.confidence > confidence) {
      selectedIntent = memoryContext.suggestedIntent;
    }
  }

  return {
    intent: selectedIntent,
    confidence: confidence,
    reasoning: generateReasoning(selectedIntent, detectedKeywords, memoryContext),
    keywords: detectedKeywords
  };
}

function analyzeMemoryContext(memory?: any, currentIntent?: WorkflowType): { suggestedIntent?: WorkflowType; confidence: number } {
  if (!memory) return { confidence: 0 };
  
  // Check active context for workflow hints
  const activeContext = memory.activeContext || '';
  const patterns = memory.patterns || '';
  const progress = memory.progress || '';
  
  const combinedContext = `${activeContext} ${patterns} ${progress}`.toLowerCase();
  
  // Look for workflow-specific patterns in memory
  if (combinedContext.includes('debugging') || combinedContext.includes('investigating')) {
    return { suggestedIntent: 'DEBUG', confidence: 70 };
  }
  if (combinedContext.includes('planning') || combinedContext.includes('design')) {
    return { suggestedIntent: 'PLAN', confidence: 70 };
  }
  if (combinedContext.includes('reviewing') || combinedContext.includes('audit')) {
    return { suggestedIntent: 'REVIEW', confidence: 70 };
  }
  if (combinedContext.includes('building') || combinedContext.includes('implementing')) {
    return { suggestedIntent: 'BUILD', confidence: 70 };
  }
  
  return { confidence: 0 };
}

function generateReasoning(intent: WorkflowType, keywords: string[], memoryContext: any): string {
  const reasoningParts: string[] = [];
  
  if (keywords.length > 0) {
    reasoningParts.push(`Detected keywords: ${keywords.slice(0, 3).join(', ')}`);
  }
  
  if (memoryContext.suggestedIntent) {
    reasoningParts.push(`Memory context suggests ${memoryContext.suggestedIntent} workflow`);
  }
  
  reasoningParts.push(`Selected ${intent} workflow based on priority rules`);
  
  return reasoningParts.join('. ');
}

// Export for use in other modules
export const INTENT_DETECTION = {
  detectIntent,
  INTENT_PRIORITY,
  INTENT_KEYWORDS
};