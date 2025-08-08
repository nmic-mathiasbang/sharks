"use client";

import React from "react";
import { InvestorAvatar } from "./InvestorAvatar";

// Header for the active chat with overlapping investor avatars and title
export function ChatHeader({
  analysisMode,
  investors,
}: {
  analysisMode: 'original' | 'quick' | 'multi-agent' | 'autonomous';
  investors: string[];
}) {
  return (
    <div className="bg-white border-b border-[#e5e7eb] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Overlapping Investor Avatars */}
          <div className="relative w-12 h-12">
            <div className="relative w-12 h-12">
              {/* Simple comment: Render up to 4 investor avatars, then show +X for the rest */}
              {investors[0] && (
                <div className="absolute top-0 left-0">
                  <InvestorAvatar name={investors[0]} size="sm" />
                </div>
              )}
              {investors[1] && (
                <div className="absolute top-0 right-0">
                  <InvestorAvatar name={investors[1]} size="sm" />
                </div>
              )}
              {investors[2] && (
                <div className="absolute bottom-0 left-1">
                  <InvestorAvatar name={investors[2]} size="sm" />
                </div>
              )}
              {investors[3] && (
                <div className="absolute bottom-0 right-1">
                  <InvestorAvatar name={investors[3]} size="sm" />
                </div>
              )}
              {investors.length > 4 && (
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#111b21] rounded-full flex items-center justify-center text-white text-xs font-medium border border-white z-30">
                  +{investors.length - 4}
                </div>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-[#111b21] font-medium">
              {analysisMode === 'autonomous' ? 'Løverne' : 'Løvens Hule Pitch Analyse'}
            </h1>
            <p className="text-xs text-[#8696a0]">
              {investors.join(', ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


