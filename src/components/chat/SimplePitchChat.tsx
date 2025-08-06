"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, TrendingUp, Users, Presentation, DollarSign, Target } from "lucide-react";
import { AGENT_COLORS } from "@/lib/agents/autonomous-multi-agent-analyzer";

// Function to get investor profile picture
const getInvestorAvatar = (agentName: string): string => {
  const avatarMap: Record<string, string> = {
    'Jakob Risgaard': '/assets/investors/jakob-risgaard.jpg',
    'Jesper Buch': '/assets/investors/jesper-buch.jpg',
    'Jan Lehrmann': '/assets/investors/jan-lehrmann.jpg',
    'Christian Stadil': '/assets/investors/christian-stadil.jpg',
    'Tahir Siddique': '/assets/investors/tahir-siddique.jpg',
    'Investment Committee Lead': '/assets/investors/orchestrator.jpg'
  };
  
  return avatarMap[agentName] || `/assets/investors/default-avatar.svg`;
};

// Note: AGENT_LAYOUT not currently used but kept for future features

// Simple message type
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
  agentName?: string; // Optional agent name for multi-agent responses
  colors?: { background: string; text: string }; // Optional colors for agent theming
  isStreaming?: boolean; // Indicates if message is currently being streamed
}

interface SimplePitchChatProps {
  initialPitch?: string;
  analysisMode?: 'original' | 'quick' | 'multi-agent' | 'autonomous';
  maxTurns?: number;
}

export function SimplePitchChat({ 
  initialPitch, 
  analysisMode = 'original', 
  maxTurns = 6 
}: SimplePitchChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // const [initialized, setInitialized] = useState(false); // Future use
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const initializationRef = useRef(false); // Prevent double initialization
  const isAnalyzingRef = useRef(false); // Prevent double API calls

  // Generate unique ID
  const generateId = () => {
    idCounter.current += 1;
    return "msg-" + idCounter.current + "-" + Date.now();
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with pitch analysis
  useEffect(() => {
    if (initialPitch && !initializationRef.current && messages.length === 0 && !isLoading) {
      initializationRef.current = true; // Use ref to prevent double runs
      // setInitialized(true); // Future use
      analyzePitch(initialPitch);
    }
  }, [initialPitch, messages.length, isLoading]);

  // Add message to chat
  const addMessage = (
    role: 'user' | 'assistant', 
    content: string, 
    loading = false, 
    agentName?: string,
    colors?: { background: string; text: string },
    isStreaming = false
  ): string => {
    const id = generateId();
    const newMessage: Message = {
      id,
      role,
      content,
      timestamp: new Date(),
      loading,
      agentName,
      colors,
      isStreaming,
    };
    
    setMessages(prev => [...prev, newMessage]);
    return id;
  };

  // Update existing message
  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      )
    );
  };

  // Handle sending user messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message
    addMessage('user', userMessage);
    
    // Add loading response
    const loadingId = addMessage('assistant', 'Analyzing your message...', true);
    
    // Simulate response (replace with actual API call)
    setTimeout(() => {
      updateMessage(loadingId, {
        content: 'Thank you for your message. This is a simulated response for the light mode interface.',
        loading: false
      });
    }, 2000);
  };

  // Main pitch analysis function with streaming
  const analyzePitch = async (pitch: string) => {
    if (isAnalyzingRef.current) return; // Prevent double API calls
    isAnalyzingRef.current = true;
    
    setIsLoading(true);
    
    // Track typing indicators by agent name for more robust management
    const typingIndicators = new Map<string, string>();
    
    try {
      // Add user message
      addMessage('user', pitch);
      
      // Add loading assistant message
      const loadingText = analysisMode === 'autonomous' 
        ? "🇩🇰 Starter Løvens Hule diskussion... Danske investorer vil diskutere naturligt med 4-10 sekunder mellem beskeder."
        : "Starter multi-agent analyse... Specialist agenter vil svare i real-time.";
      const loadingId = addMessage('assistant', loadingText, true);
      
      // Call appropriate streaming API based on mode
      const apiEndpoint = analysisMode === 'autonomous' 
        ? '/api/analyze-pitch-autonomous'
        : '/api/analyze-pitch-stream';
        
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pitch, 
          maxTurns 
        }),
      });

      if (!response.ok) {
        throw new Error("HTTP error! status: " + response.status);
      }

      // Remove loading message
      setMessages(prev => prev.filter(msg => msg.id !== loadingId));
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let currentAgentMessageId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              
              switch (eventData.type) {
                case 'agent_start':
                  // For autonomous mode, don't show agents until they have a message
                  // For non-autonomous mode, show "analyzing..." status
                  if (analysisMode !== 'autonomous') {
                    const startContent = eventData.agent + " is analyzing...";
                    currentAgentMessageId = addMessage(
                      'assistant', 
                      startContent, 
                      false, 
                      eventData.agent,
                      eventData.colors,
                      true
                    );
                  }
                  // For autonomous mode, just track the agent but don't add a message yet
                  break;
                  
                case 'agent_message':
                  // Handle autonomous agent messages (real-time chat)
                  addMessage(
                    'assistant',
                    eventData.message,
                    false,
                    eventData.agent,
                    eventData.colors,
                    false
                  );
                  break;

                case 'agent_complete':
                  // Update the current agent's message with the complete response
                  if (currentAgentMessageId) {
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === currentAgentMessageId 
                          ? { 
                              ...msg, 
                              content: eventData.message, 
                              loading: false,
                              isStreaming: false 
                            }
                          : msg
                      )
                    );
                    currentAgentMessageId = null;
                  }
                  break;

                case 'agent_error':
                  // Handle agent errors
                  if (currentAgentMessageId) {
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === currentAgentMessageId 
                          ? { 
                              ...msg, 
                              content: eventData.message || 'An error occurred', 
                              loading: false,
                              isStreaming: false 
                            }
                          : msg
                      )
                    );
                    currentAgentMessageId = null;
                  }
                  break;

                case 'analysis_complete':
                  console.log('Multi-agent analysis completed');
                  break;
                  
                case 'discussion_complete':
                  console.log('Autonomous discussion completed');
                  break;

                case 'stream_complete':
                  console.log('Stream completed');
                  break;

                case 'agent_typing_start':
                  // Show typing indicator for the agent
                  const typingMessageId = addMessage(
                    'assistant',
                    '...',
                    false,
                    eventData.agent,
                    eventData.colors,
                    true
                  );
                  // Track this typing indicator by agent name
                  typingIndicators.set(eventData.agent, typingMessageId);
                  break;

                case 'agent_typing_stop':
                  // Remove typing indicator for the specific agent
                  const agentTypingId = typingIndicators.get(eventData.agent);
                  if (agentTypingId) {
                    setMessages(prev => prev.filter(msg => msg.id !== agentTypingId));
                    typingIndicators.delete(eventData.agent);
                  }
                  break;

                case 'error':
                  throw new Error(eventData.error || 'Stream error occurred');
              }
            } catch (parseError) {
              console.error('Error parsing stream event:', parseError);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error analyzing pitch:', error);
      
      // Clean up any remaining typing indicators
      typingIndicators.forEach(messageId => {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      });
      
      // Add error message
      addMessage(
        'assistant', 
        'Sorry, there was an error analyzing your pitch. Please try again.',
        false
      );
    } finally {
      // Clean up any remaining typing indicators on completion
      typingIndicators.forEach(messageId => {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      });
      setIsLoading(false);
      isAnalyzingRef.current = false;
    }
  };

  return (
    <div className="flex h-screen bg-[#e5ddd5] text-[#111b21]">
      {/* Left Sidebar - Chat List */}
      <div className="w-[20%] bg-white border-r border-[#e5e7eb] flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 bg-[#f0f2f5] border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img
                src="/assets/investors/chatprofile.png"
                alt="Løvens Hule Group"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to the green circle with Users icon if image fails
                  e.currentTarget.style.display = 'none';
                  const container = e.currentTarget.parentElement;
                  if (container && !container.querySelector('.fallback-group-icon')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-group-icon w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center';
                    fallback.innerHTML = '<svg class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4H4zM13 2v2c0 1.1-.9 2-2 2s-2-.9-2-2V2h4zM12 6c2.21 0 4 1.79 4 4 0 1.67-1 3.11-2.4 3.73v2.26h-3.2v-2.26C9 13.11 8 11.67 8 10c0-2.21 1.79-4 4-4z"/></svg>';
                    container.appendChild(fallback);
                  }
                }}
              />
            </div>
            <div>
              <h2 className="font-medium text-[#111b21]">Løvens Hule</h2>
              <p className="text-xs text-[#667781]">
                {analysisMode === 'autonomous' ? 'Investor Diskussion' : 'Pitch Analyse'}
              </p>
            </div>
          </div>
        </div>

        {/* Agent List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <div className="text-xs text-[#667781] mb-3 uppercase tracking-wide">Løvens Hule Investorer</div>
            {[
              { name: 'Jakob Risgaard', icon: DollarSign, status: 'analyserer forretningsmodel' },
              { name: 'Jesper Buch', icon: TrendingUp, status: 'vurderer marked & konkurrence' },
              { name: 'Jan Lehrmann', icon: Presentation, status: 'gennemgår finansielle tal' },
              { name: 'Christian Stadil', icon: Users, status: 'evaluerer team & execution' },
              { name: 'Tahir Siddique', icon: Target, status: 'bedømmer pitch kvalitet' },
              { name: 'Investment Committee Lead', icon: Bot, status: 'synthesizing insights' }
            ].map((agent, index) => {
              const agentColors = AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS] || { background: '#f3f4f6', text: '#6b7280' };
              
              return (
                <div key={index} className="flex items-center gap-3 p-3 hover:bg-[#f5f6fa] rounded-lg cursor-pointer">
                  <div className="relative w-12 h-12">
                    <img
                      src={getInvestorAvatar(agent.name)}
                      alt={agent.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#e5e7eb]"
                      onError={(e) => {
                        // Fallback to icon background if image fails to load
                        e.currentTarget.style.display = 'none';
                        const container = e.currentTarget.parentElement;
                        if (container && !container.querySelector('.fallback-icon')) {
                          const fallback = document.createElement('div');
                          fallback.className = 'fallback-icon w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium border-2 border-[#e5e7eb]';
                          fallback.style.backgroundColor = agentColors.background;
                          fallback.style.color = agentColors.text;
                          const icon = document.createElement('div');
                          icon.innerHTML = `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
                          fallback.appendChild(icon);
                          container.appendChild(fallback);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[#111b21] text-sm font-medium">{agent.name}</h3>
                      <span className="text-xs text-[#667781]">now</span>
                    </div>
                    <p className="text-xs text-[#667781] truncate">{agent.status}</p>
                  </div>
                  <div className="w-2 h-2 bg-[#25d366] rounded-full"></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5]">
        {/* Chat Header */}
        <div className="bg-[#f0f2f5] border-b border-[#e5e7eb] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img
                  src="/assets/investors/chatprofile.png"
                  alt="Løvens Hule Group"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to the green circle with Users icon if image fails
                    e.currentTarget.style.display = 'none';
                    const container = e.currentTarget.parentElement;
                    if (container && !container.querySelector('.fallback-group-icon')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'fallback-group-icon w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center';
                      fallback.innerHTML = '<svg class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4H4zM13 2v2c0 1.1-.9 2-2 2s-2-.9-2-2V2h4zM12 6c2.21 0 4 1.79 4 4 0 1.67-1 3.11-2.4 3.73v2.26h-3.2v-2.26C9 13.11 8 11.67 8 10c0-2.21 1.79-4 4-4z"/></svg>';
                      container.appendChild(fallback);
                    }
                  }}
                />
              </div>
              <div>
                <h1 className="text-[#111b21] font-medium">
                  {analysisMode === 'autonomous' ? 'Løvens Hule Diskussion' : 'Løvens Hule Pitch Analyse'}
                </h1>
                <p className="text-xs text-[#667781]">
                  {analysisMode === 'autonomous' 
                    ? 'Danske investorer diskuterer • ' + maxTurns + ' runder • 4-10s ventetid'
                    : maxTurns + ' specialister online'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[#667781]">
              <button className="hover:text-[#111b21]">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </button>
              <button className="hover:text-[#111b21]">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button className="hover:text-[#111b21]">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      
        {/* Messages Area */}
        <div 
          className="flex-1 overflow-y-auto p-4 relative"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.05'%3E%3Cpath d='M50 15L85 50L50 85L15 50Z' fill='%23667781'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: '100px 100px'
          }}
        >
          <div className="space-y-3 max-w-4xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="bg-white rounded-lg p-6 mx-auto max-w-md shadow-sm border border-[#e5e7eb]">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-[#667781]" />
                  <p className="text-[#667781] text-sm">Din pitch analyse vil vises her...</p>
                  <p className="text-[#667781] text-xs mt-2">Løvens Hule investorerne vil diskutere dit pitch i real-time</p>
                </div>
              </div>
            )}
            
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const isOrchestrator = message.agentName === 'Pitch Analysis Orchestrator';
              
              return (
                <div
                  key={message.id}
                  className={isUser ? "flex justify-end mb-2" : "flex justify-start mb-2"}
                >
                  {/* Profile picture for agents */}
                  {!isUser && message.agentName && (
                    <div className="flex-shrink-0 mr-3 order-1">
                      <img
                        src={getInvestorAvatar(message.agentName)}
                        alt={message.agentName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#e5e7eb]"
                        onError={(e) => {
                          // Fallback to a colored circle with initials if image fails to load
                          e.currentTarget.style.display = 'none';
                          const container = e.currentTarget.parentElement;
                          if (container && !container.querySelector('.fallback-avatar')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'fallback-avatar w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 border-[#e5e7eb]';
                            fallback.style.backgroundColor = message.colors?.background || '#f3f4f6';
                            fallback.style.color = message.colors?.text || '#6b7280';
                            fallback.textContent = (message.agentName || 'Unknown').split(' ').map(n => n[0]).join('').toUpperCase();
                            container.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  <div className={isUser ? "max-w-[75%] order-1" : "max-w-[75%] order-2"}>
                    {!isUser && message.agentName && (
                      <div className="text-xs text-[#667781] mb-1 ml-3 font-medium">
                        {message.agentName}
                      </div>
                    )}
                    
                    <div
                      className={
                        isUser
                          ? 'relative rounded-lg px-4 py-2 bg-[#25d366] text-white rounded-br-none'
                          : isOrchestrator
                          ? 'relative rounded-lg px-4 py-2 bg-white text-[#111b21] border border-[#25d366] shadow-sm'
                          : 'relative rounded-lg px-4 py-2 bg-white text-[#111b21] rounded-bl-none shadow-sm'
                      }
                      style={
                        !isUser && !isOrchestrator && message.colors
                          ? {
                              backgroundColor: message.colors.background,
                              color: message.colors.text,
                              border: "1px solid " + message.colors.text + "40"
                            }
                          : undefined
                      }
                    >
                      {message.loading ? (
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-[#667781] rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-[#667781] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-[#667781] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm text-[#667781]">{message.content}</span>
                        </div>
                      ) : (
                        <>
                          {message.isStreaming && (
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex space-x-1">
                                <div className="w-1 h-1 bg-[#25d366] rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-[#25d366] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1 h-1 bg-[#25d366] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-xs text-[#25d366]">typing...</span>
                            </div>
                          )}
                          
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </div>
                          
                          <div className={
                            isUser 
                              ? 'flex items-center justify-end gap-1 mt-2 text-xs text-[#ffffff99]' 
                              : 'flex items-center justify-end gap-1 mt-2 text-xs text-[#667781]'
                          }>
                            <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isUser && (
                              <svg className="w-4 h-4 text-[#ffffff99]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </>
                      )}
                      
                      <div 
                        className={
                          isUser 
                            ? 'absolute top-0 w-0 h-0 right-[-8px] border-l-[8px] border-l-[#25d366] border-t-[8px] border-t-transparent'
                            : 'absolute top-0 w-0 h-0 left-[-8px] border-r-[8px] border-r-white border-t-[8px] border-t-transparent'
                        }
                        style={
                          !isUser && !isOrchestrator && message.colors
                            ? { borderRightColor: message.colors.background }
                            : isOrchestrator && !isUser
                            ? { borderRightColor: 'white' }
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Input Area */}
        <div className="bg-[#f0f2f5] p-4 border-t border-[#e5e7eb]">
          <form onSubmit={handleSendMessage} className="flex items-end gap-3">
            <button 
              type="button"
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-[#667781] hover:text-[#111b21] transition-colors border border-[#e5e7eb]"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
              </svg>
            </button>

            <div className="flex-1 bg-white rounded-lg overflow-hidden border border-[#e5e7eb]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type a message"
                disabled={isLoading}
                rows={1}
                className="w-full px-4 py-3 bg-transparent text-[#111b21] placeholder-[#667781] resize-none outline-none min-h-[20px] max-h-[120px]"
                style={{ 
                  height: 'auto',
                  minHeight: '44px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
            </div>

            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-[#25d366] hover:bg-[#20bf5a] disabled:bg-[#e5e7eb] disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
            >
              {isLoading ? (
                <div className="w-5 h-5">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}