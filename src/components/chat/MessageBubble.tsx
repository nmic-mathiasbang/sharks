"use client";

import React from "react";
import { Message } from "./types";
import { InvestorAvatar } from "./InvestorAvatar";
import { PdfDocumentCard } from "./PdfDocumentCard";

// Renders a single message bubble with optional agent avatar and colors
export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isOrchestrator = message.agentName === 'Pitch Analysis Orchestrator';

  // Simple comment: Rich text renderer that bolds @mentions and the phrase "og af den grund er jeg ude."
  const renderRichText = (text: string) => {
    const parts: React.ReactNode[] = [];
    // Match either @mentions or the final decision phrase (case-insensitive, optional trailing period)
    const regex = /(@[A-Za-zÀ-ÖØ-öø-ÿ-]+)|(og af den grund er jeg ude\.?)/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const full = match[0];
      if (start > lastIndex) parts.push(text.slice(lastIndex, start));
      if (full.startsWith('@')) {
        // Simple comment: Bold @mentions slightly
        parts.push(
          <span key={`m-${start}`} className="font-semibold">
            {full}
          </span>
        );
      } else {
        // Simple comment: Strongly bold the pass phrase to make it stand out
        parts.push(
          <span key={`p-${start}`} className="font-bold">
            {full.endsWith('.') ? full : `${full}.`}
          </span>
        );
      }
      lastIndex = start + full.length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
  };

  return (
    <div className={isUser ? "flex justify-end mb-2" : "flex justify-start mb-2"}>
      {!isUser && message.agentName && (
        <div className="flex-shrink-0 mr-3 order-1">
          <InvestorAvatar name={message.agentName} />
        </div>
      )}

      <div className={isUser ? "max-w-[75%] order-1" : "max-w-[75%] order-2"}>
        <div
          className={
            isUser
              ? 'relative rounded-[8px] px-4 py-2 bg-[#25d366] text-white'
              : isOrchestrator
              ? 'relative rounded-[8px] px-4 py-2 bg-white text-[#111b21] border border-[#25d366] shadow-sm'
              : 'relative rounded-[8px] px-4 py-2 bg-white text-[#111b21] shadow-sm'
          }
          style={!isUser && !isOrchestrator && message.colors ? {
            backgroundColor: message.colors.background,
            color: message.colors.text,
            border: `1px solid ${message.colors.text}40`,
          } : undefined}
        >
          {/* Agent name inside the bubble, more prominent than the message text */}
          {!isUser && message.agentName && (
            <div className="text-base font-semibold mb-1">
              {message.agentName}
            </div>
          )}

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

              {/* Show PDF card if message has PDF attachment */}
              {message.pdfAttachment ? (
                <PdfDocumentCard pdf={message.pdfAttachment} />
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content.split('\n').map((line, idx, arr) => (
                    <React.Fragment key={`l-${idx}`}>
                      {renderRichText(line)}
                      {idx < arr.length - 1 ? <br /> : null}
                    </React.Fragment>
                  ))}
                </div>
              )}

              <div className={isUser ? 'flex items-center justify-end gap-1 mt-2 text-xs text-[#ffffff99]' : 'flex items-center justify-end gap-1 mt-2 text-xs text-[#667781]'}>
                {/* Format time in Danish locale (e.g., 17.28) */}
                <span>{message.timestamp.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}</span>
                {isUser && (
                  <svg className="w-4 h-4 text-[#ffffff99]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </>
          )}

          {/* Removed tail triangle to keep uniform 8px border radius */}
        </div>
      </div>
    </div>
  );
}


