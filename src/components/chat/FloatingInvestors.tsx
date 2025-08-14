"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { InvestorAvatar } from "./InvestorAvatar";

// Simple comment: Chat bubble with timestamp; can animate in or slide out
// Simple comment: Fixed width bubble; animates only opacity and Y; supports side placement
function Bubble({ text, time, animation, side = 'right' }: { text: string; time?: string; animation?: "in" | "out"; side?: 'left' | 'right' }) {
  const formatTime = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      if (animation === 'in') {
        gsap.fromTo(ref.current, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.26, ease: 'power2.out' });
      } else if (animation === 'out') {
        gsap.to(ref.current, { autoAlpha: 0, y: -6, duration: 0.3, ease: 'power2.inOut' });
      }
    }, ref);
    return () => ctx.revert();
  }, [animation]);

  return (
    <div ref={ref} className={`relative ${side === 'left' ? 'mr-2' : 'ml-2'} bubble-3d ${animation === 'in' ? 'opacity-0 -translate-y-3' : ''}`}>
      <div className="inline-flex w-auto max-w-none px-3 py-1 rounded-2xl bg-white text-[#111b21] text-sm shadow-sm items-center gap-1 whitespace-nowrap leading-snug">
        <span className="font-medium whitespace-nowrap">{text}</span>
        <span className="text-xs text-[#8696a0] whitespace-nowrap">{time || formatTime()}</span>
      </div>
      
    </div>
  );
}

// Simple comment: Stacked transition that spawns a new bubble from above while the old fades up
// Simple comment: Fixed width stacked transition that spawns new bubble from above
function StackedBubbleTransition({ oldText, newText, side = 'right' }: { oldText: string; newText: string; side?: 'left' | 'right' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const newRef = useRef<HTMLDivElement>(null);
  const oldRef = useRef<HTMLDivElement>(null);

  const formatTime = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  useLayoutEffect(() => {
    const newEl = newRef.current;
    const oldEl = oldRef.current;
    const parent = containerRef.current;
    if (!newEl || !oldEl || !parent) return;

    // Simple comment: Lock container height to prevent layout jump
    parent.style.height = `${newEl.offsetHeight || oldEl.offsetHeight}px`;

    const tl = gsap.timeline();
    tl.set([newEl, oldEl], { willChange: 'transform,opacity', force3D: true });
    // Simple comment: Ensure new bubble starts hidden and above, positioned on the correct side to avoid any side flicker
    tl.set(newEl, { autoAlpha: 0, y: -12, xPercent: side === 'left' ? -100 : 0 });
    tl.set(newEl, { xPercent: 0 });
    // Simple comment: First fade/move old bubble up. Anchor old bubble on correct side to prevent cross-side flicker
    tl.set(oldEl, { xPercent: side === 'left' ? -100 : 0 });
    tl.set(oldEl, { xPercent: 0 });
    tl.to(oldEl, { autoAlpha: 0, y: -28, duration: 0.4, ease: 'power2.inOut' }, 0);
    // Simple comment: Then bring new bubble in with a small delay
    tl.to(newEl, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.inOut' }, 0.12);

    return () => { tl.kill(); };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Simple comment: New bubble in normal visual position */}
      <div ref={newRef} className="absolute top-0 left-0 right-auto bubble-3d">
        <div className={`relative ${side === 'left' ? 'mr-2' : 'ml-2'}`}>
          <div className="inline-flex w-auto max-w-none px-3 py-1 rounded-2xl bg-white text-[#111b21] text-sm shadow-sm items-center gap-1 whitespace-nowrap leading-snug opacity-0 -translate-y-3">
            <span className="font-medium whitespace-nowrap">{newText}</span>
            <span className="text-xs text-[#8696a0] whitespace-nowrap">{formatTime()}</span>
          </div>
        </div>
      </div>
      {/* Simple comment: Old bubble overlays and moves further up */}
      <div ref={oldRef} className="absolute top-0 left-0 right-auto bubble-layer">
        <div className={`relative ${side === 'left' ? 'mr-2' : 'ml-2'}`}>
          <div className="inline-flex w-auto max-w-none px-3 py-1 rounded-2xl bg-white text-[#111b21] text-sm shadow-sm items-center gap-1 whitespace-nowrap leading-snug">
            <span className="font-medium whitespace-nowrap">{oldText}</span>
            <span className="text-xs text-[#8696a0] whitespace-nowrap">{formatTime()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple comment: Floating investor avatar with optional bubble(s)
function FloatingItem({ name, top, left, text, stackedTexts, delay = 0, show = false, showStack = false, side = 'right' }: { name: string; top: string; left: string; text?: string; stackedTexts?: [string, string]; delay?: number; show?: boolean; showStack?: boolean; side?: 'left' | 'right' }) {
  return (
    <div
      className="floating-investor absolute transition-transform animate-avatar-in"
      style={{ top, left, animationDelay: `${delay}s` }}
    >
      <div className="relative inline-flex items-center" style={{ animation: `floatY 6s ease-in-out ${delay}s infinite alternate` }}>
        <InvestorAvatar name={name} size="lg" />
        {/* Simple comment: Absolutely position bubble relative to avatar to avoid layout shift */}
        <div
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'right-full' : 'left-full'}`}
        >
          {showStack && stackedTexts ? (
            <StackedBubbleTransition oldText={stackedTexts[0]} newText={stackedTexts[1]} side={side} />
          ) : (
            text && show ? <Bubble text={text} animation="in" side={side} /> : null
          )}
        </div>
      </div>
    </div>
  );
}

// Simple comment: Full-screen floating investors layer (decorative); reacts to hoveredName and persistent toggledOff state
export function FloatingInvestors({ 
  hoveredName, 
  toggledOff, 
  fadeOut, 
  onFadeComplete 
}: { 
  hoveredName?: string | null; 
  toggledOff?: Record<string, boolean>;
  fadeOut?: boolean;
  onFadeComplete?: () => void;
}) {
  // Simple comment: Static layout positions and example texts
  const items: Array<{ name: string; top: string; left: string; text?: string; delay?: number; side?: 'left' | 'right' }> = [
    { name: 'Jesper Buch', top: '10%', left: '68%', text: 'Vis mig, at I sparker røv. 🤘🏼', delay: 0.2, side: 'right' },
    { name: 'Christian Stadil', top: '12%', left: '40%', text: 'Jeg er vild med konceptet!', delay: 0.8, side: 'right' },
    { name: 'Jakob Risgaard', top: '8%', left: '9%', text: 'Hvordan skalerer I? 🚀', delay: 1.2, side: 'right' },
    { name: 'Jan Lehrmann', top: '37%', left: '79%', text: 'Hvad koster en kunde? 💰', delay: 0.4, side: 'right' },
    { name: 'Tahir Siddique', top: '42%', left: '2%', text: 'Har i overvejet en app? 📱', delay: 1.6, side: 'right' },
    { name: 'Louise Herping Ellegaard', top: '60%', left: '93%', text: 'Hvem er målgruppen? 🎯', delay: 1.0, side: 'left' },
    { name: 'Anne Stampe Olesen', top: '70%', left: '1%', text: 'Jeg forstår ikke jeres ideén.', delay: 0.6, side: 'right' },
    { name: 'Christian Arnstedt', top: '84%', left: '72%', text: 'Hvad er prissætningen? 💵', delay: 1.4, side: 'right' },
    { name: 'Morten Larsen', top: '86%', left: '22%', text: 'Har i en plan?', delay: 0.3, side: 'right' },
    { name: 'Nikolaj Nyholm', top: '88%', left: '51%', text: 'Fed idé! 💡', delay: 1.8, side: 'left' },
  ];

  // Simple comment: Track recent OFF transitions to play stacked animation once
  const [recentlyExited, setRecentlyExited] = useState<Record<string, boolean>>({});
  const prevOffRef = useRef<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const fadeTimelineRef = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    if (!toggledOff) return;
    const updates: Record<string, boolean> = {};
    for (const it of items) {
      const prev = prevOffRef.current[it.name] || false;
      const now = Boolean(toggledOff[it.name]);
      if (!prev && now) {
        updates[it.name] = true;
        // Clear the stacked transition flag after animation completes.
        // Use requestAnimationFrame to ensure the first paint includes both bubbles.
        requestAnimationFrame(() => {
          setTimeout(() => {
            setRecentlyExited((prevMap) => ({ ...prevMap, [it.name]: false }));
          }, 450);
        });
      }
      prevOffRef.current[it.name] = now;
    }
    if (Object.keys(updates).length) {
      setRecentlyExited((prevMap) => ({ ...prevMap, ...updates }));
    }
  }, [toggledOff]);

  // Simple comment: Handle staggered fade-out animation when fadeOut prop changes
  useLayoutEffect(() => {
    if (!fadeOut || !containerRef.current) return;
    
    // Simple comment: Kill any existing timeline
    if (fadeTimelineRef.current) {
      fadeTimelineRef.current.kill();
    }
    
    const investorElements = containerRef.current.querySelectorAll('.floating-investor');
    
    // Simple comment: Create staggered fade-out timeline
    fadeTimelineRef.current = gsap.timeline({
      onComplete: () => {
        onFadeComplete?.();
      }
    });
    
    // Simple comment: Stagger the fade-out from random starting points for natural effect
    fadeTimelineRef.current.to(investorElements, {
      opacity: 0,
      y: -20,
      scale: 0.9,
      duration: 0.4,
      ease: "power2.inOut",
      stagger: {
        amount: 0.3, // Total stagger duration
        from: "random" // Random stagger order for organic feel
      }
    });
    
  }, [fadeOut, onFadeComplete]);

  // Simple comment: Cleanup timeline on unmount
  useLayoutEffect(() => {
    return () => {
      if (fadeTimelineRef.current) {
        fadeTimelineRef.current.kill();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {items.map((it) => {
        // Simple comment: If toggled OFF, show exit text; on first transition, stack with old text
        const isOff = Boolean(toggledOff && toggledOff[it.name]);
        if (isOff) {
          const playStack = Boolean(recentlyExited[it.name]);
          if (playStack) {
            return (
              <FloatingItem
                key={`${it.name}-${it.top}-${it.left}`}
                {...it}
                stackedTexts={[it.text || '', 'Jeg er ude! ❌']}
                show
                showStack
                side={it.side || 'right'}
              />
            );
          }
          return (
            <FloatingItem key={`${it.name}-${it.top}-${it.left}`} {...it} text={'Jeg er ude! ❌'} show side={it.side || 'right'} />
          );
        }
        const show = hoveredName === it.name;
        return (
          <FloatingItem key={`${it.name}-${it.top}-${it.left}`} {...it} text={it.text} show={show} side={it.side || 'right'} />
        );
      })}

      {/* Simple comment: Keyframe for gentle floating */}
      
    </div>
  );
}


