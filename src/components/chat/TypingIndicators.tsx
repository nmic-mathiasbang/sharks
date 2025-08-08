"use client";

import React from "react";
import { InvestorAvatar } from "./InvestorAvatar";

// Bottom-right typing indicators for all investors
export function TypingIndicators({ activeTypers, investors }: { activeTypers: Set<string>, investors: string[] }) {
  // Simple comment: Use provided investors (selected) for indicators
  const investorNames = investors;

  return (
    <div className="fixed bottom-20 right-4 flex items-center gap-0 z-50">
      {investorNames.map((name) => {
        const isTyping = activeTypers.has(name);
        return (
          <div key={name} className={`relative group -mr-2 transition-all duration-300 ${isTyping ? 'z-30 scale-110' : 'z-10'}`}>
            <div className="relative">
              <InvestorAvatar name={name} size="sm" className={isTyping ? 'border-[#25d366] shadow-lg shadow-[#25d366]/30' : 'border-white/50'} />
              {isTyping && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#25d366] rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            {isTyping && (
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-white text-black text-[10px] rounded whitespace-nowrap transition-opacity duration-200 pointer-events-none animate-fade-in shadow-md border border-gray-200">
                {name} skriver...
                <div className="absolute top-full right-2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


