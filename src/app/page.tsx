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
  const maxTurns = 15;

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
        
        {/* Floating Start Over Button */}
        <div className="absolute top-4 right-4 z-50">
          <Button 
            variant="outline" 
            onClick={handleStartOver}
            className="text-sm bg-white/90 backdrop-blur-sm border-gray-300 hover:bg-white/95"
          >
            Start Over
          </Button>
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
