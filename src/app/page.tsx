"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SimplePitchChat } from "@/components/chat/SimplePitchChat";

export default function Home() {
  // State to manage the input value and chat
  const [inputValue, setInputValue] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [initialPitch, setInitialPitch] = useState("");
  // Always use autonomous mode for Løvens Hule group chat
  const analysisMode = 'autonomous';
  const maxTurns = 3;

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Set the initial pitch and show the chat interface
    setInitialPitch(inputValue.trim());
    setShowChat(true);
  };

  // Handle starting over
  const handleStartOver = () => {
    setShowChat(false);
    setInputValue("");
    setInitialPitch("");
  };



  if (showChat) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        {/* Full screen WhatsApp-style chat interface */}
        <SimplePitchChat 
          initialPitch={initialPitch} 
          analysisMode={analysisMode}
          maxTurns={maxTurns}
        />
        
        {/* Floating Action Icons */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
          {/* Video Call Icon */}
          <button className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full flex items-center justify-center text-[#8696a0] hover:bg-white/95 hover:text-[#111b21] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          
          {/* Phone Call Icon */}
          <button className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full flex items-center justify-center text-[#8696a0] hover:bg-white/95 hover:text-[#111b21] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          
          {/* Search Icon */}
          <button className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full flex items-center justify-center text-[#8696a0] hover:bg-white/95 hover:text-[#111b21] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {/* Start Over Hidden Button */}
          <button 
            onClick={handleStartOver}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full flex items-center justify-center text-[#8696a0] hover:bg-white/95 hover:text-[#111b21] transition-colors"
            title="Start Over"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <main className="w-full max-w-md space-y-8">
        {/* Main heading */}
        <h1 className="text-4xl font-bold text-center text-foreground">
          Løvens hule gruppechat
        </h1>
        
        {/* Description */}
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            tænk hvis din elevator pitch ved et uheld landede i gruppechatten for løvens hule investorene
          </p>
        </div>
        
        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            placeholder="Skriv dit pitch her... (f.eks. 'Vi bygger en SaaS platform der hjælper små virksomheder med at administrere deres lager mere effektivt. Vores målgruppe er detailhandlere med 1-50 ansatte som i dag bruger Excel...')"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full min-h-[120px] p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            rows={5}
          />
          <Button 
            type="submit" 
            className="w-full"
            disabled={!inputValue.trim()}
          >
            Pitch investors
          </Button>
        </form>

      </main>
    </div>
  );
}
