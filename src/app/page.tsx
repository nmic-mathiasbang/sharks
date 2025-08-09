"use client";

import { useState } from "react";
import { SimplePitchChat } from "@/components/chat/SimplePitchChat";
import { StartPitchForm } from "@/components/chat/StartPitchForm";
import { FloatingInvestors } from "@/components/chat/FloatingInvestors";

export default function Home() {
  // State to manage the input value and chat
  const [showChat, setShowChat] = useState(false);
  const [initialPitch, setInitialPitch] = useState("");
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [hoveredInvestor, setHoveredInvestor] = useState<string | null>(null);
  // Simple comment: Track which investors are toggled OFF (persist their exit bubble)
  const [toggledOff, setToggledOff] = useState<Record<string, boolean>>({});
  // Always use autonomous mode for Løvens Hule group chat
  const analysisMode = 'autonomous';
  const maxTurns = 3;
  const allInvestors = ['Jakob Risgaard', 'Jesper Buch', 'Jan Lehrmann', 'Christian Stadil', 'Tahir Siddique', 'Christian Arnstedt', 'Louise Herping Ellegaard', 'Anne Stampe Olesen', 'Morten Larsen', 'Nikolaj Nyholm'];

  // Simple comment: Submit from StartPitchForm includes selected investors
  const handleSubmit = (pitch: string, investors: string[]) => {
    setInitialPitch(pitch);
    setSelectedInvestors(investors);
    setShowChat(true);
  };
  // Simple comment: Persist OFF state until toggled back ON
  const handleToggleInvestor = (name: string, selected: boolean) => {
    setToggledOff((prev) => ({ ...prev, [name]: !selected }));
  };

  // Handle starting over
  const handleStartOver = () => {
    setShowChat(false);
    setInitialPitch("");
    setSelectedInvestors([]);
  };



  if (showChat) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        {/* Full screen WhatsApp-style chat interface */}
        <SimplePitchChat 
          initialPitch={initialPitch} 
          analysisMode={analysisMode}
          maxTurns={maxTurns}
          investors={selectedInvestors.length ? selectedInvestors : allInvestors}
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
    <div className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-visible" style={{ backgroundColor: '#fcf5eb' }}>
      {/* Simple comment: Decorative floating investors */}
      {/* Simple comment: Pass hovered investor and OFF-state to control bubbles */}
      <FloatingInvestors hoveredName={hoveredInvestor} toggledOff={toggledOff} />
      <main className="relative z-10 w-full flex flex-col items-center space-y-6">
        <h1 className="text-center text-5xl sm:text-6xl font-extrabold tracking-tight text-black">
        Tænk hvis din pitch blev kastet for løverne!
        </h1>
        <div className="text-center">
        </div>
        <StartPitchForm 
          onSubmit={handleSubmit} 
          allInvestors={allInvestors} 
          defaultSelected={allInvestors}
          onHoverInvestor={setHoveredInvestor}
          onToggleInvestor={handleToggleInvestor}
        />
      </main>
    </div>
  );
}
