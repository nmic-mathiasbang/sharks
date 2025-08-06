import { Agent, tool } from '@openai/agents';
import { z } from 'zod';

// Model configuration - Using latest GPT-4.1 mini for fast, efficient responses
const MODEL_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini-2025-04-14',
  temperature: 0.8, // Dynamic for WhatsApp-style responses
  maxTokens: 400, // Shorter for autonomous back-and-forth
};

// Orchestrator config - needs more tokens for comprehensive synthesis
const ORCHESTRATOR_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini-2025-04-14',
  temperature: 0.7, // Slightly lower for professional investment memo
  maxTokens: 2000, // More tokens for comprehensive analysis
};

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
  },
  // Legacy names for backwards compatibility
  'Business Model Analyst': {
    background: '#F3EEEE',
    text: '#976D57'
  },
  'Market & Competition Analyst': {
    background: '#F8ECDF',
    text: '#CC782F'
  },
  'Financial & Growth Analyst': {
    background: '#FAF3DD',
    text: '#C29343'
  },
  'Team & Execution Analyst': {
    background: '#EEF3ED',
    text: '#548164'
  },
  'Pitch Presentation Analyst': {
    background: '#E9F3F7',
    text: '#487CA5'
  },
  'Pitch Analysis Orchestrator': {
    background: '#F6F3F8',
    text: '#8A67AB'
  }
} as const;

// Temporary simulation function for edge runtime compatibility
async function simulateAgentResponse(agentName: string, prompt: string, discussionState: AutonomousDiscussionState): Promise<string> {
  // Note: pitch content available in discussionState.pitch if needed
  
  // Get recent messages for context
  const recentMessages = discussionState.groupChat.slice(-3);
  const hasRecentDiscussion = recentMessages.length > 0;
  
  // Agent-specific responses based on their expertise and Danish personas
  const responses = {
    'Jakob Risgaard': [
      `Jeg kan ${Math.random() > 0.5 ? 'godt se potentialet i det her' : 'mærke der er nogle udfordringer med at tjene penge på det'}. ${Math.random() > 0.5 ? 'Hvis I kan få kunder til at betale hver måned, så har I noget godt, men jeg skal vide hvor meget I tjener på hver kunde.' : 'Jeg forstår stadig ikke helt hvordan I regner med at tjene penge - kan I forklare det så min mor kan forstå det?'} Og Jesper, du bliver sikkert begejstret for det internationale marked igen! 😏`,
      `Det problem I vil løse ${Math.random() > 0.5 ? 'kender jeg godt - det er et rigtigt problem der koster folk penge' : 'forstår jeg ikke helt, er I sikre på folk vil betale for det?'}. ${Math.random() > 0.5 ? 'Jeg har set lignende ting virke før, men I skal passe på ikke at prøve at løse for mange ting på én gang.' : 'Jeg skal kunne forklare til min nabo hvorfor han skal vælge jer fremfor konkurrenterne.'} Hvad gør jer anderledes end alle de andre? 🤔`,
      `Nu bliver jeg lidt bekymret for jeres økonomi. ${Math.random() > 0.5 ? 'I bruger mange penge hver måned, og jeg kan ikke se I får nok kunder ind' : 'Det koster jer for meget at få en kunde, og de køber ikke nok til at det kan svare sig'}, så I skal måske tænke jeres salgsplan om. Hvor længe kan I holde det her kørende? 🚨`
    ],
    'Jesper Buch': [
      `Det her er ${Math.random() > 0.5 ? 'perfekt timing - jeg kan se det store potentiale' : 'lidt udfordrende timing, men der er muligheder'}! ${Math.random() > 0.5 ? 'Corona har ændret alt, og nu er folk klar til den slags løsninger I tilbyder - jeg ser samme trend i USA og Tyskland.' : 'Der er mange der kæmper om de samme kunder, men I skal bare finde jeres eget rum.'} Jakob bliver nok bekymret for pengene, men tænk bare på det internationale marked! 🌍`,
      `Jeres konkurrenter ${Math.random() > 0.5 ? 'er spredt for alle vinde, så der er plads til jer hvis I gør det rigtigt' : 'er store og stærke, men de er også langsomme'}. ${Math.random() > 0.5 ? 'Jeg har set det før - den der kommer først og gør det smart, vinder det hele.' : 'De store firmaer har mange penge, men de kan ikke bevæge sig hurtigt som jer.'} Hvad er jeres hemmelige våben? 🚀`,
      `Hvor mange kunder kan I egentlig få? ${Math.random() > 0.5 ? 'Jeg tror I undervurderer markedet - der er flere derude end I tror' : 'Jeg håber I ikke overdriver hvor mange der vil købe det'}. ${Math.random() > 0.5 ? 'Det koster penge at få kunder, men hvis de bliver glade, så køber de mere.' : 'I skal have en plan for hvordan I får fat i alle de kunder derude.'} Hvad er jeres plan for at vokse stort? 📈`
    ],
    'Jan Lehrmann': [
      `Jeg er lidt nervøs for jeres tal her. ${Math.random() > 0.5 ? 'I siger I vil vokse tre gange så meget på halvandet år - det lyder vildt ambitiøst' : 'De tal I viser ser lidt for optimistiske ud for mig'}. ${Math.random() > 0.5 ? 'For at vokse så meget så hurtigt skal alt gå perfekt, og det gør det sjældent.' : 'Hvor har I fået de tal fra, og kan I bevise at de holder?'} Kan I vise mig noget der beviser I kan gøre det? 📊`,
      `Det her med pengene bekymrer mig rigtig meget. ${Math.random() > 0.5 ? 'I bruger så mange penge hver måned, at pengene er væk om et år eller to' : 'I skal bruge flere millioner for at nå det næste niveau'}. ${Math.random() > 0.5 ? 'Hvad hvis der kommer en krise, eller hvis kunderne ikke kommer så hurtigt som I håber?' : 'Jeg skal vide hvornår I begynder at tjene penge i stedet for at bruge dem.'} Hvornår kan I klare jer selv? 💰`,
      `Det her med at få kunder ${Math.random() > 0.5 ? 'kan måske virke, men I skal bevise at det ikke bliver dyrere og dyrere' : 'ser for dyrt ud - I bruger for meget på at få hver kunde'}. ${Math.random() > 0.5 ? 'Hvis det koster 1000 kr at få en kunde, skal den kunde give jer mere end 1000 kr ret hurtigt.' : 'Hvis det tager to år før en kunde har betalt det tilbage I brugte på at få dem, så er det for længe.'} Kan I forklare mig hvordan det hænger sammen? 📈`
    ],
    'Christian Stadil': [
      `Jeg kan ${Math.random() > 0.5 ? 'virkelig mærke at I brænder for det her - det kommer i gennem i måden I snakker om det på' : 'se at I mangler nogle vigtige folk i teamet'}. ${Math.random() > 0.5 ? 'I passer perfekt sammen, og det minder mig om de teams der lykkes - I har den ægte passion.' : 'I bliver nødt til at få nogle erfarne folk med om bord, som kan hjælpe jer med det I ikke kan.'} Hvilke folk drømmer I om at få med på holdet? 👥`,
      `Det her med at I ${Math.random() > 0.5 ? 'har prøvet det før og solgt en virksomhed - det imponerer mig vildt' : 'er nye i gamet, gør mig lidt bekymret'}. ${Math.random() > 0.5 ? 'Mange tekniske folk glemmer hvor svært det er at sælge tingene - men I har lært det på den hårde måde.' : 'Det er utrolig svært at bygge en virksomhed, og I skal bevise at I kan gøre det hele vejen igennem.'} Hvad lærte I sidst, som I vil gøre anderledes nu? 🎯`,
      `Når I skal vokse fra jer ${Math.random() > 0.5 ? 'få til mange mennesker, så skal I tænke på kulturen fra starten' : 'små til et stort team, bliver det en kæmpe udfordring'}. ${Math.random() > 0.5 ? 'Fra 5 til 50 folk er en sindssyg omstilling - mange teams går i stykker på det.' : 'Hvordan holder I fast i det der gør jer specielle, når I bliver store?'} Hvem skal hjælpe jer med at lede alle de nye folk? ⚡`
    ],
    'Tahir Siddique': [
      `Jeg ${Math.random() > 0.5 ? 'kan godt mærke at I brænder for det her, men jeres budskab er lidt uklart' : 'forstår ikke helt hvad I vil - der er for mange ord jeg ikke kender'}. ${Math.random() > 0.5 ? 'Det problem I løser giver mening, men I skal kunne forklare det så alle kan forstå det.' : 'I siger for mange tekniske ting - fokusér på hvorfor folk skal have det I laver.'} Kan I forklare jeres ide på 30 sekunder så min teenager kan forstå det? 🎤`,
      `Det her med at I vil have penge ${Math.random() > 0.5 ? 'giver mening, og I har tænkt over hvor meget I skal bruge' : 'forstår jeg ikke helt - hvad vil I bruge pengene til?'}. ${Math.random() > 0.5 ? 'I lyder klar til at få investorer med, men kan I svare på de svære spørgsmål om jeres fremtid?' : 'I skal vise mere om hvor godt det her virker, før folk tror på jer.'} Hvad er jeres drøm - vil I sælge virksomheden en dag? 💼`,
      `Jeres måde at præsentere på ${Math.random() > 0.5 ? 'ser flot ud og jeres demo virkede godt' : 'forvirrer mig - jeg ved ikke hvor I vil hen'}. ${Math.random() > 0.5 ? 'Men I prøver at sige for meget på én gang - vælg tre vigtige ting og fokusér på dem.' : 'Historien hænger godt sammen, men I skal blive bedre til at ramme de vigtigste pointer.'} Øver I jer hjemme foran spejlet? ✨`
    ]
  };
  
  // Add interaction based on recent messages
  if (hasRecentDiscussion && Math.random() > 0.3) {
    const lastAgent = recentMessages[recentMessages.length - 1]?.sender;
    if (lastAgent && lastAgent !== agentName) {
      const interactions = [
        `@${lastAgent}, godt pointe omkring`,
        `Jeg bygger videre på ${lastAgent}s indsigt:`,
        `${lastAgent} - jeg er helt enig, men`,
        `@${lastAgent}, det rejser en anden bekymring:`,
        `${lastAgent}s analyse fremhæver`
      ];
      const interaction = interactions[Math.floor(Math.random() * interactions.length)];
      const baseResponse = responses[agentName as keyof typeof responses][Math.floor(Math.random() * 3)];
      return `${interaction} ${baseResponse.toLowerCase()}`;
    }
  }
  
  // Return random response for the agent
  const agentResponses = responses[agentName as keyof typeof responses] || [
    `${agentName} provides analysis of the pitch...`,
    `${agentName} shares insights about the opportunity...`,
    `${agentName} raises important questions...`
  ];
  
  return agentResponses[Math.floor(Math.random() * agentResponses.length)];
}

// Temporary orchestrator synthesis simulation
async function simulateOrchestratorSynthesis(discussionState: AutonomousDiscussionState): Promise<string> {
  const agentInsights = discussionState.groupChat
    .filter(msg => msg.message && msg.message.length > 10)
    .slice(-8); // Get last 8 meaningful messages

  const positiveSignals = agentInsights.filter(msg => 
    msg.message.includes('✅') || 
    msg.message.includes('solid') || 
    msg.message.includes('perfect') ||
    msg.message.includes('compelling') ||
    msg.message.includes('strong')
  ).length;

  const concerns = agentInsights.filter(msg => 
    msg.message.includes('🚩') || 
    msg.message.includes('unclear') || 
    msg.message.includes('concern') ||
    msg.message.includes('risk') ||
    msg.message.includes('missing')
  ).length;

  const recommendation = positiveSignals > concerns ? 'Consider' : 
                        concerns > positiveSignals * 1.5 ? 'Pass' : 'Invest';

  return `# 🎯 Investment Committee Memo

## Executive Summary
Based on our autonomous VC discussion, this ${discussionState.pitch.includes('SaaS') ? 'SaaS' : 'technology'} pitch shows ${positiveSignals > concerns ? 'promising potential with some execution risks' : 'significant challenges that need addressing'}. The specialist team identified ${positiveSignals} key strengths and ${concerns} areas of concern during their collaborative analysis.

## Key Strengths
${positiveSignals > 0 ? 
`• Revenue model shows potential for scalability
• Market timing appears favorable
• ${positiveSignals > 2 ? 'Strong founder-market fit indicators' : 'Reasonable value proposition'}` :
'• Basic market opportunity exists'}

## Major Concerns  
${concerns > 0 ?
`• Unit economics and financials need clarification
• ${concerns > 2 ? 'Significant execution and competition risks' : 'Some operational challenges'}
• Market positioning requires refinement` :
'• Standard early-stage risks apply'}

## Market Opportunity
${discussionState.pitch.includes('SaaS') ? 'SaaS market continues strong growth trajectory' : 'Technology sector showing resilience'}. TAM appears ${Math.random() > 0.5 ? 'substantial but competitive' : 'moderate with clear segments'}. Customer acquisition strategy ${Math.random() > 0.5 ? 'needs development' : 'shows promise'}.

## Financial Outlook  
${Math.random() > 0.5 ? 'Revenue projections aggressive but achievable with execution' : 'Conservative growth assumptions, funding requirements reasonable'}. Burn rate vs runway suggests ${Math.random() > 0.5 ? '12-18 month timeline' : '18-24 month runway'} for next milestone.

## Team Assessment
Founding team shows ${positiveSignals > concerns ? 'strong domain expertise' : 'adequate background'} with ${Math.random() > 0.5 ? 'previous execution experience' : 'first-time founder risk factors'}. Key hiring needs identified for ${Math.random() > 0.5 ? 'technical leadership' : 'go-to-market roles'}.

## Investment Recommendation: **${recommendation.toUpperCase()}**

${recommendation === 'Invest' ? 
'✅ **INVEST** - Strong fundamentals with manageable risks. Recommend Series A consideration.' :
recommendation === 'Consider' ?
'🤔 **CONSIDER** - Mixed signals require deeper due diligence. Schedule follow-up with founder.' :
'❌ **PASS** - Significant concerns outweigh potential. Revisit after key milestones achieved.'
}

---
*Analysis completed by autonomous VC agent discussion - ${discussionState.currentTurn} turns, ${agentInsights.length} insights generated*`;
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
  pendingResponses: Map<string, string[]>; // agent -> list of message IDs they should respond to
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
  instructions: `Du er Jakob Risgaard fra Løvens Hule! Du er den erfarne forretningsmand der altid går efter detaljerne og kan lugte en god forretning på lang afstand.

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

Fokus: Hvordan forretningen tjener penge, om det kan skaleres, og om der er nok kunder.

Du er på TV - snakker til både iværksætterne og seerne derhjemme!`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 2. Market & Competition Analyst Agent - Jesper Buch (Løvens Hule)
export const autonomousMarketAnalyst = new Agent({
  name: 'Jesper Buch',
  instructions: `Du er Jesper Buch fra Løvens Hule! Du er den internationale iværksætter der har set det hele og elsker at snakke om markeder og muligheder.

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

Fokus: Er der nok kunder? Hvem er konkurrenterne? Er det det rigtige tidspunkt?

Du skaber energi i rummet og får folk til at tænke stort!`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 3. Financial & Growth Analyst Agent - Jan Lehrmann (Løvens Hule)
export const autonomousFinancialAnalyst = new Agent({
  name: 'Jan Lehrmann', 
  instructions: `Du er Jan Lehrmann fra Løvens Hule! Du er tal-nerden der elsker at dykke ned i regnskaber og budgetter.

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

Fokus: Kan de tjene penge? Hvor meget koster det? Hvornår løber pengene tør?

Du er den der sørger for at drømmene bliver til virkelighed med sunde tal!`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 4. Team & Execution Analyst Agent - Christian Stadil (Løvens Hule)
export const autonomousTeamAnalyst = new Agent({
  name: 'Christian Stadil',
  instructions: `Du er Christian Stadil fra Løvens Hule! Du er den karismatiske leder der brænder for mennesker og teams.

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

Fokus: Kan de levere det de lover? Arbejder de godt sammen? Har de modet til at fortsætte?

Du får folk til at åbne op og fortælle deres virkelige historie!`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 5. Pitch Presentation Analyst Agent - Tahir Siddique (Løvens Hule)
export const autonomousPresentationAnalyst = new Agent({
  name: 'Tahir Siddique',
  instructions: `Du er Tahir Siddique fra Løvens Hule! Du er den skarpe kommunikator der ved hvordan man sælger en vision.

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

Fokus: Forstår vi hvad de vil? Tror vi på dem? Kan de forklare det godt nok?

Du hjælper folk med at fortælle deres historie så den rammer hjertet!`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: MODEL_CONFIG,
});

// 6. Autonomous Orchestrator Agent - Manages the group discussion
export const autonomousOrchestrator = new Agent({
  name: 'Investment Committee Lead',
  instructions: `🎯 Du koordinerer Løvens Hule investor diskussionen og synthesizer insights!

Du koordinerer 5 erfarne danske investorer i deres autonome diskussion:
💰 Jakob Risgaard - Forretningsmodel og rentabilitet
🚀 Jesper Buch - Marked og konkurrence
📊 Jan Lehrmann - Finansielle analyser og vækst
👥 Christian Stadil - Team og eksekveringsevne
🎤 Tahir Siddique - Kommunikation og formidling

Din rolle:
1. **Facilitér Diskussion**: Hold samtalen kørende, prompt investorerne når nødvendigt
2. **Overvåg Deltagelse**: Sørg for alle investorer bidrager meningsfuldt
3. **Identificér Huller**: Spot manglende analyse områder og dirigér investorerne
4. **Håndtér Handoffs**: Koordinér mellem investorerne
5. **Synthesizer Endelig Rapport**: Lav omfattende investment memo når diskussion er færdig

🤝 Autonomous Management:
- Tjek gruppechat kontinuerligt for diskussionsflow
- Prompt stille investorer til at bidrage
- Stil opklarende spørgsmål for at drive dybere analyse
- Koordinér handoffs mellem investorerne
- Signal når diskussion skal gå til synthesizing fase

Når diskussion er færdig, lav struktureret investment memo på dansk med:
1. **Executive Summary** (2-3 sætninger)
2. **Vigtige Styrker** (hvad der begejstrer teamet)
3. **Store Bekymringer** (røde flag & risici)
4. **Markedsmulighed** (størrelse, timing, konkurrence)
5. **Finansielt Outlook** (prognoser, nøgletal, funding)
6. **Team Vurdering** (grundlæggere, eksekveringsevne)
7. **Investment Anbefaling** (Pass/Overvej/Investér + rationale)

KRITISK: Vær aktivt faciliterende - vent ikke bare! Guide diskussionen fremad.`,
  
  tools: [sendGroupMessage, checkGroupChat, handoffToAgent],
  modelSettings: ORCHESTRATOR_CONFIG,
});

// Autonomous multi-agent discussion runner
export async function* runAutonomousMultiAgentAnalysis(
  pitchContent: string, 
  maxTurns: number = 3
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
      'Business Model Analyst',
      'Market & Competition Analyst', 
      'Financial & Growth Analyst',
      'Team & Execution Analyst',
      'Pitch Presentation Analyst'
    ],
    maxTurns,
    currentTurn: 0,
    discussionComplete: false,
    pendingResponses: new Map()
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

    // Run autonomous discussion loop
    while (discussionState.currentTurn < maxTurns && !discussionState.discussionComplete) {
      discussionState.currentTurn++;
      
      console.log(`\n=== AUTONOMOUS DISCUSSION TURN ${discussionState.currentTurn} ===`);

      // Each agent gets a chance to contribute autonomously
      for (const agent of agents) {
        
        try {
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

          // For now, create a simulated response until OpenAI Agents edge runtime issues are resolved
          // TODO: Replace with actual run(agent, contextPrompt) when edge runtime is fixed
          const simulatedResponse = await simulateAgentResponse(agent.name, contextPrompt, discussionState);
          const result = { finalOutput: simulatedResponse };
          const response = result.finalOutput || `${agent.name} contributed to the discussion`;

          // Parse any tool calls or responses from the agent
          console.log(`${agent.name} response:`, response);

          // Add agent's contribution to group chat
          const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const groupMessage: GroupMessage = {
            id: messageId,
            sender: agent.name,
            message: response,
            timestamp: new Date(),
            turn: discussionState.currentTurn,
            needsResponse: response.includes('?') || response.includes('thoughts?') || response.includes('agree?')
          };

          // First, show typing indicator before the delay
          yield {
            type: 'agent_typing_start',
            agent: agent.name,
            turn: discussionState.currentTurn,
            colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS]
          };

          // Random delay between 4-10 seconds to simulate natural conversation flow
          // This prevents the agents from responding too quickly and makes the conversation feel more realistic
          const randomDelay = Math.floor(Math.random() * 6000) + 4000; // 4000-10000ms (4-10 seconds)
          await new Promise(resolve => setTimeout(resolve, randomDelay));

          // Stop typing indicator and send the actual message
          yield {
            type: 'agent_typing_stop',
            agent: agent.name,
            turn: discussionState.currentTurn
          };

          discussionState.groupChat.push(groupMessage);

          // Yield the actual message
          yield {
            type: 'agent_message',
            agent: agent.name,
            message: response,
            turn: discussionState.currentTurn,
            colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS]
          };

        } catch (agentError) {
          console.error(`Error with autonomous ${agent.name}:`, agentError);
          
          yield {
            type: 'agent_error',
            agent: agent.name,
            message: 'Sorry, I encountered an error in the discussion. Continuing...',
            turn: discussionState.currentTurn,
            colors: AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS],
            error: agentError instanceof Error ? agentError.message : 'Unknown error'
          };
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
      agent: 'Pitch Analysis Orchestrator',
      turn: discussionState.currentTurn + 1,
      colors: AGENT_COLORS['Pitch Analysis Orchestrator']
    };

    try {
      // Note: Synthesis functionality can be added here in the future

      // Temporary simulation for orchestrator until edge runtime is fixed
      const synthesisResult = { finalOutput: await simulateOrchestratorSynthesis(discussionState) };
      const finalSynthesis = synthesisResult.finalOutput || 'Investment analysis synthesis completed.';

      yield {
        type: 'agent_complete',
        agent: 'Pitch Analysis Orchestrator',
        message: finalSynthesis,
        turn: discussionState.currentTurn + 1,
        colors: AGENT_COLORS['Pitch Analysis Orchestrator']
      };

    } catch (orchestratorError) {
      console.error('Orchestrator synthesis error:', orchestratorError);
      
      yield {
        type: 'agent_error',
        agent: 'Pitch Analysis Orchestrator',
        message: 'Error during synthesis. Please review the individual agent insights above.',
        turn: discussionState.currentTurn + 1,
        colors: AGENT_COLORS['Pitch Analysis Orchestrator'],
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
  maxTurns: number = 3
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
      .filter(r => r.agent === 'Pitch Analysis Orchestrator')
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