import { Agent, tool, Runner, RunContext } from '@openai/agents';
import { z } from 'zod';
// Simple comment: Single source of truth for default turns
export const DEFAULT_MAX_TURNS = 10;


// Model configuration - Using latest GPT-4.1 mini for fast, efficient responses
const MODEL_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4.1-nano-2025-04-14',
  temperature: 0.8, // Dynamic for WhatsApp-style responses
  maxTokens: 400, // Shorter for autonomous back-and-forth
};

// Orchestrator config - needs more tokens for comprehensive synthesis
const ORCHESTRATOR_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4.1-nano-2025-04-14',
  temperature: 0.7, // Slightly lower for professional investment memo
  maxTokens: 2000, // More tokens for comprehensive analysis
};

// Timing constants for natural conversation flow
const CONVERSATION_TIMING = {
  MAIN_RESPONSE_DELAY: { min: 100, max: 200 }, // 2-3 milliseconds
  FOLLOW_UP_DELAY: { min: 100, max: 200 }, // 1-3 milliseconds
  FOLLOW_UP_CHANCE: 0.9 // 90% chance for follow-up responses
} as const;

// Agent color configuration
export const AGENT_COLORS = {
  'Jakob Risgaard': {
    background: '#F3EEEE',
    text: '#976D57'
  },
  'Jesper Buch': {
    background: '#F8ECDF',
    text: '#CC782F'
  },
  'Jan Lehrmann': {
    background: '#FAF3DD',
    text: '#C29343'
  },
  'Christian Stadil': {
    background: '#EEF3ED',
    text: '#548164'
  },
  'Tahir Siddique': {
    background: '#E9F3F7',
    text: '#487CA5'
  },
  // Simple comment: Additional investors
  'Christian Arnstedt': {
    background: '#EDEAFF',
    text: '#5F53B3'
  },
  'Louise Herping Ellegaard': {
    background: '#FFF0F5',
    text: '#B24E7D'
  },
  'Anne Stampe Olesen': {
    background: '#EAF7F1',
    text: '#2F7A56'
  },
  'Morten Larsen': {
    background: '#F1F5FF',
    text: '#3C6EE1'
  },
  'Nikolaj Nyholm': {
    background: '#FFF8EA',
    text: '#B07A2A'
  },
  'Investment Committee Lead': {
    background: '#F6F3F8',
    text: '#8A67AB'
  }
} as const;

// Shared Runner instance for consistent streaming, tracing and configuration
// Simple comment: We create one Runner to manage model calls and enable streaming events
const runner = new Runner({
  // Simple comment: Name the workflow and attach lightweight trace metadata for observability
  workflowName: 'Løvens Hule – Autonomous Chat',
  traceMetadata: {
    feature: 'autonomous-multi-agent-analysis',
  },
});

// Simple comment: Context object passed to the Runner; tools can access while LLM cannot see it
interface AppRunContext extends RunContext {
  discussionState: AutonomousDiscussionState;
}

// Helper function to create natural conversation delays
function getRandomDelay(delayConfig: { min: number; max: number }): number {
  return Math.floor(Math.random() * (delayConfig.max - delayConfig.min + 1)) + delayConfig.min;
}

// Helper function to handle agent response flow with typing indicators and delays
async function* processAgentResponse(
  agent: Agent,
  prompt: string,
  discussionState: AutonomousDiscussionState,
  delayConfig: { min: number; max: number } = CONVERSATION_TIMING.MAIN_RESPONSE_DELAY
): AsyncGenerator<{
  type: 'agent_typing_start' | 'agent_typing_stop' | 'agent_message' | 'agent_error' | 'final_investment_decision';
  agent: string;
  message?: string;
  turn: number;
  colors: { background: string; text: string };
  error?: string;
  decision?: FinalInvestmentDecision;
  remainingDecisions?: number;
}> {
  
  // Start typing indicator
  yield {
    type: 'agent_typing_start',
    agent: agent.name,
    turn: discussionState.currentTurn,
    colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS]
  };

  try {
    // Natural conversation delay
    const responseDelay = getRandomDelay(delayConfig);
    await new Promise(resolve => setTimeout(resolve, responseDelay));

    // Get agent response while keeping typing indicator active
    // Simple comment: We stop typing right before emitting the final message
    const response = await getRealAgentResponse(agent, prompt, discussionState);

    // Check if this is a final decision and parse it
    let finalDecision: FinalInvestmentDecision | null = null;
    if (discussionState.finalDecisionPhase) {
      finalDecision = parseFinalDecision(agent.name, response);

      // Simple comment: If model failed to produce a final response, create a safe PASS fallback
      const lowerResp = response.toLowerCase();
      const noFinalProduced = !finalDecision && (
        response.trim() === '' ||
        lowerResp.includes('model did not produce a final response') ||
        lowerResp.includes('is analyzing the pitch... (error:')
      );

      if (noFinalProduced) {
        const fallbackMessage = `Jeg kan ikke afgive et detaljeret svar lige nu. På den baggrund og den nuværende usikkerhed er min beslutning: og af den grund er jeg ude.`;
        finalDecision = {
          agentName: agent.name,
          decision: 'PASS',
          reasoning: fallbackMessage.replace(/og af den grund er jeg ude.?/i, '').trim(),
          timestamp: new Date()
        };
      }

      if (finalDecision) {
        discussionState.finalDecisions.set(agent.name, finalDecision);
        discussionState.agentsWhoMadeFinalDecision.add(agent.name);
      }
    }

    // In final decision phase, suppress transient model error messages that are not actual decisions
    const lowerResponse = response.toLowerCase();
    const suppressDuringFinalPhase = discussionState.finalDecisionPhase 
      && !finalDecision 
      && (lowerResponse.includes('is analyzing the pitch... (error:') || lowerResponse.includes('model did not produce a final response'));

    // Create and store group message (unless suppressed)
    if (!suppressDuringFinalPhase) {
      const groupMessage: GroupMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender: agent.name,
        message: response,
        timestamp: new Date(),
        turn: discussionState.currentTurn,
        needsResponse: !discussionState.finalDecisionPhase && (response.includes('?') || response.includes('thoughts?') || response.includes('agree?')),
        isFinalDecision: discussionState.finalDecisionPhase,
        finalDecision: finalDecision || undefined
      };

      discussionState.groupChat.push(groupMessage);
    }

    // Stop typing indicator
    yield {
      type: 'agent_typing_stop',
      agent: agent.name,
      turn: discussionState.currentTurn,
      colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS]
    };

    // Yield final decision event if this was a final decision
    if (finalDecision) {
      yield {
        type: 'final_investment_decision',
        agent: agent.name,
        message: response,
        turn: discussionState.currentTurn,
        colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS],
        decision: finalDecision,
        remainingDecisions: discussionState.totalActiveAgentsCount - discussionState.agentsWhoMadeFinalDecision.size
      };
    } else if (!suppressDuringFinalPhase) {
      // Yield regular message
      yield {
        type: 'agent_message',
        agent: agent.name,
        message: response,
        turn: discussionState.currentTurn,
        colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS]
      };
    }

  } catch (error) {
    console.error(`Error with ${agent.name}:`, error);
    
    // Stop typing on error
    yield {
      type: 'agent_typing_stop',
      agent: agent.name,
      turn: discussionState.currentTurn,
      colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS]
    };

    // Simple comment: During final decision phase, convert model errors to a safe PASS decision instead of error events
    if (discussionState.finalDecisionPhase) {
      const fallbackText = 'Der var et teknisk udfald. Jeg kan ikke afgive et detaljeret svar nu, og af den grund er jeg ude.';
      const finalDecision: FinalInvestmentDecision = {
        agentName: agent.name,
        decision: 'PASS',
        reasoning: fallbackText.replace(/og af den grund er jeg ude.?/i, '').trim(),
        timestamp: new Date(),
      };

      discussionState.finalDecisions.set(agent.name, finalDecision);
      discussionState.agentsWhoMadeFinalDecision.add(agent.name);

      // Record the final decision message in the chat for completeness
      const groupMessage: GroupMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender: agent.name,
        message: fallbackText,
        timestamp: new Date(),
        turn: discussionState.currentTurn,
        needsResponse: false,
        isFinalDecision: true,
        finalDecision
      };
      discussionState.groupChat.push(groupMessage);

      // Yield the final investment decision event so UI progresses cleanly
      yield {
        type: 'final_investment_decision',
        agent: agent.name,
        message: fallbackText,
        turn: discussionState.currentTurn,
        colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS],
        decision: finalDecision,
        remainingDecisions: discussionState.totalActiveAgentsCount - discussionState.agentsWhoMadeFinalDecision.size
      };
    } else {
      yield {
        type: 'agent_error',
        agent: agent.name,
        message: 'Sorry, I encountered an error in the discussion. Continuing...',
        turn: discussionState.currentTurn,
        colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Helper function to determine natural response length
function getResponseLengthGuidance(agentName: string, discussionState: AutonomousDiscussionState): string {
  const recentMessages = discussionState.groupChat.slice(-3);
  const someoneDirectlyAddressedMe = recentMessages.some(msg => 
    msg.message.includes(`@${agentName}`) || 
    msg.message.toLowerCase().includes(agentName.toLowerCase().split(' ')[0])
  );
  const isFirstTurn = discussionState.currentTurn === 1;
  
  if (someoneDirectlyAddressedMe) {
    const responses = [
      "Give a brief, direct response to what was said about you or your area of expertise.",
      "Respond concisely to the point raised - you can agree, disagree, or ask a follow-up question.",
      "Give a short reaction - maybe just agree briefly or challenge with a quick counterpoint.",
      "Address their point with a focused, 1-2 sentence response that shows you're listening."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (isFirstTurn) {
    return "Give your initial analysis of the pitch. Be comprehensive but not overwhelming - share your main thoughts and concerns based on your expertise.";
  }
  
  // Later turns - vary the length naturally based on random chance
  const rand = Math.random();
  if (rand < 0.15) {
    return "Keep it very brief this time - maybe just a quick agreement, disagreement, or single question. Sometimes a short response is more impactful.";
  } else if (rand < 0.40) {
    return "Give a focused response - 1-2 sentences addressing a specific point someone made or raising a new concern.";
  } else if (rand < 0.75) {
    return "Share your thoughts in 2-3 sentences - standard analysis length covering your main point with some reasoning.";
  } else {
    return "This is a good time for a more detailed analysis - elaborate on your concerns or insights with examples or deeper reasoning.";
  }
}

// Simple comment: Helper function to detect Jakob/Jesper banter opportunities
function getJakobJesperBanterGuidance(agentName: string, discussionState: AutonomousDiscussionState): string {
  const recentMessages = discussionState.groupChat.slice(-4);
  const jakobPresent = discussionState.activeAgents.includes('Jakob Risgaard');
  const jesperPresent = discussionState.activeAgents.includes('Jesper Buch');
  
  // Only add banter guidance if both are present
  if (!jakobPresent || !jesperPresent) return '';
  
  const jakobRecentlySpoke = recentMessages.some(msg => msg.sender === 'Jakob Risgaard');
  const jesperRecentlySpoke = recentMessages.some(msg => msg.sender === 'Jesper Buch');
  
  if (agentName === 'Jakob Risgaard' && jesperRecentlySpoke) {
    const banterChance = Math.random();
    if (banterChance < 0.35) { // 35% chance for banter
      return `\n🎭 BANTER MOMENT: Jesper har lige sagt noget - måske en lille venlig stikpille? Han bliver altid så teoretisk og international. Du kan prikke lidt til ham med dansk jordnærhed eller bare rulle øjnene over hans "store visioner". Gør det med et smil! 😏`;
    }
  }
  
  if (agentName === 'Jesper Buch' && jakobRecentlySpoke) {
    const banterChance = Math.random();
    if (banterChance < 0.35) { // 35% chance for banter
      return `\n🎭 BANTER MOMENT: Jakob har lige været skeptisk igen - perfekt til at prikke til ham! Han er altid så forsigtig og jordnær. Du kan drille ham med hans "hverdagseksempler" eller hans pessimisme. Gør det venligt og charmerende! 😄`;
    }
  }
  
  return '';
}

// Simple comment: Determine when to enter final decision phase
function shouldEnterFinalDecisionPhase(discussionState: AutonomousDiscussionState): boolean {
  const turnsRemaining = discussionState.maxTurns - discussionState.currentTurn;
  const agentsCount = discussionState.totalActiveAgentsCount;
  
  // Enter final phase when we have exactly enough turns for each agent to make final decision
  return turnsRemaining <= agentsCount && !discussionState.finalDecisionPhase;
}

// Simple comment: Check if all agents have made their final investment decisions
function allAgentsMadeFinalDecision(discussionState: AutonomousDiscussionState): boolean {
  return discussionState.agentsWhoMadeFinalDecision.size === discussionState.totalActiveAgentsCount;
}

// Simple comment: Parse final investment decision from agent response
function parseFinalDecision(agentName: string, response: string): FinalInvestmentDecision | null {
  const lowerResponse = response.toLowerCase();
  
  // Check for rejection pattern: "og af den grund er jeg ude"
  if (lowerResponse.includes('og af den grund er jeg ude')) {
    return {
      agentName,
      decision: 'PASS',
      reasoning: response.substring(0, response.toLowerCase().indexOf('og af den grund er jeg ude')).trim(),
      timestamp: new Date()
    };
  }
  
  // Check for investment pattern: "jeg tilbyder X% for Y kr"
  const investmentMatch = response.match(/jeg tilbyder (\d+)%.*?(\d+(?:\.\d+)?(?:\.000)*)\s*kr/i);
  if (investmentMatch) {
    const equity = parseInt(investmentMatch[1]);
    const amountStr = investmentMatch[2].replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(amountStr) * (amountStr.includes('.000') ? 1 : 1000); // Convert to full amount
    
    // Extract value proposition (everything after the investment offer)
    const valuePropositionStart = response.toLowerCase().indexOf('kan jeg hjælpe');
    const valueProposition = valuePropositionStart >= 0 
      ? response.substring(valuePropositionStart).trim()
      : response.substring(response.indexOf('.') + 1).trim();
    
    return {
      agentName,
      decision: 'INVEST',
      equity,
      amount,
      reasoning: response,
      valueProposition,
      timestamp: new Date()
    };
  }
  
  // If no clear pattern, treat as incomplete - agent needs to follow format
  return null;
}

// Simple comment: Randomized guidance to vary when @fornavn or @alle is used
function getMentionGuidance(agentName: string, discussionState: AutonomousDiscussionState): string {
  const recent = discussionState.groupChat.slice(-4);
  // Prefer the most recent other speaker as potential mention target
  const otherSpeakers = recent
    .map(m => m.sender)
    .filter(n => n && n !== agentName);
  const targetFullName = otherSpeakers.length > 0 ? otherSpeakers[otherSpeakers.length - 1] : '';
  const targetFirstName = targetFullName ? targetFullName.split(' ')[0] : '';

  const r = Math.random();
  // ~45% encourage @fornavn when replying to someone specific
  if (targetFirstName && r < 0.45) {
    return `Hvis det falder naturligt, kan du kort svare ${targetFirstName} ved at starte med @${targetFirstName}. Ellers undlad @ denne gang.`;
  }
  // ~20% encourage a group-level mention
  if (r < 0.65) {
    return `Hvis din pointe er til hele panelet, kan du bruge @alle – men kun hvis det føles naturligt. Ellers skriv uden @.`;
  }
  // ~35% explicitly suggest no mention
  return `Skriv din reaktion uden @‑mention denne gang, og hold det naturligt.`;
}

// Real OpenAI Agent response function using Runner streaming
// Simple comment: Run the agent with streaming and collect text output while preserving our event model
async function getRealAgentResponse(agent: Agent, prompt: string, discussionState: AutonomousDiscussionState): Promise<string> {
  // For direct prompts (like orchestrator synthesis), use the prompt as-is
  // For regular discussion, the prompt should already be contextual from createContextualPrompt
  const contextualPrompt = prompt;

  try {
    // Simple comment: Execute with SDK streaming, providing context so tools can read state if needed
    const stream = await runner.run(agent, contextualPrompt, {
      stream: true,
      context: { discussionState } as AppRunContext,
    });

    // Simple comment: Accumulate streamed text into a single message for our UI
    let text = '';
    for await (const chunk of stream.toTextStream({ compatibleWithNodeStreams: false })) {
      text += chunk;
    }
    return text.trim() || `${agent.name} provides insights about the pitch.`;
  } catch (error) {
    console.error(`Error getting real response from ${agent.name}:`, error);
    return `${agent.name} is analyzing the pitch... (Error: ${error instanceof Error ? error.message : 'Unknown error'})`;
  }
}

// Simple comment: Interface for final investment decisions from each agent
interface FinalInvestmentDecision {
  agentName: string;
  decision: 'INVEST' | 'PASS';
  equity?: number; // percentage
  amount?: number; // in DKK
  reasoning: string;
  valueProposition?: string; // how they can help
  timestamp: Date;
}

// Shared conversation history for autonomous communication
interface GroupMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  turn: number;
  respondingTo?: string; // ID of message being responded to
  needsResponse?: boolean; // Whether this message requires a response
  isFinalDecision?: boolean; // Whether this is a final investment decision
  finalDecision?: FinalInvestmentDecision; // Parsed final decision if applicable
}

interface AutonomousDiscussionState {
  pitch: string;
  groupChat: GroupMessage[];
  activeAgents: string[];
  maxTurns: number;
  currentTurn: number;
  discussionComplete: boolean;
  // Simple comment: Final decision phase tracking
  finalDecisionPhase: boolean;
  agentsWhoMadeFinalDecision: Set<string>;
  finalDecisions: Map<string, FinalInvestmentDecision>;
  totalActiveAgentsCount: number;
}

// Tools for autonomous agent communication
const sendGroupMessage = tool({
  name: 'send_group_message',
  description: 'Send a message to the group chat for other agents to see and respond to',
  parameters: z.object({
    message: z.string().describe('Your message to share with other agents'),
    targetAgent: z.string().nullable().optional().describe('Specific agent to address (optional)'),
    needsResponse: z.boolean().default(false).describe('Whether you expect a response to this message'),
    respondingTo: z.string().nullable().optional().describe('ID of the message you are responding to')
  }),
  execute: async ({ message, targetAgent, needsResponse, respondingTo }) => {
    // This will be handled by the orchestrator
    return {
      type: 'group_message',
      message,
      targetAgent,
      needsResponse,
      respondingTo,
      timestamp: new Date().toISOString()
    };
  },
});

const checkGroupChat = tool({
  name: 'check_group_chat',
  description: 'Check recent messages in the group chat and see if anyone is asking for your input',
  parameters: z.object({
    lastChecked: z.string().nullable().optional().describe('Timestamp of last checked message')
  }),
  execute: async ({ lastChecked }) => {
    // This will be handled by the orchestrator
    return {
      type: 'chat_check',
      lastChecked: lastChecked || new Date().toISOString()
    };
  },
});

const handoffToAgent = tool({
  name: 'handoff_to_agent',
  description: 'Transfer the conversation to another specialized agent',
  parameters: z.object({
    targetAgent: z.string().describe('Name of the agent to handoff to'),
    context: z.string().describe('Context and instructions for the target agent'),
    priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Priority level of the handoff')
  }),
  execute: async ({ targetAgent, context, priority }) => {
    return {
      type: 'handoff',
      targetAgent,
      context,
      priority,
      timestamp: new Date().toISOString()
    };
  },
});

// 1. Business Model Analyst Agent - Jakob Risgaard (Løvens Hule)
export const autonomousBusinessModelAnalyst = new Agent({
  name: 'Jakob Risgaard',
  instructions: `Du er Jakob Risgaard fra Løvens Hule! Du er den erfarne forretningsmand der altid går efter detaljerne.

VIGTIG: Varièr længden af dine svar naturligt:
- Nogle gange kort og direkte: "Det forstår jeg ikke" eller "Enig!"
- Nogle gange bare ét spørgsmål: "Hvor meget tjener I på hver kunde?"
- Når noget bekymrer dig, så uddyb med eksempler
- Blandet mellem super casual og mere detaljerede forklaringer

Din TV-personlighed:
- Direkte og jordnær - du snakker så alle kan forstå det
- Fokuseret på om forretningen kan tjene penge på lang sigt
- Stiller de spørgsmål som seerne tænker på derhjemme
- Bruger hverdagseksempler folk kan relatere til
- Elsker at prikke lidt til Jesper Buch når han bliver for teoretisk
- Kan blive begejstret når en forretning er virkelig god

🎬 Sådan snakker du:
- Brug hverdagssprog - undgå fagord som "unit economics" eller "TAM/SAM"
- Sig "indtjening" i stedet for "revenue" 
- Sig "kunder" i stedet for "customer base"
- Spørg "Hvordan tjener I penge?" i stedet for komplekse analyser
- Husk at nævne Jesper med et smil når han bliver for smart 😏
- Nogle gange bare ét ord: "Præcis!" eller "Nok!"

😏 KEMI MED JESPER BUCH:
Når Jesper er med i diskussionen, så prik til ham venligt:
- "Jesper, nu bliver du for teoretisk igen..." 
- "Hold nu fast, @Jesper - hvad betyder det på dansk?"
- "Jesper snakker om internationale trends, men kan de tjene penge i Rødovre?"
- "Der har vi ham igen med de store visioner! 🙄"
- "Kom nu ned på jorden, Jesper!"
- Bare rul øjnene når han nævner udlandet eller store markeder

Fokus: Hvordan forretningen tjener penge, om det kan skaleres, og om der er nok kunder.

  Du er på TV - snakker til både iværksætterne og seerne derhjemme!

  SAMTALE-STIL (vigtigt):
  - Diskutér med de andre investorer – tal til hinanden, ikke kun til founder.
  - Brug @fornavn når relevant (fx @Jesper, @Jan) eller @alle for fælles pointer.
  - Start ofte med en kort reaktion på det forrige indlæg (enig/uenig/nuancer), og byg videre.
  - Tal om investeringsvilje: “Jeg er inde/ude fordi…”, evt. ticket/terms hvis naturligt.
  - Vurder potentiale vs. risiko konkret (indtjening, CAC/CLV, skalering, runway).
  - Hold det jordnært og dansk – få spørgsmål til founder; mest intern diskussion.`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// Placeholder for conversational guidance helper (defined later once all agents exist)

// 2. Market & Competition Analyst Agent - Jesper Buch (Løvens Hule)
export const autonomousMarketAnalyst = new Agent({
  name: 'Jesper Buch',
  instructions: `Du er Jesper Buch fra Løvens Hule! Du er den internationale iværksætter der har set det hele og elsker at snakke om markeder og muligheder.

VIGTIG: Varièr dine svar naturligt i længde:
- Nogle gange entusiastisk kort: "Det her er stort!" eller "Fantastisk timing!"
- Andre gange stille spørgsmål: "Hvor mange kan købe det?"
- Når du bliver begejstret, så bliv længere og mere detaljeret
- Blandet mellem hurtige reaktioner og dybere markedsanalyser

Din TV-personlighed:
- Elsker at snakke om internationale trends og markeder
- Kan blive begejstret for store visioner og drømme
- Bruger ofte eksempler fra udlandet og andre brancher
- Kan godt lide når Jakob bliver skeptisk - det giver gode diskussioner
- Bliver nogle gange lidt for teoretisk (som Jakob påpeger)

🌍 Sådan snakker du:
- Brug ord som "marked", "konkurrenter", "kunder" - ikke tekniske termer
- Sig "hvor mange kan købe det?" i stedet for "markedsstørrelse"
- Snakker om "timing" og "trends" på en nem måde
- Nævn gerne eksempler fra andre lande eller brancher
- Grin lidt med Jakob når han bliver for kritisk 😄
- Nogle gange bare udråb: "Wow!" eller "Netop!"

😄 KEMI MED JAKOB RISGAARD:
Når Jakob er med, så prik venligt til hans forsigtige tilgang:
- "Jakob, du er altid så forsigtig! Nogle gange skal man tage chancer!"
- "Der har vi pessimisten igen 😄 @Jakob"
- "Jakob vil bare have hverdagseksempler - men vi snakker disruption her!"
- "Nu skal du ikke være så kedelig, Jakob!"
- "Hold op Jakob, ikke alle skal sælge pølser for at være en forretning!"
- Grin lidt når han bliver alt for jordnær og småborgerlig

Fokus: Er der nok kunder? Hvem er konkurrenterne? Er det det rigtige tidspunkt?

  Du skaber energi i rummet og får folk til at tænke stort!

  SAMTALE-STIL (vigtigt):
  - Tal direkte med de andre investorer. Brug @fornavn (fx @Jakob, @alle) når du svarer.
  - Reagér kort på den forrige pointe før din egen analyse (enig/uenig/nyt perspektiv).
  - Diskutér “invester eller ej?” – potentiale, timing, konkurrence, moat.
  - Brug få spørgsmål til founder; fokusér på intern debat i naturlig dansk tone.`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 3. Financial & Growth Analyst Agent - Jan Lehrmann (Løvens Hule)
export const autonomousFinancialAnalyst = new Agent({
  name: 'Jan Lehrmann', 
  instructions: `Du er Jan Lehrmann fra Løvens Hule! Du er tal-nerden der elsker at dykke ned i regnskaber og budgetter.

VIGTIG: Varièr dine svar naturligt i længde:
- Nogle gange korte bekymringer: "Det ser dyrt ud" eller "Hmm..."
- Andre gange konkrete spørgsmål: "Hvornår tjener I penge?"
- Når tallene ikke hænger sammen, bliv mere detaljeret i forklaringerne
- Blandet mellem hurtige matematiske observationer og dybere økonomiske analyser

Din TV-personlighed:
- Grundig og metodisk - vil gerne have styr på alle detaljer
- Pessimistisk men på en hjælpsom måde - vil gerne hjælpe til succes
- Fokuseret på at tingene skal hænge sammen økonomisk
- Stiller de kedelige men vigtige spørgsmål om penge
- Bliver begejstret når tallene faktisk giver mening
- Har en blød tilgang selvom han kan virke streng

💡 Sådan snakker du:
- Brug simple ord om økonomi - "omsætning", "overskud", "udgifter"
- Spørg "Hvornår tjener I penge?" i stedet for "break-even analysis"
- Sig "hvor meget koster det?" i stedet for komplekse budgettermer
- Vær bekymret men hjælpsom - "Jeg er lidt nervøs for..."
- Foreslå løsninger når du ser problemer
- Nogle gange bare: "Nope" eller "Det passer ikke"

Fokus: Kan de tjene penge? Hvor meget koster det? Hvornår løber pengene tør?

  Du er den der sørger for at drømmene bliver til virkelighed med sunde tal!

  SAMTALE-STIL (vigtigt):
  - Vær i dialog med de andre – brug @fornavn (fx @Jesper, @Christian) eller @alle.
  - Åbn med en kort reaktion på det forrige indlæg, og tilføj dine talpointer.
  - Diskutér investeringscase: valuation, runway, ticket, break-even, risiko.
  - Stil færre spørgsmål til founder; hold fokus på intern vurdering.`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 4. Team & Execution Analyst Agent - Christian Stadil (Løvens Hule)
export const autonomousTeamAnalyst = new Agent({
  name: 'Christian Stadil',
  instructions: `Du er Christian Stadil fra Løvens Hule! Du er den karismatiske leder der brænder for mennesker og teams.

VIGTIG: Varièr dine svar naturligt i længde:
- Nogle gange varmt og kort: "I har magien!" eller "Det mærker jeg"
- Andre gange dybere personlige spørgsmål: "Hvad driver jer virkelig?"
- Når du ser potentiale, bliv inspirerende og længere
- Blandet mellem hurtige menneskelige observationer og dybere teamanalyser

Din TV-personlighed:
- Utrolig engageret i mennesker og deres potentiale
- Fokuseret på om folk kan arbejde sammen og levere
- Inspirerende og støttende - tror på det bedste i mennesker
- Stiller de personlige spørgsmål som går til kernen
- Elsker historier om samarbejde og gennemførelseskraft
- Kan mærke energi og dynamik mellem mennesker

🤝 Sådan snakker du:
- Fokuser på "teamet", "folk", "samarbejde" - ikke HR-fagord
- Spørg "Kan I arbejde sammen?" i stedet for "teamdynamik"
- Sig "Har I prøvet det før?" i stedet for "track record"
- Vær personlig og varm i tonen
- Interessér dig for deres historie og motivation
- Spørg til deres drømme og vision
- Nogle gange bare følelse: "Fed energi!" eller "Præcis!"

Fokus: Kan de levere det de lover? Arbejder de godt sammen? Har de modet til at fortsætte?

  Du får folk til at åbne op og fortælle deres virkelige historie!

  SAMTALE-STIL (vigtigt):
  - Henvend dig til de andre investorer med @fornavn (fx @Jan) eller @alle.
  - Knyt korte, varme reaktioner til forrige pointe før du uddyber.
  - Diskutér om vi bør investere: teamets styrker/svagheder, eksekveringsrisiko, fit.
  - Behold den menneskelige, danske tone – mindre Q&A til founder.`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 5. Pitch Presentation Analyst Agent - Tahir Siddique (Løvens Hule)
export const autonomousPresentationAnalyst = new Agent({
  name: 'Tahir Siddique',
  instructions: `Du er Tahir Siddique fra Løvens Hule! Du er den skarpe kommunikator der ved hvordan man sælger en vision.

VIGTIG: Varièr dine svar naturligt i længde:
- Nogle gange direkte kort: "Det forstår jeg ikke" eller "Troværdigt!"
- Andre gange spørgende: "Hvad er jeres rigtige historie?"
- Når kommunikationen ikke fungerer, bliv konstruktivt detaljeret
- Blandet mellem hurtige kommunikationsobservationer og dybere historieanalyse

Din TV-personlighed:
- Fokuseret på om historien giver mening og er troværdig
- Kan hurtigt gennemskue om folk forsøger at sælge noget de ikke tror på
- Elsker når folk er ægte og passionerede
- Kritisk men hjælpsom når præsentationen ikke fungerer
- Vil gerne hjælpe folk med at fortælle deres historie bedre
- Direct og ærlig - siger tingene lige ud

📢 Sådan snakker du:
- Fokuser på "historie", "budskab", "troværdighed" - ikke kommunikationsteori
- Spørg "Forstår jeg hvad I vil?" i stedet for "value proposition"
- Sig "Tror jeg på jer?" i stedet for "investor appeal"
- Vær direkte: "Det hænger ikke sammen" eller "Det forstår jeg ikke"
- Hjælp med konkrete forslag til forbedringer
- Spørg til passion og motivation bag projektet
- Nogle gange bare: "Nej" eller "Spot on!"

Fokus: Forstår vi hvad de vil? Tror vi på dem? Kan de forklare det godt nok?

  Du hjælper folk med at fortælle deres historie så den rammer hjertet!

  SAMTALE-STIL (vigtigt):
  - Svar de andre med @fornavn eller @alle; byg videre på seneste pointe.
  - Diskutér ind/ud: tillid til historien, klarhed, risiko for misalignment.
  - Hold det kort og naturligt dansk; få spørgsmål til founder.`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 6+. Additional Agents based on Agent-persona.md
// Simple comment: Persona and conversational style for Christian Arnstedt
export const autonomousChristianArnstedt = new Agent({
  name: 'Christian Arnstedt',
  instructions: `Du er Christian Arnstedt — “Speed & Numbers”. Du er den hurtige, kommercielle operatør der elsker fart, performance og tal.

VIGTIG: Vær hurtig, skarp og talfikseret. Spot DTC-motorer, funnel-effektivitet og skalerbare kanaler.
- Stil korte, direkte spørgsmål om ROAS vs. MER, kanalmix og sammenhæng mellem pris og COGS.
- Fokuser på 90-dages vækstplaner, testbudgetter og performance-trancher.

Din TV-personlighed:
- Tydelig på impact, konkrete next-steps og læringsloops
- Uimponeret af pynt – data og traction tæller
- Skubber for tempo og klare mål

🎯 Fokus: Vækstmotor, payback-tid og skalering uden at knække driften.

SAMTALE-STIL (vigtigt):
- Tal med de andre investorer – brug @navne (fx @Jakob Risgaard, @Jesper Buch) eller @alle
- Start med en kort reaktion på forrige indlæg (enig/uenig/nuance), og byg videre
- Diskutér investeringscase (inde/ude), terms/ticket hvis naturligt, potentiale vs. risiko
- Få spørgsmål til founder – mest intern debat i naturlig dansk tone`,
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// Simple comment: Persona and conversational style for Louise Herping Ellegaard
export const autonomousLouiseHerping = new Agent({
  name: 'Louise Herping Ellegaard',
  instructions: `Du er Louise Herping Ellegaard — “DTC-kuratøren”. Du er produkt- og brand-skarp og kan lugte loyalitet og god smag på afstand.

VIGTIG: Kig efter smag, abonnementslogik og loyalitet. Vær skarp på kunderejse og retention.
- Spørg til kohorter, gentegningsrate, NPS, packaging og community som vækstdrivere.

Din TV-personlighed:
- Empatisk forbrugerblik, men kommerciel i bundlinjen
- Optaget af CLV, churn-drivere og value-for-money
- Fanger hurtigt hvorfor kunder bliver eller smutter

🎯 Fokus: Abonnement/CLV-optimering, loyalitet, oplevelse og brand-fit.

SAMTALE-STIL (vigtigt):
- Henvend dig til de andre med @navne (fx @Christian Stadil) eller @alle og byg videre
- Vurder “inde/ude” ud fra kunde-oplevelse og retention-risiko
- Få spørgsmål til founder – primært intern snak i naturligt dansk, varm tone`,
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// Simple comment: Persona and conversational style for Anne Stampe Olesen
export const autonomousAnneStampe = new Agent({
  name: 'Anne Stampe Olesen',
  instructions: `Du er Anne Stampe Olesen — “Produkt-arkitekten”. Du går til kernen: problem, løsning, evidens.

VIGTIG: Insistér på produkt-market-fit. Dyk dybt i problem/solution, brugerindsigt og roadmap.
- Spørg: Hvilket smertepunkt? Hvilken evidens? Hvilke læringsloops driver roadmap?

Din TV-personlighed:
- Rolig, analytisk og determineret
- Kan lide eksperimenter med klare succes-kriterier
- Uimponeret af buzzwords – vil se læring og fremdrift

🎯 Fokus: Læringsdrevne milepæle, evidens for PMF og realistisk roadmap.

SAMTALE-STIL (vigtigt):
  - Brug @fornavn (fx @Tahir, @alle) og byg videre på forrige pointe
- Vægt investeringscase ud fra produkt-risiko og læringshastighed
- Få spørgsmål til founder; primært intern, dansk og konkret debat`,
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// Simple comment: Persona and conversational style for Morten Larsen
export const autonomousMortenLarsen = new Agent({
  name: 'Morten Larsen',
  instructions: `Du er Morten Larsen — “Operations-barberen”. Du barberer alt overflødigt væk og får ting til at virke i praksis.

VIGTIG: Skær alt overflødigt. Tænk processer, cost-to-serve, SLA og skalerbar drift.
- Spørg til flaskehalse, takt-tid, leverandør-risiko og enhedsøkonomi i praksis.

Din TV-personlighed:
- Nede-på-jorden, praktisk og skarp på omkostninger
- Ser hurtigt hvor driften knækker ved skalering
- Elsker simple, robuste løsninger

🎯 Fokus: Drift, marginer i praksis og skalerbarhed uden kaos.

SAMTALE-STIL (vigtigt):
- Tal til de andre med @navne (fx @Jan Lehrmann) eller @alle; reaktionssætning først
- Diskutér inde/ude ud fra eksekveringsrisiko, COGS, opsætning og supply-risk
- Få spørgsmål til founder – mest intern snak i klar, dansk tone`,
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// Simple comment: Persona and conversational style for Nikolaj Nyholm
export const autonomousNikolajNyholm = new Agent({
  name: 'Nikolaj Nyholm',
  instructions: `Du er Nikolaj Nyholm — “Platform-/Tech-oraklet”. Du spotter netværkseffekter, platforme og kreative/creator-økonomier.

VIGTIG: Jagt systemiske moats: netværkseffekter, platforme, spil/creator-økonomi, infra/AI.
- Spørg: Hvad bliver stærkere, jo større det bliver? Er der API/økosystem? Er der 10x fordel?

Din TV-personlighed:
- Visionær, nysgerrig og tech-kræsen
- Kan godt lide skalerbare arkitekturer og community-dynamikker
- Ser moats hvor andre ser features

🎯 Fokus: Varige platform-fordele, tekniske milepæle og defensible positioner.

SAMTALE-STIL (vigtigt):
- Brug @navne (fx @alle, @Jesper Buch) – replikér og byg videre på forrige pointe
- Diskutér investeringscase: platform-risiko, udbud/efterspørgsel og netværksstyrke
- Få spørgsmål til founder – primært intern, dansk og jordnær debat`,
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 6. Autonomous Orchestrator Agent - Manages the group discussion
export const autonomousOrchestrator = new Agent({
  name: 'Investment Committee Lead',
  instructions: `🎯 Du er Investment Committee Lead og faciliterer Løvens Hule investor diskussionen!

 Du dirigerer og koordinerer disse erfarne danske investorer:
 💰 Jakob Risgaard - Forretningsmodel og rentabilitet
 🚀 Jesper Buch - Marked og konkurrence  
 📊 Jan Lehrmann - Finansielle analyser og vækst
 👥 Christian Stadil - Team og eksekveringsevne
 🎤 Tahir Siddique - Kommunikation og formidling
 ⚡️ Christian Arnstedt - Speed & Numbers
 🛍️ Louise Herping Ellegaard - DTC & loyalitet
 🧩 Anne Stampe Olesen - Produkt & PMF
 🪚 Morten Larsen - Operations & drift
 🧠 Nikolaj Nyholm - Platform/Tech moats

Som facilitator skal du:
1. **Dirigere Samtalen**: Beslut hvem der skal tale næst baseret på:
   - Hvilken ekspertise er mest relevant nu?
   - Hvem har ikke sagt meget endnu?
   - Hvad vil skabe naturligt flow?
   - Hvem kan give modstridende eller støttende synspunkt?

2. **Overvåge Balance**: Sørg for alle får taletid og bidrager meningsfuldt

3. **Drive Dybde**: Dirigér diskussionen mod manglende analyse områder

4. **Facilitere Naturligt Flow**: Som en rigtig mødeleder der sørger for produktiv diskussion

 Når du bliver bedt om at vælge næste taler, skal du ALTID svare med kun det fulde navn:
 "Jakob Risgaard" eller "Jesper Buch" eller "Jan Lehrmann" eller "Christian Stadil" eller "Tahir Siddique" eller
 "Christian Arnstedt" eller "Louise Herping Ellegaard" eller "Anne Stampe Olesen" eller "Morten Larsen" eller "Nikolaj Nyholm"

Når diskussion er færdig, lav struktureret investment memo på dansk med:
1. **Executive Summary** (2-3 sætninger)
2. **Vigtige Styrker** (hvad der begejstrer teamet)
3. **Store Bekymringer** (røde flag & risici)  
4. **Markedsmulighed** (størrelse, timing, konkurrence)
5. **Finansielt Outlook** (prognoser, nøgletal, funding)
6. **Team Vurdering** (grundlæggere, eksekveringsevne)
7. **Investment Anbefaling** (Pass/Overvej/Investér + rationale)

Du er mødeleder - guide diskussionen aktivt og strategisk!`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: ORCHESTRATOR_CONFIG,
});

// Simple comment: Select agent for final decision phase (least active first)
async function selectAgentForFinalDecision(
  agents: Agent[], 
  discussionState: AutonomousDiscussionState
): Promise<Agent | null> {
  
  // Find agents who haven't made final decisions yet
  const agentsNeedingDecision = agents.filter(agent => 
    !discussionState.agentsWhoMadeFinalDecision.has(agent.name)
  );
  
  if (agentsNeedingDecision.length === 0) {
    return null;
  }
  
  // Use least active first for balanced final decisions
  const agentParticipation = new Map<string, number>();
  agents.forEach(agent => {
    const messageCount = discussionState.groupChat.filter(msg => msg.sender === agent.name).length;
    agentParticipation.set(agent.name, messageCount);
  });
  
  const leastActiveAgent = agentsNeedingDecision.reduce((least, current) => {
    const leastCount = agentParticipation.get(least.name) || 0;
    const currentCount = agentParticipation.get(current.name) || 0;
    return currentCount < leastCount ? current : least;
  });
  
  console.log(`Selected ${leastActiveAgent.name} for final decision (${agentsNeedingDecision.length} remaining)`);
  return leastActiveAgent;
}

// Simple comment: Create context-aware prompts based on discussion phase
function createContextualPrompt(
  agent: Agent, 
  discussionState: AutonomousDiscussionState, 
  pitchContent: string
): string {
  
  if (discussionState.finalDecisionPhase) {
    return createFinalDecisionPrompt(agent, discussionState, pitchContent);
  } else {
    return createRegularDiscussionPrompt(agent, discussionState, pitchContent);
  }
}

// Simple comment: Create final decision prompt requiring specific investment decision format
function createFinalDecisionPrompt(
  agent: Agent, 
  discussionState: AutonomousDiscussionState, 
  pitchContent: string
): string {
  
  const agentsRemaining = discussionState.totalActiveAgentsCount - discussionState.agentsWhoMadeFinalDecision.size;
  const recentMessages = discussionState.groupChat.slice(-6);
  const conversationContext = recentMessages.length > 0 
    ? recentMessages.map(msg => `${msg.sender}: ${msg.message}`).join('\n')
    : '';
  
  return `🎯 FINAL INVESTMENT DECISION REQUIRED

Du er ${agent.name} og skal nu give din endelige investeringsbeslutning om dette pitch:

"${pitchContent.substring(0, 400)}..."

Seneste diskussion:
${conversationContext}

 VIGTIG INSTRUKTION: Svar KUN med én samlet tekstbesked (ingen værktøjer). Du SKAL afslutte med en af disse to formater:

1️⃣ HVIS DU IKKE VIL INVESTERE:
Forklar kort dine bekymringer og afslut med: "og af den grund er jeg ude"

2️⃣ HVIS DU VIL INVESTERE:
- Angiv dit tilbud: "Jeg tilbyder X% for Y.000 kr."
- Beskriv hvordan du kan hjælpe virksomheden til næste niveau med din ekspertise
- Vær konkret om din værditilføjelse

Eksempel på afslag:
"Jeg er bekymret for markedsstørrelsen og manglende traction. Konkurrencen er hård, og jeg ser ikke en klar vej til rentabilitet, og af den grund er jeg ude."

Eksempel på investment:
"Jeg tilbyder 15% for 500.000 kr. Med min erfaring inden for [dit område] kan jeg hjælpe med [konkrete punkter]. Jeg har netværk til [relevante kontakter] og kan åbne døre til [specifikke muligheder]."

Dette er din SIDSTE besked - alle ${discussionState.totalActiveAgentsCount} investorer skal give deres endelige beslutning. ${agentsRemaining} tilbage efter dig.

Vær præcis, konkret og overbevisende!`;
}

// Simple comment: Create regular discussion prompt for ongoing analysis
function createRegularDiscussionPrompt(
  agent: Agent, 
  discussionState: AutonomousDiscussionState, 
  pitchContent: string
): string {
  
  // Get recent conversation context  
  const recentMessages = discussionState.groupChat.slice(-5);
  const conversationContext = recentMessages.length > 0 
    ? `Recent group discussion:\n${recentMessages.map(m => `${m.sender}: ${m.message}`).join('\n')}\n\n`
    : '';
  
  // Add response length guidance based on context
  const lengthGuidance = getResponseLengthGuidance(agent.name, discussionState);
  const mentionGuidance = getMentionGuidance(agent.name, discussionState);
  const banterGuidance = getJakobJesperBanterGuidance(agent.name, discussionState);
  
  return `${conversationContext}You are participating in a live investment panel discussion about this pitch:

"${pitchContent.substring(0, 500)}..."

${lengthGuidance}
\n${mentionGuidance}${banterGuidance}

Your response should feel natural and conversational, like you're really discussing with colleagues. Vary your response length based on the situation:
- Sometimes keep it brief (1-5 words): "Enig!", "Det bekymrer mig", "Præcis!"
- Sometimes moderate (1-2 sentences): Standard reactions and questions
- Sometimes detailed (3-5 sentences): When you need to elaborate or analyze deeply

Use your personality and expertise. Reference other agents naturally when relevant.

Current discussion context: This is turn ${discussionState.currentTurn} of the discussion.`;
}

// Orchestrator-driven agent selection function
async function letOrchestratorDecideNextAgent(
  agents: Agent[], 
  discussionState: AutonomousDiscussionState, 
  agentParticipation: Map<string, number>
): Promise<Agent | null> {
  
  // Get recent conversation context
  const recentMessages = discussionState.groupChat.slice(-5);
  const conversationContext = recentMessages.length > 0 
    ? recentMessages.map(m => `${m.sender}: ${m.message}`).join('\n')
    : 'No previous discussion yet.';
  
  // Get participation summary
  const participationSummary = Array.from(agentParticipation.entries())
    .map(([name, count]) => `${name}: ${count} messages`)
    .join(', ');
  
  // Create orchestrator prompt to decide next speaker (limit to active agents only)
  const availableNames = agents.map(a => a.name);
  const availableList = availableNames.map(n => `- ${n}`).join('\n');
  const orchestratorPrompt = `You are the Investment Committee Lead facilitating a Løvens Hule investor discussion about this pitch:

"${discussionState.pitch.substring(0, 300)}..."

Recent conversation:
${conversationContext}

Participation so far: ${participationSummary}

Available investors (choose STRICTLY from this list):
${availableList}

Who should speak next? Consider:
1. What expertise is most relevant to recent discussion?
2. Who hasn't spoken much yet?
3. What would create natural conversation flow?
4. Who might have a contrasting or supporting viewpoint?

Important: Reply with ONLY ONE of the EXACT full names from the list above.`;

  try {
    // Ask the orchestrator to decide
    const orchestratorDecision = await getRealAgentResponse(autonomousOrchestrator, orchestratorPrompt, discussionState);
    
    // Parse the orchestrator's decision
    const decision = orchestratorDecision.trim();
    console.log(`Orchestrator decision: "${decision}"`);
    
    // Find the agent based on orchestrator's choice
    const selectedAgent = agents.find(agent => 
      decision.includes(agent.name) || 
      agent.name.toLowerCase().includes(decision.toLowerCase())
    );
    
    if (selectedAgent) {
      console.log(`Orchestrator selected: ${selectedAgent.name}`);
      return selectedAgent;
    } else {
      console.log(`Could not parse orchestrator decision: "${decision}". Retrying with stricter instructions.`);

      // Retry once with stricter constraints
      const retryPrompt = `Your last answer "${decision}" was invalid.
Choose STRICTLY one of these EXACT names:
${availableList}

Reply with ONLY the exact full name, nothing else.`;
      const retryDecisionText = await getRealAgentResponse(autonomousOrchestrator, retryPrompt, discussionState);
      const retryDecision = retryDecisionText.trim();
      console.log(`Orchestrator retry decision: "${retryDecision}"`);
      const retrySelected = agents.find(agent => 
        retryDecision === agent.name ||
        agent.name.toLowerCase() === retryDecision.toLowerCase()
      );
      if (retrySelected) {
        console.log(`Orchestrator selected on retry: ${retrySelected.name}`);
        return retrySelected;
      }

      console.log(`Retry failed to parse. Falling back to balanced selection`);
      
      // Fallback: pick agent who has spoken least
      const leastActiveCount = Math.min(...agentParticipation.values());
      const leastActiveAgents = agents.filter(agent => 
        agentParticipation.get(agent.name) === leastActiveCount
      );
      
      if (leastActiveAgents.length > 0) {
        const randomIndex = Math.floor(Math.random() * leastActiveAgents.length);
        const fallbackAgent = leastActiveAgents[randomIndex];
        console.log(`Fallback selection: ${fallbackAgent.name} (${leastActiveCount} messages)`);
        return fallbackAgent;
      }
    }
    
  } catch (error) {
    console.error('Error getting orchestrator decision:', error);
    
    // Fallback to simple balanced selection
    const leastActiveCount = Math.min(...agentParticipation.values());
    const leastActiveAgents = agents.filter(agent => 
      agentParticipation.get(agent.name) === leastActiveCount
    );
    
    if (leastActiveAgents.length > 0) {
      const randomIndex = Math.floor(Math.random() * leastActiveAgents.length);
      const fallbackAgent = leastActiveAgents[randomIndex];
      console.log(`Error fallback selection: ${fallbackAgent.name}`);
      return fallbackAgent;
    }
  }
  
  return null;
}

// Autonomous multi-agent discussion runner
export async function* runAutonomousMultiAgentAnalysis(
  pitchContent: string, 
  maxTurns: number = DEFAULT_MAX_TURNS,
  selectedInvestors?: string[]
): AsyncGenerator<{
  type: 'agent_start' | 'agent_message' | 'agent_complete' | 'agent_error' | 'discussion_complete' | 'handoff' | 'agent_typing_start' | 'agent_typing_stop' | 'final_decision_phase_start' | 'final_investment_decision' | 'all_decisions_complete';
  agent?: string;
  message?: string;
  turn?: number;
  colors?: { background: string; text: string };
  targetAgent?: string;
  error?: string;
  decision?: FinalInvestmentDecision;
  remainingDecisions?: number;
}> {
  
  const discussionState: AutonomousDiscussionState = {
    pitch: pitchContent,
    groupChat: [],
    activeAgents: [],
    maxTurns,
    currentTurn: 0,
    discussionComplete: false,
    // Simple comment: Initialize final decision tracking
    finalDecisionPhase: false,
    agentsWhoMadeFinalDecision: new Set(),
    finalDecisions: new Map(),
    totalActiveAgentsCount: 0
  };

  const allAgents = [
    autonomousBusinessModelAnalyst,
    autonomousMarketAnalyst,
    autonomousFinancialAnalyst,
    autonomousTeamAnalyst,
    autonomousPresentationAnalyst,
    // Simple comment: New investors added from persona doc
    autonomousChristianArnstedt,
    autonomousLouiseHerping,
    autonomousAnneStampe,
    autonomousMortenLarsen,
    autonomousNikolajNyholm
  ];

  const agents = selectedInvestors && selectedInvestors.length
    ? allAgents.filter(a => selectedInvestors.includes(a.name))
    : allAgents;

  discussionState.activeAgents = agents.map(a => a.name);
  discussionState.totalActiveAgentsCount = agents.length;

  try {
    // Start the autonomous discussion
    console.log('🚀 Starting autonomous multi-agent discussion...');

    // Initial setup - all agents join the discussion
    for (const agent of agents) {
      yield {
        type: 'agent_start',
        agent: agent.name,
        turn: 0,
        colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS]
      };
    }

    // Track participation for balanced discussion
    const agentParticipation = new Map<string, number>();
    agents.forEach(agent => agentParticipation.set(agent.name, 0));

    // Run autonomous discussion loop
    while (discussionState.currentTurn < maxTurns && !discussionState.discussionComplete) {
      discussionState.currentTurn++;
      
      console.log(`\n=== AUTONOMOUS DISCUSSION TURN ${discussionState.currentTurn} ===`);

      // Check if we should enter final decision phase
      if (shouldEnterFinalDecisionPhase(discussionState)) {
        discussionState.finalDecisionPhase = true;
        console.log('🎯 ENTERING FINAL DECISION PHASE - Each investor must now make their final decision');
        
        // Yield a special event to notify the UI
        yield {
          type: 'final_decision_phase_start',
          message: 'Final decision phase: Each investor will now make their investment decision',
          turn: discussionState.currentTurn,
          remainingDecisions: discussionState.totalActiveAgentsCount
        };
      }

      // Select next agent based on phase
      const nextAgent = discussionState.finalDecisionPhase 
        ? await selectAgentForFinalDecision(agents, discussionState)
        : await letOrchestratorDecideNextAgent(agents, discussionState, agentParticipation);
      
      if (!nextAgent) {
        console.log('No suitable agent found, ending discussion');
        break;
      }

      // Increment participation count only for regular discussion
      if (!discussionState.finalDecisionPhase) {
        agentParticipation.set(nextAgent.name, (agentParticipation.get(nextAgent.name) || 0) + 1);
        console.log(`Selected agent: ${nextAgent.name} (participation: ${agentParticipation.get(nextAgent.name)})`);
      } else {
        console.log(`Selected agent for final decision: ${nextAgent.name}`);
      }
      
      // Main agent responds
      const agent = nextAgent;
      
      // Create context-aware prompt using new prompt system
      const contextPrompt = createContextualPrompt(agent, discussionState, pitchContent);

      // Use consolidated agent response handler
      for await (const event of processAgentResponse(agent, contextPrompt, discussionState)) {
        yield event;
      }

      // Check if discussion is complete after final decision
      if (discussionState.finalDecisionPhase && allAgentsMadeFinalDecision(discussionState)) {
        discussionState.discussionComplete = true;
        console.log('✅ All agents have made their final investment decisions');
        
        yield {
          type: 'all_decisions_complete',
          message: 'All investment decisions received',
          turn: discussionState.currentTurn,
          remainingDecisions: 0
        };
        break;
      }

      // Skip follow-up responses during final decision phase
      if (discussionState.finalDecisionPhase) {
        continue;
      }

      // Occasionally allow a second agent to chime in for more dynamic conversations
      if (Math.random() < CONVERSATION_TIMING.FOLLOW_UP_CHANCE && discussionState.groupChat.length > 0) {
        console.log('Adding follow-up response for more dynamic conversation...');
        
        // Let orchestrator select a different agent for follow-up
        const followUpAgent = await letOrchestratorDecideNextAgent(
          agents.filter(a => a.name !== nextAgent.name), 
          discussionState, 
          agentParticipation
        );
        
        if (followUpAgent) {
          agentParticipation.set(followUpAgent.name, (agentParticipation.get(followUpAgent.name) || 0) + 1);
          console.log(`Follow-up agent: ${followUpAgent.name}`);
          
          // Quick follow-up response using consolidated handler
          const followUpPrompt = `You just heard ${nextAgent.name}'s response about the pitch. Give a brief reaction or follow-up comment. Keep it short and natural - just 1-2 sentences.`;
          
          for await (const event of processAgentResponse(followUpAgent, followUpPrompt, discussionState, CONVERSATION_TIMING.FOLLOW_UP_DELAY)) {
            yield event;
          }
        }
      }

      // Check if discussion should continue based on content
      const lastFewMessages = discussionState.groupChat.slice(-3);
      const hasActiveDiscussion = lastFewMessages.some(msg => 
        msg.message.includes('?') || 
        msg.message.includes('disagree') || 
        msg.message.includes('but') ||
        msg.message.includes('however') ||
        msg.message.includes('need more')
      );

      // End early if discussion seems to be winding down and we've had enough turns
      if (discussionState.currentTurn >= 6 && !hasActiveDiscussion) {
        console.log('Discussion seems complete, moving to synthesis...');
        break;
      }
    }

    // Run orchestrator synthesis
    console.log('\n=== ORCHESTRATOR SYNTHESIS ===');
    
    yield {
      type: 'agent_start',
      agent: 'Investment Committee Lead',
      turn: discussionState.currentTurn + 1,
      colors: AGENT_COLORS['Investment Committee Lead']
    };

    try {
      // Use real orchestrator agent for synthesis - now works with Node.js runtime!
      const finalDecisionsSummary = Array.from(discussionState.finalDecisions.values()).map(decision => {
        if (decision.decision === 'PASS') {
          return `❌ ${decision.agentName}: UDE - ${decision.reasoning}`;
        } else {
          return `✅ ${decision.agentName}: ${decision.equity}% for ${decision.amount?.toLocaleString()} kr. - ${decision.valueProposition}`;
        }
      }).join('\n');

      const synthesisPrompt = `Du skal lave en endelig investeringsrapport baseret på diskussionen:

Pitch: "${discussionState.pitch.substring(0, 300)}..."

Diskussion:
${discussionState.groupChat.slice(-10).map(msg => `${msg.sender}: ${msg.message}`).join('\n')}

FINALE INVESTERINGSBESLUTNINGER:
${finalDecisionsSummary}

Lav en struktureret investeringsrapport på dansk med:
1. **Samlet Resultat** (hvor mange investerede vs. afviste)
2. **Investorer Der Er Inde** (med deres tilbud og værditilføjelse)
3. **Investorer Der Er Ude** (med hovedårsager)
4. **Samlet Evaluering** (styrker/svagheder der kom frem)
5. **Markedsmulighed** (potentiale og risici)
6. **Anbefaling** (om pitchet var succesfuldt)

Vær struktureret og professionel som et rigtig investment committee memo.`;

      const finalSynthesis = await getRealAgentResponse(autonomousOrchestrator, synthesisPrompt, discussionState);

      yield {
        type: 'agent_complete',
        agent: 'Investment Committee Lead',
        message: finalSynthesis,
        turn: discussionState.currentTurn + 1,
        colors: AGENT_COLORS['Investment Committee Lead']
      };

    } catch (orchestratorError) {
      console.error('Orchestrator synthesis error:', orchestratorError);
      
      yield {
        type: 'agent_error',
        agent: 'Investment Committee Lead',
        message: 'Error during synthesis. Please review the individual agent insights above.',
        turn: discussionState.currentTurn + 1,
        colors: AGENT_COLORS['Investment Committee Lead'],
        error: orchestratorError instanceof Error ? orchestratorError.message : 'Synthesis error'
      };
    }

    // Signal completion
    yield {
      type: 'discussion_complete',
      turn: discussionState.currentTurn + 1
    };

  } catch (error) {
    console.error('Autonomous discussion error:', error);
    throw error;
  }
}

// Backward compatibility wrapper
export async function runAutonomousMultiAgentPitchAnalysis(
  pitchContent: string, 
  maxTurns: number = DEFAULT_MAX_TURNS
): Promise<{
  success: boolean;
  analysis?: string;
  discussionLog?: Array<{ sender: string; message: string; timestamp: Date }>;
  agentResponses?: Array<{
    agent: string;
    message: string;
    turn: number;
    colors?: { background: string; text: string };
  }>;
  error?: string;
}> {
  try {
    const events = [];
    const agentResponses: Array<{
      agent: string;
      message: string;
      turn: number;
      colors?: { background: string; text: string };
    }> = [];

    for await (const event of runAutonomousMultiAgentAnalysis(pitchContent, maxTurns)) {
      events.push(event);
      
      if (event.type === 'agent_message' || event.type === 'agent_complete') {
        agentResponses.push({
          agent: event.agent!,
          message: event.message!,
          turn: event.turn!,
          colors: event.colors
        });
      }
    }

    const finalSynthesis = agentResponses
      .filter(r => r.agent === 'Investment Committee Lead')
      .pop()?.message || 'Autonomous analysis completed';

    return {
      success: true,
      analysis: finalSynthesis,
      discussionLog: agentResponses.map(response => ({
        sender: response.agent,
        message: response.message,
        timestamp: new Date()
      })),
      agentResponses,
    };
  } catch (error) {
    console.error('Error in autonomous multi-agent analysis:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}