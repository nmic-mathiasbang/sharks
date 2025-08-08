"use client";

import React from "react";

// Small avatar component for investor images with fallback
export function InvestorAvatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeMap = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-20 h-20",
  } as const;

  const avatarMap: Record<string, string> = {
    "Jakob Risgaard": "/assets/investors/jakob-risgaard.jpg",
    "Jesper Buch": "/assets/investors/jesper-buch.jpg",
    "Jan Lehrmann": "/assets/investors/jan-lehrmann.jpg",
    "Christian Stadil": "/assets/investors/christian-stadil.jpg",
    "Tahir Siddique": "/assets/investors/tahir-siddique.jpg",
    // Simple comment: New investors from persona file
    "Christian Arnstedt": "/assets/investors/Christian-Arnstedt.png",
    "Louise Herping Ellegaard": "/assets/investors/louise-herping.jpg",
    "Anne Stampe Olesen": "/assets/investors/Anne-stampe.jpeg",
    "Morten Larsen": "/assets/investors/Morten-Larsen.jpg",
    "Nikolaj Nyholm": "/assets/investors/Nikolaj-Nyholm.jpg",
    "Investment Committee Lead": "/assets/investors/orchestrator.jpg",
  };

  const src = avatarMap[name] || "/assets/investors/default-avatar.svg";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <img
      src={src}
      alt={name}
      className={`${sizeMap[size]} rounded-full object-cover border-2 border-[#e5e7eb] block ${className}`}
      onError={(e) => {
        // Fallback to initials if image fails
        const container = e.currentTarget.parentElement;
        e.currentTarget.style.display = "none";
        if (container && !container.querySelector(".fallback-avatar")) {
          const fallback = document.createElement("div");
          fallback.className = `fallback-avatar ${sizeMap[size]} rounded-full flex items-center justify-center text-sm font-medium border-2 border-[#e5e7eb] bg-[#f3f4f6] text-[#6b7280]`;
          fallback.textContent = initials;
          container.appendChild(fallback);
        }
      }}
    />
  );
}


