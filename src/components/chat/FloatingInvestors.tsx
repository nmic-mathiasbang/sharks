"use client";

import React from "react";
import { InvestorAvatar } from "./InvestorAvatar";

// Simple comment: Chat bubble with timestamp and a small circular "tail"
function Bubble({ text, time }: { text: string; time?: string }) {
  const formatTime = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  return (
    <div className="relative ml-2">
      <div className="px-3 py-1 rounded-2xl bg-white text-[#111b21] text-sm shadow-sm flex items-center gap-1">
        <span className="font-medium">{text}</span>
        <span className="text-xs text-[#8696a0]">{time || formatTime()}</span>
      </div>
      
    </div>
  );
}

// Simple comment: Floating investor avatar with optional bubble
function FloatingItem({ name, top, left, text, delay = 0 }: { name: string; top: string; left: string; text?: string; delay?: number }) {
  return (
    <div
      className="absolute transition-transform"
      style={{ top, left, animation: `floatY 6s ease-in-out ${delay}s infinite alternate` }}
    >
      <div className="flex items-center">
        <InvestorAvatar name={name} size="lg" />
        {text && <Bubble text={text} />}
      </div>
    </div>
  );
}

// Simple comment: Full-screen floating investors layer (decorative)
export function FloatingInvestors() {
  // Simple comment: Static layout positions and example texts
  const items: Array<{ name: string; top: string; left: string; text?: string; delay?: number }> = [
    { name: 'Jesper Buch', top: '10%', left: '68%', text: 'Jeg kan elsker teamet! 🤘🏼', delay: 0.2 },
    { name: 'Christian Stadil', top: '12%', left: '20%', text: 'Af den grund er jeg ude!', delay: 0.8 },
    { name: 'Jakob Risgaard', top: '28%', left: '2%', delay: 1.2 },
    { name: 'Jan Lehrmann', top: '39%', left: '85%', delay: 0.4 },
    { name: 'Tahir Siddique', top: '48%', left: '8%', delay: 1.6 },
    { name: 'Louise Herping Ellegaard', top: '60%', left: '90%', delay: 1.0 },
    { name: 'Anne Stampe Olesen', top: '70%', left: '3%', text: 'Har i omsætning? 💰', delay: 0.6 },
    { name: 'Christian Arnstedt', top: '74%', left: '78%', delay: 1.4 },
    { name: 'Morten Larsen', top: '86%', left: '22%', text: 'Har i en plan?', delay: 0.3 },
    { name: 'Nikolaj Nyholm', top: '88%', left: '70%', text: 'Fed idé! 💡', delay: 1.8 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {items.map((it) => (
        <FloatingItem key={`${it.name}-${it.top}-${it.left}`} {...it} />
      ))}

      {/* Simple comment: Keyframe for gentle floating */}
      <style>{`
        @keyframes floatY {
          from { transform: translateY(0px); }
          to { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}


