"use client";

import React, { useEffect, useRef, useState } from "react";
import { InvestorAvatar } from "./InvestorAvatar";

// Sidebar showing the Chats header, search, and sample list
export function ChatSidebar({ activeTypers = new Set<string>(), lastPreview, investors }: { activeTypers?: Set<string>, lastPreview?: string, investors: string[] }) {
  // Simple comment: Only investor names should drive the typing preview (ignore orchestrator)
  const allowedTypers = new Set(investors);
  
  // Static contacts shown in the sidebar list
  const contacts: Array<{
    name: string;
    lastMessage: string;
    time: string;
    hasUnread: boolean;
    isMuted?: boolean;
    highlight?: boolean; // transient green flash on new unread
    timestamp?: number; // used for initial ordering
  }> = [
    { name: 'Kwadwo P. Swiatecki Adu', lastMessage: 'Er du ved at være klar til hackathon?🤘🏼', time: '09.35', hasUnread: false },
    { name: 'Frederik 10.', lastMessage: 'Hvad siger du til Frederikshvile projektet?🤔', time: 'Onsdag', hasUnread: false },
    { name: 'Caroline Stage Olsen', lastMessage: 'Hvad skal Danmarks nye app hedde? 📱', time: 'Onsdag', hasUnread: false },
    { name: 'Christian Stadil', lastMessage: 'Og af den grund er jeg ude!', time: 'tirsdag', hasUnread: false },
    { name: 'Magnus Thorslund', lastMessage: 'Gir du tapas, hvis jeg kommer på besøg?', time: 'Søndag', hasUnread: false },
    { name: 'Fabrizio Romano', lastMessage: 'To stay in Barcelona - Here we go!💯🇪🇸', time: 'Lørdag', hasUnread: false },
    { name: 'Mor ❤️', lastMessage: 'Hej skatter, hvordan går det med dig?🥰', time: 'Lørdag', hasUnread: false, isMuted: false },
    { name: 'Sam Altman', lastMessage: 'Do you want pre-access for GPT-6?🤖💸', time: '08.08.2025', hasUnread: false },
    { name: 'Mark Zuckerberg', lastMessage: 'Last offer: 300M$💸', time: '05.08.2025', hasUnread: false },
    // Place Jeppe at the bottom initially
    { name: 'Jeppe Hamming', lastMessage: 'Hey, hvordan går det i Barcelona?', time: 'Torsdag', hasUnread: false },
  ];
  
  // Local state for contacts so we can reorder them dynamically
  const [contactsState, setContactsState] = useState(contacts);
  const timesInitializedRef = useRef(false);
  
  // Prevent duplicate injection across Strict Mode re-mounts
  const injectedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  
  // After a short delay, simulate a new message from Jeppe and move him to top
  useEffect(() => {
    if (injectedRef.current) return;
    timeoutRef.current = window.setTimeout(() => {
      injectedRef.current = true;
      setContactsState(prev => {
        const idx = prev.findIndex(c => c.name === 'Jeppe Hamming');
        if (idx === -1) return prev;
        const updated = { ...prev[idx], lastMessage: 'Er du klar til vores webinar næste uge?', time: '14.15', hasUnread: true, highlight: true };
        const others = prev.filter((_, i) => i !== idx);
        const next = [updated, ...others];

        // Schedule highlight removal after 1.8s
        if (!highlightTimeoutRef.current) {
          highlightTimeoutRef.current = window.setTimeout(() => {
            setContactsState(curr => curr.map(c => c.name === 'Jeppe Hamming' ? { ...c, highlight: false } : c));
            highlightTimeoutRef.current = null;
          }, 1800);
        }

        return next;
      });
    }, 20500);
    return () => {
      if (!injectedRef.current && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);


  
  // Helper to map contact names to image files
  const getContactImage = (name: string) => {
    const imageMap: Record<string, string> = {
      'Jeppe Hamming': '/assets/contact/jeppe.jpeg',
      'Kwadwo P. Swiatecki Adu': '/assets/contact/Kwadwo%20Adu.png',
      'Frederik 10.': '/assets/contact/frederik%2010.jpg',
      'Christian Stadil': '/assets/contact/christian%20stadil.webp',
      'Caroline Stage Olsen': '/assets/contact/Stage%20olsen.jpeg',
      'Magnus Thorslund': '/assets/contact/magnus_thorslund.webp',
      'Fabrizio Romano': '/assets/contact/fabricio.jpg',
      'Mor ❤️': '/assets/contact/Mor.jpg',
      'Sam Altman': '/assets/contact/sam%20altman.jpg',
      'Mark Zuckerberg': '/assets/contact/Mark%20zuck.jpg',
    };
    return imageMap[name] || '/assets/contact/default.jpg';
  };
  
  // Small utility to create a stable fallback color for initials
  const getContactColor = (name: string) => {
    const colors = [
      '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
      '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
      '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548'
    ];
    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="w-[30%] bg-white border-r border-[#e5e7eb] flex flex-col">
      <div className="p-4 bg-white border-b border-[#e5e7eb]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#111b21]">Chats</h1>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 cursor-pointer text-[#8696a0] hover:text-[#111b21]">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"/>
              </svg>
            </div>
            <div className="w-6 h-6 cursor-pointer text-[#8696a0] hover:text-[#111b21]">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"/>
              </svg>
            </div>
          </div>
        </div>
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

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] cursor-pointer border-b border-[#e5e7eb]">
          <div className="relative w-12 h-12">
            <div className="relative w-12 h-12">
              {investors[0] && (
                <div className="absolute top-0 left-0"><InvestorAvatar name={investors[0]} size="sm" /></div>
              )}
              {investors[1] && (
                <div className="absolute top-0 right-0"><InvestorAvatar name={investors[1]} size="sm" /></div>
              )}
              {investors[2] && (
                <div className="absolute bottom-0 left-1"><InvestorAvatar name={investors[2]} size="sm" /></div>
              )}
              {investors[3] && (
                <div className="absolute bottom-0 right-1"><InvestorAvatar name={investors[3]} size="sm" /></div>
              )}
              {investors.length > 4 && (
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#111b21] rounded-full flex items-center justify-center text-white text-xs font-medium border border-white z-30">
                  +{investors.length - 4}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-[#111b21] text-base font-normal truncate">Løverne</h3>
              <span className="text-xs text-[#8696a0] flex-shrink-0 ml-2">now</span>
            </div>
            {(() => {
              // Simple comment: Filter typers to only investors, not the orchestrator
              const filteredTypers = Array.from(activeTypers).filter((n) => allowedTypers.has(n));
              const firstTyping = filteredTypers[0] || null;
              const firstName = firstTyping ? firstTyping.split(' ')[0] : null;
              const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;
              const preview = firstName
                ? `${firstName} skriver...`
                : (lastPreview && lastPreview.trim().length > 0
                    ? truncate(lastPreview.replace(/\n+/g, ' '), 80)
                    : 'Hey! Hvem er med på den næste sæson af Løvens hule??🦁...');
              return <p className="text-sm text-[#8696a0] truncate">{preview}</p>;
            })()}
          </div>
        </div>

        {/* Render the live contacts below the group chat */}
        {contactsState.map((contact, index) => {
          const initials = contact.name.split(' ').map(n => n[0]).join('').substring(0, 2);
          const color = getContactColor(contact.name);
          const src = getContactImage(contact.name);

          return (
            <div
              key={`contact-${index}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6fa] cursor-pointer border-b border-[#f0f2f5] opacity-100 pointer-events-none transition-colors duration-700 ${contact.highlight ? 'bg-[#f7fff7]' : 'bg-white'}`}
            >
              <div className="relative w-12 h-12">
                <img
                  src={src}
                  alt={contact.name}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    // Fallback to colored circle with initials if image fails
                    e.currentTarget.style.display = 'none';
                    const container = e.currentTarget.parentElement;
                    if (container && !container.querySelector('.fallback-contact-icon')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'fallback-contact-icon w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium';
                      fallback.style.backgroundColor = color;
                      fallback.textContent = initials;
                      container.appendChild(fallback);
                    }
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`text-[#111b21] text-base truncate ${contact.hasUnread ? 'font-semibold' : 'font-normal'}`}>{contact.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs flex-shrink-0 ${contact.hasUnread ? 'text-emerald-600' : 'text-[#8696a0]'}`}>{contact.time}</span>
                    {contact.hasUnread && !contact.isMuted && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 inline-block" aria-label="Unread" />
                    )}
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
  );
}


