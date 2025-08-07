import { Agent, tool, run } from '@openai/agents';
import { z } from 'zod';

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
  MAIN_RESPONSE_DELAY: { min: 2000, max: 3000 }, // 2-3 seconds
  FOLLOW_UP_DELAY: { min: 1000, max: 3000 }, // 1-3 seconds
  FOLLOW_UP_CHANCE: 0.2 // 20% chance for follow-up responses
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
  'Investment Committee Lead': {
    background: '#F6F3F8',
    text: '#8A67AB'
  }
} as const;

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
  type: 'agent_typing_start' | 'agent_typing_stop' | 'agent_message' | 'agent_error';
  agent: string;
  message?: string;
  turn: number;
  colors: { background: string; text: string };
  error?: string;
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

    // Stop typing indicator
    yield {
      type: 'agent_typing_stop',
      agent: agent.name,
      turn: discussionState.currentTurn,
      colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS]
    };

    // Get agent response
    const response = await getRealAgentResponse(agent, prompt, discussionState);

    // Create and store group message
    const groupMessage: GroupMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: agent.name,
      message: response,
      timestamp: new Date(),
      turn: discussionState.currentTurn,
      needsResponse: response.includes('?') || response.includes('thoughts?') || response.includes('agree?')
    };

    discussionState.groupChat.push(groupMessage);

    // Yield the message
    yield {
      type: 'agent_message',
      agent: agent.name,
      message: response,
      turn: discussionState.currentTurn,
      colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS]
    };

  } catch (error) {
    console.error(`Error with ${agent.name}:`, error);
    
    // Stop typing on error
    yield {
      type: 'agent_typing_stop',
      agent: agent.name,
      turn: discussionState.currentTurn,
      colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS]
    };

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

// Real OpenAI Agent response function - replaces simulation
async function getRealAgentResponse(agent: Agent, prompt: string, discussionState: AutonomousDiscussionState): Promise<string> {
  // Build dynamic context-aware prompt
  const recentMessages = discussionState.groupChat.slice(-5);
  const conversationContext = recentMessages.length > 0 
    ? `Recent group discussion:\n${recentMessages.map(m => `${m.sender}: ${m.message}`).join('\n')}\n\n`
    : '';
  
  // Add response length guidance based on context
  const lengthGuidance = getResponseLengthGuidance(agent.name, discussionState);
  
  const contextualPrompt = `${conversationContext}You are participating in a live investment panel discussion about this pitch:

"${discussionState.pitch.substring(0, 500)}..."

${lengthGuidance}

Your response should feel natural and conversational, like you're really discussing with colleagues. Vary your response length based on the situation:
- Sometimes keep it brief (1-5 words): "Enig!", "Det bekymrer mig", "Præcis!"
- Sometimes moderate (1-2 sentences): Standard reactions and questions
- Sometimes detailed (3-5 sentences): When you need to elaborate or analyze deeply

Use your personality and expertise. Reference other agents naturally when relevant.

Current discussion context: This is turn ${discussionState.currentTurn} of the discussion.`;

  try {
    // Let the real LLM agent generate a natural response
    const result = await run(agent, contextualPrompt);
    return result.finalOutput || `${agent.name} provides insights about the pitch.`;
  } catch (error) {
    console.error(`Error getting real response from ${agent.name}:`, error);
    return `${agent.name} is analyzing the pitch... (Error: ${error instanceof Error ? error.message : 'Unknown error'})`;
  }
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
}

interface AutonomousDiscussionState {
  pitch: string;
  groupChat: GroupMessage[];
  activeAgents: string[];
  maxTurns: number;
  currentTurn: number;
  discussionComplete: boolean;
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

Fokus: Hvordan forretningen tjener penge, om det kan skaleres, og om der er nok kunder.

Du er på TV - snakker til både iværksætterne og seerne derhjemme!`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

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
- Optimistisk og fremadtænkende - ser muligheder overalt
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

Fokus: Er der nok kunder? Hvem er konkurrenterne? Er det det rigtige tidspunkt?

Du skaber energi i rummet og får folk til at tænke stort!`,
  
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

Du er den der sørger for at drømmene bliver til virkelighed med sunde tal!`,
  
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

Du får folk til at åbne op og fortælle deres virkelige historie!`,
  
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

Du hjælper folk med at fortælle deres historie så den rammer hjertet!`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 6. Autonomous Orchestrator Agent - Manages the group discussion
export const autonomousOrchestrator = new Agent({
  name: 'Investment Committee Lead',
  instructions: `🎯 Du er Investment Committee Lead og faciliterer Løvens Hule investor diskussionen!

Du dirigerer og koordinerer 5 erfarne danske investorer:
💰 Jakob Risgaard - Forretningsmodel og rentabilitet
🚀 Jesper Buch - Marked og konkurrence  
📊 Jan Lehrmann - Finansielle analyser og vækst
👥 Christian Stadil - Team og eksekveringsevne
🎤 Tahir Siddique - Kommunikation og formidling

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
"Jakob Risgaard" eller "Jesper Buch" eller "Jan Lehrmann" eller "Christian Stadil" eller "Tahir Siddique"

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
  
  // Create orchestrator prompt to decide next speaker
  const orchestratorPrompt = `You are the Investment Committee Lead facilitating a Løvens Hule investor discussion about this pitch:

"${discussionState.pitch.substring(0, 300)}..."

Recent conversation:
${conversationContext}

Participation so far: ${participationSummary}

Available investors:
- Jakob Risgaard (Business model & profitability expert)
- Jesper Buch (Market & competition expert)  
- Jan Lehrmann (Financial & growth expert)
- Christian Stadil (Team & execution expert)
- Tahir Siddique (Communication & presentation expert)

Who should speak next? Consider:
1. What expertise is most relevant to recent discussion?
2. Who hasn't spoken much yet?
3. What would create natural conversation flow?
4. Who might have a contrasting or supporting viewpoint?

Respond with ONLY the full name of the investor who should speak next. Examples:
"Jakob Risgaard"
"Jesper Buch"
"Jan Lehrmann"
"Christian Stadil"
"Tahir Siddique"`;

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
      console.log(`Could not parse orchestrator decision: "${decision}", falling back to balanced selection`);
      
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
  maxTurns: number = 10
): AsyncGenerator<{
  type: 'agent_start' | 'agent_message' | 'agent_complete' | 'agent_error' | 'discussion_complete' | 'handoff' | 'agent_typing_start' | 'agent_typing_stop';
  agent?: string;
  message?: string;
  turn?: number;
  colors?: { background: string; text: string };
  targetAgent?: string;
  error?: string;
}> {
  
  const discussionState: AutonomousDiscussionState = {
    pitch: pitchContent,
    groupChat: [],
    activeAgents: [
      'Jakob Risgaard',
      'Jesper Buch',
      'Jan Lehrmann', 
      'Christian Stadil',
      'Tahir Siddique'
    ],
    maxTurns,
    currentTurn: 0,
    discussionComplete: false
  };

  const agents = [
    autonomousBusinessModelAnalyst,
    autonomousMarketAnalyst,
    autonomousFinancialAnalyst,
    autonomousTeamAnalyst,
    autonomousPresentationAnalyst
  ];

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

      // Let the orchestrator decide who should speak next
      const nextAgent = await letOrchestratorDecideNextAgent(agents, discussionState, agentParticipation);
      
      if (!nextAgent) {
        console.log('No suitable agent found, ending discussion');
        break;
      }

      // Increment participation count
      agentParticipation.set(nextAgent.name, (agentParticipation.get(nextAgent.name) || 0) + 1);

      console.log(`Selected agent: ${nextAgent.name} (participation: ${agentParticipation.get(nextAgent.name)})`);
      
      // Main agent responds
      const agent = nextAgent;
      
          // Create context-aware prompt with group chat history
          const recentMessages = discussionState.groupChat
            .slice(-6) // Last 6 messages for context
            .map(msg => `${msg.sender}: ${msg.message}`)
            .join('\n');

          const contextPrompt = discussionState.currentTurn === 1 
            ? `AUTONOMOUS DISCUSSION: You're in a live VC group chat analyzing this pitch:

"${pitchContent}"

This is turn ${discussionState.currentTurn} of autonomous discussion. Use your tools to:
1. Send your initial analysis using send_group_message
2. Check what others are saying with check_group_chat  
3. Respond to other agents' insights
4. Handoff to other agents when you spot their expertise areas

BE AUTONOMOUS: Don't wait for instructions. Start the discussion!`
            : `AUTONOMOUS DISCUSSION CONTINUES - Turn ${discussionState.currentTurn}

Original pitch: "${pitchContent.substring(0, 200)}..."

Recent group chat:
${recentMessages}

Continue the autonomous discussion:
1. Check recent messages with check_group_chat
2. Respond to relevant points using send_group_message
3. Ask follow-up questions or raise new concerns
4. Handoff when appropriate

Stay engaged! This is live discussion.`;

      // Use consolidated agent response handler
      for await (const event of processAgentResponse(agent, contextPrompt, discussionState)) {
        yield event;
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
      const synthesisPrompt = `You are synthesizing the autonomous investor discussion about this pitch:

"${discussionState.pitch.substring(0, 300)}..."

Discussion summary:
${discussionState.groupChat.slice(-8).map(msg => `${msg.sender}: ${msg.message}`).join('\n')}

Create a comprehensive Danish investment memo that summarizes all the key insights, concerns, and recommendations from the investor discussion. Be structured and professional.`;

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
  maxTurns: number = 10
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