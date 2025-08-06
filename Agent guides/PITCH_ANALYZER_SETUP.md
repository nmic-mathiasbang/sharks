# AI Pitch Analyzer Setup Guide

This project now includes an AI-powered pitch analysis system using the OpenAI Agents TypeScript framework.

## 🚀 Features

- **Intelligent Pitch Analysis**: Uses specialized AI agents to analyze business pitches
- **Interactive Chat Interface**: Continue the conversation with follow-up questions
- **Comprehensive Feedback**: Covers business model, market analysis, and presentation quality
- **Actionable Recommendations**: Get specific suggestions for improvement

## 🛠 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in your project root:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. Dependencies

The following packages are already installed:
- `@openai/agents` - OpenAI Agents TypeScript SDK
- `zod` - Schema validation for agent tools
- `lucide-react` - Icons for the chat interface
- `shadcn/ui` components (Card, ScrollArea, Input, Button)

### 3. Project Structure

```
src/
├── lib/agents/
│   └── pitch-analyzer.ts       # Main agent with tools
├── components/chat/
│   └── PitchAnalysisChat.tsx   # Chat interface component
├── app/api/
│   ├── analyze-pitch/route.ts  # Initial pitch analysis endpoint
│   └── chat-pitch/route.ts     # Follow-up chat endpoint
└── app/page.tsx                # Updated main page
```

## 🤖 Agent Architecture

### Core Agent: Pitch Analysis Expert

The main agent specializes in business pitch analysis and includes:

**Tools:**
1. `analyze_business_model` - Evaluates revenue streams, target market, value proposition
2. `analyze_pitch_presentation` - Assesses clarity, persuasiveness, and completeness
3. `generate_recommendations` - Provides specific improvement suggestions

**Capabilities:**
- Business model viability assessment
- Market opportunity evaluation
- Competitive landscape analysis
- Financial projections review
- Team and execution capability assessment

## 🎯 Usage

1. **Initial Analysis**: Enter your business pitch in the main textarea
2. **Get Feedback**: The AI agent will provide comprehensive analysis
3. **Interactive Chat**: Ask follow-up questions or provide more details
4. **Iterate**: Use the recommendations to refine your pitch

## 🔧 Key Implementation Details

### Agent Configuration

Based on the [OpenAI Agents documentation](https://context7.com/openai/openai-agents-js/llms.txt), the agent is configured with:

```typescript
const pitchAnalysisAgent = new Agent({
  name: 'Pitch Analysis Expert',
  instructions: 'Comprehensive business pitch analysis instructions...',
  tools: [analyzeBusinessModel, analyzePitchPresentation, generateRecommendations],
});
```

### Tool Definitions

Tools use Zod schemas for parameter validation:

```typescript
const analyzeBusinessModel = tool({
  name: 'analyze_business_model',
  description: 'Analyze business model aspects...',
  parameters: z.object({
    pitch: z.string().describe('The pitch content to analyze'),
  }),
  execute: async ({ pitch }) => {
    // Analysis logic
  },
});
```

### API Integration

The system uses Next.js API routes to handle agent interactions:

- `POST /api/analyze-pitch` - Initial pitch analysis
- `POST /api/chat-pitch` - Follow-up conversations

## 🎨 UI Components

The chat interface provides:
- Real-time message display
- Loading indicators during analysis
- Proper error handling
- Responsive design with shadcn/ui

## 🔄 Example Workflow

1. User enters: "We're building a SaaS platform for inventory management..."
2. Agent analyzes using specialized tools
3. Provides structured feedback on business model, presentation, etc.
4. User asks: "How can I better define my target market?"
5. Agent provides specific guidance based on context

## 🚧 Next Steps

- [ ] Add streaming responses for real-time feedback
- [ ] Implement conversation history persistence
- [ ] Add file upload for pitch decks
- [ ] Create specialized agents for different industries
- [ ] Add export functionality for analysis reports

## 📚 References

- [OpenAI Agents TypeScript Documentation](https://github.com/openai/openai-agents-js)
- [Context7 OpenAI Agents Guide](https://context7.com/openai/openai-agents-js/llms.txt)
- [shadcn/ui Components](https://ui.shadcn.com/)

The implementation follows the patterns from the OpenAI Agents quickstart examples, with specialized tools and orchestration for pitch analysis use cases.