"use client";

import React, { useRef, useEffect } from "react";
import { Message } from "./types";
import { MessageBubble } from "./MessageBubble";
import { Bot } from "lucide-react";

// Scrollable messages area with placeholder
export function MessagesList({ messages }: { messages: Message[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
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

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        <div ref={endRef} />
      </div>
    </div>
  );
}


