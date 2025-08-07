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
  const [activeTypers, setActiveTypers] = useState<Set<string>>(new Set()); // Track who's currently typing
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
                  // Add agent to active typers set
                  setActiveTypers(prev => new Set([...prev, eventData.agent]));
                  break;

                case 'agent_typing_stop':
                  // Remove agent from active typers set
                  setActiveTypers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(eventData.agent);
                    return newSet;
                  });
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
      
      // Clear any active typing states
      setActiveTypers(new Set());
      
      // Add error message
      addMessage(
        'assistant', 
        'Sorry, there was an error analyzing your pitch. Please try again.',
        false
      );
    } finally {
      // Clear any remaining typing states on completion
      setActiveTypers(new Set());
      setIsLoading(false);
      isAnalyzingRef.current = false;
    }
  };

  return (
    <div className="flex h-screen bg-[#e5ddd5] text-[#111b21]">
      {/* Left Icon Menu */}
      <div className="w-20 bg-[#f5f5f5] border-r border-[#e5e7eb] flex flex-col">
        {/* macOS Traffic Light Buttons */}
        <div className="flex items-center gap-2 p-3">
          <div className="w-3 h-3 bg-[#ff5f57] rounded-full hover:bg-[#ff3b30] cursor-pointer"></div>
          <div className="w-3 h-3 bg-[#ffbd2e] rounded-full hover:bg-[#ff9500] cursor-pointer"></div>
          <div className="w-3 h-3 bg-[#28ca42] rounded-full hover:bg-[#30d158] cursor-pointer"></div>
        </div>

        {/* Menu Icons */}
        <div className="flex flex-col items-center pt-4 space-y-6">
          {/* Chat Icon - Active */}
          <div className="w-12 h-12 bg-[#e0e0e0] rounded-xl flex items-center justify-center text-[#333333] cursor-pointer shadow-sm">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>

          {/* Phone Icon */}
          <div className="w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#007aff] cursor-pointer">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
          </div>

          {/* TableTalk Icon */}
          <div className="w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#007aff] cursor-pointer">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>

          {/* Archive Icon */}
          <div className="w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#007aff] cursor-pointer">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>
            </svg>
          </div>

          {/* Starred Icon */}
          <div className="w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#007aff] cursor-pointer">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </div>
        </div>

        {/* Settings Icon at Bottom */}
        <div className="flex-1"></div>
        <div className="pb-4 flex justify-center">
          <div className="w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#007aff] cursor-pointer">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-[30%] bg-white border-r border-[#e5e7eb] flex flex-col">
        {/* WhatsApp-style Header */}
        <div className="p-4 bg-white border-b border-[#e5e7eb]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#111b21]">Chats</h1>
          <div className="flex items-center gap-3">
              {/* New Chat Icon */}
              <div className="w-6 h-6 cursor-pointer text-[#8696a0] hover:text-[#111b21]">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"/>
                </svg>
              </div>
              {/* Menu Icon */}
              <div className="w-6 h-6 cursor-pointer text-[#8696a0] hover:text-[#111b21]">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"/>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-[#8696a0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Søg"
              className="w-full pl-10 pr-4 py-2 bg-[#f0f2f5] border border-transparent rounded-lg text-sm text-[#111b21] placeholder-[#8696a0] focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:border-transparent"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {/* Group Chat - Single entry with overlapping profile images - ACTIVE */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] cursor-pointer border-b border-[#e5e7eb]">
            <div className="relative w-12 h-12">
              {/* Overlapping profile images */}
              <div className="relative w-12 h-12">
                {/* Back row - 3 images */}
                <img
                  src={getInvestorAvatar('Jakob Risgaard')}
                  alt="Jakob Risgaard"
                  className="absolute top-0 left-0 w-7 h-7 rounded-full object-cover border-2 border-white z-10"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <img
                  src={getInvestorAvatar('Jesper Buch')}
                  alt="Jesper Buch"
                  className="absolute top-0 right-0 w-7 h-7 rounded-full object-cover border-2 border-white z-10"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <img
                  src={getInvestorAvatar('Jan Lehrmann')}
                  alt="Jan Lehrmann"
                  className="absolute bottom-0 left-1 w-7 h-7 rounded-full object-cover border-2 border-white z-10"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* Front row - 2 images */}
                <img
                  src={getInvestorAvatar('Christian Stadil')}
                  alt="Christian Stadil"
                  className="absolute bottom-0 right-1 w-7 h-7 rounded-full object-cover border-2 border-white z-20"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* +1 indicator for remaining member */}
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#111b21] rounded-full flex items-center justify-center text-white text-xs font-medium border border-white z-30">
                  +2
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-[#111b21] text-base font-normal truncate">Løverne</h3>
                <span className="text-xs text-[#8696a0] flex-shrink-0 ml-2">now</span>
              </div>
              <p className="text-sm text-[#8696a0] truncate">Diskuterer dit pitch...</p>
            </div>
          </div>

          {/* Danish Celebrities Contacts */}
          {[
            
            { 
              name: 'Jeppe Hamming', 
              lastMessage: 'Er du klar til vores webinar næste uge?', 
              time: 'Torsdag',
              hasUnread: false
            },
            { 
              name: 'Kwadwo P. Swiatecki Adu', 
              lastMessage: 'Er du ved at være klar til hackathon?🤘🏼', 
              time: 'søndag',
              hasUnread: false
            },
            { 
              name: 'Frederik 10.', 
              lastMessage: 'Hvad siger du til Frederikshvile projektet?🤔', 
              time: 'lørdag',
              hasUnread: false
            },
            { 
              name: 'Christian Stadil', 
              lastMessage: 'Og af den grund er jeg ude!', 
              time: 'Torsdag',
              hasUnread: false
            },
            { 
              name: 'Caroline Stage Olsen', 
              lastMessage: 'Hvad skal Danmarks nye app hedde? 📱', 
              time: '12.46',
              hasUnread: false
            },
            { 
              name: 'Magnus Thorslund', 
              lastMessage: 'Gir du tapas, hvis jeg kommer på besøg?', 
              time: '30.07.2025',
              hasUnread: false
            },
            { 
              name: 'Fabrizio Romano', 
              lastMessage: 'To stay in Barcelona - Here we go!💯🇪🇸', 
              time: 'fredag',
              hasUnread: false
            },
            { 
              name: 'Mor ❤️', 
              lastMessage: 'Hej skatter, hvordan går det med dig?🥰', 
              time: 'mandag',
              hasUnread: true,
              isMuted: true
            },
            { 
              name: 'Sam Altman', 
              lastMessage: 'Do you want pre-access for GPT-5?🤖💸', 
              time: '30.07.2025',
              hasUnread: false
            },
            { 
              name: 'Mark Zuckerberg', 
              lastMessage: 'Last offer: 300M$💸', 
              time: '30.07.2025',
              hasUnread: false
            }
            
          ].map((contact, index) => {
            // Generate fallback colors based on name
            const getContactColor = (name: string) => {
              const colors = [
                '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
                '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
                '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548'
              ];
              const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
              return colors[hash % colors.length];
            };

            const contactColor = getContactColor(contact.name);
            const initials = contact.name.split(' ').map(n => n[0]).join('').substring(0, 2);
            
            // Map contact names to their actual image filenames
            const getContactImage = (name: string) => {
              const imageMap: { [key: string]: string } = {
                'Jeppe Hamming': '/assets/contact/jeppe.jpeg',
                'Kwadwo P. Swiatecki Adu': '/assets/contact/Kwadwo%20Adu.png',
                'Frederik 10.': '/assets/contact/frederik%2010.jpg',
                'Christian Stadil': '/assets/contact/christian%20stadil.webp',
                'Caroline Stage Olsen': '/assets/contact/Stage%20olsen.jpeg',
                'Magnus Thorslund': '/assets/contact/magnus_thorslund.webp',
                'Fabrizio Romano': '/assets/contact/fabricio.jpg',
                'Mor ❤️': '/assets/contact/Mor.jpg',
                'Sam Altman': '/assets/contact/sam%20altman.jpg',
                'Mark Zuckerberg': '/assets/contact/Mark%20zuck.jpg'
              };
              
              return imageMap[name] || '/assets/contact/default.jpg';
            };
              
              return (
                <div key={`contact-${index}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6fa] cursor-pointer border-b border-[#f0f2f5] 
                opacity-100 pointer-events-none bg-white">
                <div className="relative w-12 h-12">
                  <img
                    src={getContactImage(contact.name)}
                    alt={contact.name}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      // Fallback to colored circle with initials if image fails
                      e.currentTarget.style.display = 'none';
                      const container = e.currentTarget.parentElement;
                      if (container && !container.querySelector('.fallback-contact-icon')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'fallback-contact-icon w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium';
                        fallback.style.backgroundColor = contactColor;
                        fallback.textContent = initials;
                        container.appendChild(fallback);
                      }
                    }}
                  />
                  </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                    <h3 className="text-[#111b21] text-base font-normal truncate">{contact.name}</h3>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[#8696a0] flex-shrink-0">{contact.time}</span>
                      {contact.isMuted && (
                        <svg className="w-4 h-4 text-[#8696a0]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                        </svg>
                      )}
                    </div>
                                    </div>
                  <p className="text-sm text-[#8696a0] truncate">{contact.lastMessage}</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5]">
        {/* Chat Header */}
        <div className="bg-[#F4F4F4] border-b border-[#e5e7eb] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Overlapping Investor Avatars */}
              <div className="relative w-12 h-12">
                <div className="relative w-12 h-12">
                  {/* Back row - 3 images */}
                  <img
                    src={getInvestorAvatar('Jakob Risgaard')}
                    alt="Jakob Risgaard"
                    className="absolute top-0 left-0 w-7 h-7 rounded-full object-cover border-2 border-white z-10"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <img
                    src={getInvestorAvatar('Jesper Buch')}
                    alt="Jesper Buch"
                    className="absolute top-0 right-0 w-7 h-7 rounded-full object-cover border-2 border-white z-10"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <img
                    src={getInvestorAvatar('Jan Lehrmann')}
                    alt="Jan Lehrmann"
                    className="absolute bottom-0 left-1 w-7 h-7 rounded-full object-cover border-2 border-white z-10"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  
                  {/* Front row - 2 images */}
                  <img
                    src={getInvestorAvatar('Christian Stadil')}
                    alt="Christian Stadil"
                    className="absolute bottom-0 right-1 w-7 h-7 rounded-full object-cover border-2 border-white z-20"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  
                  {/* +1 indicator for remaining member */}
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#111b21] rounded-full flex items-center justify-center text-white text-xs font-medium border border-white z-30">
                    +2
                  </div>
                </div>
              </div>
              
              <div>
                <h1 className="text-[#111b21] font-medium">
                  {analysisMode === 'autonomous' ? 'Løverne' : 'Løvens Hule Pitch Analyse'}
                </h1>
                <p className="text-xs text-[#8696a0]">
                  Jakob Risgaard, Jesper Buch, Jan Lehrmann, Christian Stadil, Tahir Siddique
                </p>
              </div>
            </div>
            

          </div>
        </div>
      
        {/* Messages Area */}
        <div 
          className="flex-1 overflow-y-auto p-4 relative"
          style={{
            backgroundImage: "url('/assets/convo_bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
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

          {/* Group Member Typing Indicators - Bottom Right Corner */}
          <div className="fixed bottom-20 right-4 flex items-center gap-0 z-50">
            {/* All group members with typing indicators */}
            {['Jakob Risgaard', 'Jesper Buch', 'Jan Lehrmann', 'Christian Stadil', 'Tahir Siddique'].map((agentName) => {
              const isTyping = activeTypers.has(agentName);
              
              return (
                <div key={agentName} className={`relative group -mr-2 transition-all duration-300 ${isTyping ? 'z-30 scale-110' : 'z-10'}`}>
                  {/* Profile Image */}
                  <div className="relative">
                    <img
                      src={getInvestorAvatar(agentName)}
                      alt={agentName}
                      className={`w-8 h-8 rounded-full object-cover border-2 transition-all duration-300 ${
                        isTyping 
                          ? 'border-[#25d366] shadow-lg shadow-[#25d366]/30' 
                          : 'border-white/50'
                      }`}
                      onError={(e) => {
                        // Fallback to colored circle with initials if image fails
                        e.currentTarget.style.display = 'none';
                        const container = e.currentTarget.parentElement;
                        if (container && !container.querySelector('.fallback-typing-avatar')) {
                          const fallback = document.createElement('div');
                          fallback.className = `fallback-typing-avatar w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all duration-300 ${
                            isTyping 
                              ? 'border-[#25d366] shadow-lg shadow-[#25d366]/30' 
                              : 'border-white/50'
                          }`;
                          fallback.style.backgroundColor = '#f3f4f6';
                          fallback.style.color = '#6b7280';
                          fallback.textContent = agentName.split(' ').map(n => n[0]).join('').toUpperCase();
                          container.appendChild(fallback);
                        }
                      }}
                    />
                    
                    {/* Typing indicator pulse */}
                    {isTyping && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#25d366] rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>

                  {/* Typing tooltip - Always visible when typing */}
                  {isTyping && (
                    <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-white text-black text-[10px] rounded whitespace-nowrap transition-opacity duration-200 pointer-events-none animate-fade-in shadow-md border border-gray-200">
                      {agentName} skriver...
                      <div className="absolute top-full right-2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Input Area */}
        <div className="bg-white px-4 py-3">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            {/* Plus Icon */}
            <button 
              type="button"
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#111b21] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Input Field Container */}
            <div className="flex-1 bg-[#f6f6f6] rounded-full px-4 py-2 flex items-center gap-2">
              <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                  placeholder="Message"
                disabled={isLoading}
                rows={1}
                  className="w-full bg-transparent text-[#111b21] placeholder-[#8e8e93] resize-none outline-none border-none text-base"
                style={{ 
                  height: 'auto',
                    minHeight: '20px',
                    maxHeight: '80px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 80) + 'px';
                }}
              />
              </div>
            </div>

            {/* Emoji Button */}
            <button 
              type="button"
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#111b21] transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </button>

            {/* Microphone or Send Button */}
            {input.trim() ? (
            <button 
              type="submit" 
                disabled={isLoading}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#007aff] hover:text-[#0051d0] disabled:text-[#8e8e93] transition-colors"
            >
              {isLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
            ) : (
              <button 
                type="button"
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#111b21] transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}