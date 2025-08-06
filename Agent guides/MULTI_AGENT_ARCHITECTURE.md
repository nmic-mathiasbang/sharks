# 🎯 Multi-Agent Pitch Analysis System

## Overview

This system implements a sophisticated multi-agent architecture where specialized AI agents collaborate to analyze business pitches through structured discussions. Based on the [OpenAI Agents JS framework](https://context7.com/openai/openai-agents-js/llms.txt), it leverages agent orchestration, handoffs, and autonomous conversations.

## 🤖 Agent Architecture

### **Specialized Agents**

1. **Business Model Analyst** 🏢
   - Revenue streams and scalability
   - Value proposition clarity
   - Customer segments and market fit
   - Cost structure and unit economics

2. **Market & Competition Analyst** 📊
   - Market size and growth potential
   - Competitive landscape analysis
   - Customer acquisition strategies
   - Industry dynamics and timing

3. **Financial & Growth Analyst** 💰
   - Financial projections and assumptions
   - Growth metrics and KPIs
   - Capital efficiency and funding needs
   - Investment risks and returns

4. **Team & Execution Analyst** 👥
   - Team composition and expertise
   - Founder-market fit assessment
   - Execution capabilities and track record
   - Operational scalability

5. **Pitch Presentation Analyst** 🎤
   - Communication effectiveness
   - Narrative structure and flow
   - Audience engagement potential
   - Presentation clarity and persuasiveness

### **Orchestrator Agent**

The **Pitch Analysis Orchestrator** manages the multi-agent discussion:
- Initiates analysis with specialist team
- Facilitates structured conversations
- Ensures comprehensive coverage
- Synthesizes insights into final recommendations

## 🔄 Analysis Modes

### **1. Single Agent (Original)** 🤖
- **Speed**: 30-60 seconds
- **Approach**: Traditional single-agent analysis
- **Best for**: Quick feedback and simple pitches

### **2. Quick Multi-Agent** ⚡
- **Speed**: 60-90 seconds  
- **Approach**: Orchestrated specialist analysis
- **Best for**: Comprehensive coverage with time constraints

### **3. Deep Multi-Agent Discussion** 👥
- **Speed**: 2-4 minutes
- **Approach**: Full autonomous agent conversation
- **Best for**: Complex pitches requiring deep analysis
- **Configurable turns**: 4-12 discussion rounds

## 🛠 Technical Implementation

### **Agent Tools**

Each agent has access to specialized tools:

```typescript
// Structured comment tool for analysis insights
const makeAnalysisComment = tool({
  name: 'make_analysis_comment',
  parameters: z.object({
    category: z.enum(['business_model', 'market', 'financial', 'team', 'presentation', 'risk']),
    insight: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    recommendation: z.string().optional(),
  }),
  execute: async ({ category, insight, confidence, recommendation }) => {
    // Records structured feedback for synthesis
  },
});

// Context awareness tool for referencing previous discussion
const getDiscussionContext = tool({
  name: 'get_discussion_context',
  parameters: z.object({
    requestType: z.enum(['summary', 'specific_point', 'full_context']),
  }),
  execute: async ({ requestType }) => {
    // Provides conversation history and context
  },
});
```

### **Orchestration Pattern**

Based on the [OpenAI Agents handoff pattern](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/quickstart.mdx#_snippet_7):

```typescript
export const pitchAnalysisOrchestrator = Agent.create({
  name: 'Pitch Analysis Orchestrator',
  instructions: `Coordinate specialist agents for comprehensive pitch evaluation...`,
  handoffs: [businessModelAnalyst, marketAnalyst, financialAnalyst, teamAnalyst, presentationAnalyst],
  modelSettings: MODEL_CONFIG,
});
```

### **Autonomous Discussion Flow**

```typescript
export async function runMultiAgentPitchAnalysis(
  pitchContent: string, 
  maxTurns: number = 8
): Promise<{
  success: boolean;
  analysis?: string;
  discussionLog?: DiscussionState;
  error?: string;
}> {
  // 1. Initialize discussion state
  const discussionState: DiscussionState = {
    pitch: pitchContent,
    currentTurn: 0,
    maxTurns,
    agentComments: [],
    conversationHistory: [],
  };

  // 2. Run autonomous agent discussion
  for (let turn = 0; turn < maxTurns; turn++) {
    // Update context for all agents
    await updateDiscussionContext(discussionState);
    
    // Execute current agent
    const result = await run(currentAgent, currentMessage);
    
    // Log conversation history
    discussionState.conversationHistory.push({
      agent: currentAgent.name,
      message: result.finalOutput,
      turn: turn + 1,
    });
    
    // Check completion criteria
    const shouldContinue = shouldContinueDiscussion(result.finalOutput, turn, maxTurns);
    if (!shouldContinue) break;
    
    // Prepare next turn
    currentMessage = generateNextTurnPrompt(result.finalOutput, turn, maxTurns);
  }

  // 3. Generate final synthesis
  const finalSynthesis = await generateFinalSynthesis(discussionState);
  
  return {
    success: true,
    analysis: finalSynthesis,
    discussionLog: discussionState,
  };
}
```

## 🎯 Discussion Management

### **Turn Management**
- **Configurable turns**: 4-12 rounds (user selectable)
- **Auto-completion**: Detects when analysis is comprehensive
- **Context preservation**: Each agent has access to full discussion history

### **Completion Detection**
The system automatically detects when analysis is complete by looking for:
- "final recommendation" signals
- "analysis complete" indicators
- "comprehensive assessment concluded" phrases
- Natural conversation endpoints

### **Context Management**
- **Conversation history**: Full discussion log maintained
- **Structured comments**: Categorized insights for synthesis  
- **Turn tracking**: Monitors discussion progress
- **Agent handoffs**: Seamless transitions between specialists

## 🚀 API Integration

### **Endpoints**

**Primary Analysis**: `/api/analyze-pitch`
```json
{
  "pitch": "string",
  "analysisMode": "original|quick|multi-agent",
  "maxTurns": 6
}
```

**Dedicated Multi-Agent**: `/api/analyze-pitch-multi`
```json
{
  "pitch": "string", 
  "maxTurns": 8,
  "analysisType": "full"
}
```

### **Response Format**
```json
{
  "success": true,
  "analysis": "comprehensive feedback...",
  "metadata": {
    "analysisMode": "multi-agent",
    "maxTurns": 8,
    "actualTurns": 6,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "discussionLog": {
    "pitch": "original pitch...",
    "conversationHistory": [...],
    "agentComments": [...]
  }
}
```

## 🎨 User Experience

### **Mode Selection**
Users can choose their preferred analysis approach:
- **Visual indicators**: Icons and time estimates
- **Turn configuration**: Slider for multi-agent discussion depth
- **Real-time feedback**: Progress indicators during analysis

### **Chat Interface**
- **Mode-aware messaging**: Different loading messages per mode
- **Header indicators**: Shows active analysis mode
- **Time estimates**: User expectations management

## 🔧 Configuration

### **Environment Variables**
```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini  # Default model for all agents
```

### **Model Settings**
```typescript
const MODEL_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1500,
};
```

### **Turn Limits**
- **Minimum**: 4 turns (ensures basic coverage)
- **Maximum**: 12 turns (prevents excessive costs)
- **Default**: 6-8 turns (optimal balance)

## 🎯 Benefits

### **Comprehensive Analysis**
- **Multiple perspectives**: Each agent brings specialized expertise
- **Structured discussion**: Organized insights across key business areas
- **Collaborative synthesis**: Agents build on each other's observations

### **Quality Assurance**
- **Cross-validation**: Agents can challenge and refine each other's assessments
- **Confidence scoring**: Each insight includes confidence levels
- **Recommendation tracking**: Specific, actionable advice

### **Scalability**
- **Autonomous operation**: Runs without human intervention
- **Configurable depth**: Adjustable based on complexity needs
- **Cost control**: Turn limits prevent runaway conversations

This multi-agent system represents a significant advancement in AI-powered business analysis, providing entrepreneurs with sophisticated, collaborative insights from multiple expert perspectives in an automated, scalable format.