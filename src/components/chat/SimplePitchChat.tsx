"use client";

import { useState, useRef, useEffect } from "react";
import { Message, PdfAttachment } from "./types";
import { LeftIconMenu } from "./LeftIconMenu";
import { ChatSidebar } from "./ChatSidebar";
import { ChatHeader } from "./ChatHeader";
import { MessagesList } from "./MessagesList";
import { TypingIndicators } from "./TypingIndicators";
import { ChatInput } from "./ChatInput";

interface SimplePitchChatProps {
  initialPitch?: string;
  analysisMode?: 'original' | 'quick' | 'multi-agent' | 'autonomous';
  maxTurns?: number;
  investors?: string[]; // Simple comment: Selected investors for this chat
  pdfAttachment?: PdfAttachment; // Simple comment: Optional PDF attachment for display
}

export function SimplePitchChat({ 
  initialPitch, 
  analysisMode = 'original', 
  maxTurns = 18,
  investors = ['Jakob Risgaard', 'Jesper Buch', 'Jan Lehrmann', 'Christian Stadil', 'Tahir Siddique', 'Christian Arnstedt', 'Louise Herping Ellegaard', 'Anne Stampe Olesen', 'Morten Larsen', 'Nikolaj Nyholm'],
  pdfAttachment
}: SimplePitchChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTypers, setActiveTypers] = useState<Set<string>>(new Set()); // Track who's currently typing
  const [lastAgentPreview, setLastAgentPreview] = useState<string>("");
  
  const idCounter = useRef(0);
  const initializationRef = useRef(false); // Prevent double initialization
  const isAnalyzingRef = useRef(false); // Prevent double API calls

  // Generate unique ID for messages
  const generateId = () => {
    idCounter.current += 1;
    return "msg-" + idCounter.current + "-" + Date.now();
  };

  // Initialize with pitch analysis
  useEffect(() => {
    if (initialPitch && !initializationRef.current && messages.length === 0 && !isLoading) {
      initializationRef.current = true; // Use ref to prevent double runs
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
    isStreaming = false,
    pdf?: PdfAttachment
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
      pdfAttachment: pdf,
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
  const handleSendMessage = (messageText: string) => {
    // Add user message
    addMessage('user', messageText);
    
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
      // Add user message (with PDF attachment if provided)
      addMessage('user', pitch, false, undefined, undefined, false, pdfAttachment);
      
      // Call appropriate streaming API based on mode
      const apiEndpoint = analysisMode === 'autonomous' 
        ? '/api/analyze-pitch-autonomous'
        : '/api/analyze-pitch-stream';
        
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pitch, 
          maxTurns,
          investors
        }),
      });

      if (!response.ok) {
        throw new Error("HTTP error! status: " + response.status);
      }

      // No initial loading message to remove

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
                  const id = addMessage(
                    'assistant',
                    eventData.message,
                    false,
                    eventData.agent,
                    eventData.colors,
                    false
                  );
                  // Save last agent preview (trim newlines, shorten)
                  setLastAgentPreview(String(eventData.message || ""));
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
                  // Also update last preview to the completed message
                  if (eventData?.message) setLastAgentPreview(String(eventData.message));
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
      <LeftIconMenu />
      <ChatSidebar activeTypers={activeTypers} lastPreview={lastAgentPreview} investors={investors} />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5]">
        <ChatHeader analysisMode={analysisMode} investors={investors} />
        <MessagesList messages={messages} />
        <TypingIndicators activeTypers={activeTypers} investors={investors} />
        <ChatInput onSubmit={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}