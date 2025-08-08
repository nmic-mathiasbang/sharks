"use client";

import React, { useState } from "react";

// Chat input with plus button, textarea, emoji, and send
export function ChatInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    const v = value.trim();
    setValue("");
    onSubmit(v);
  };

  return (
    <div className="bg-white px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <button
          type="button"
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#111b21] transition-colors"
          aria-label="Add"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <div className="flex-1 bg-[#f6f6f6] rounded-full px-4 py-2 flex items-center gap-2">
          <div className="flex-1">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Message"
              disabled={!!disabled}
              rows={1}
              className="w-full bg-transparent text-[#111b21] placeholder-[#8e8e93] resize-none outline-none border-none text-base"
              style={{ height: "auto", minHeight: "20px", maxHeight: "80px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 80) + "px";
              }}
            />
          </div>
        </div>

        <button
          type="button"
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#111b21] transition-colors"
          aria-label="Emoji"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </button>

        {value.trim() ? (
          <button
            type="submit"
            disabled={!!disabled}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#007aff] hover:text-[#0051d0] disabled:text-[#8e8e93] transition-colors"
            aria-label="Send"
          >
            {disabled ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-[#111b21] transition-colors"
            aria-label="Mic"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}


