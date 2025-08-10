"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InvestorAvatar } from "./InvestorAvatar";

// Simple comment: Start form with textarea and investor toggles
export function StartPitchForm({
  onSubmit,
  allInvestors,
  defaultSelected,
  onHoverInvestor,
  onToggleInvestor,
}: {
  onSubmit: (pitch: string, selectedInvestors: string[]) => void;
  allInvestors: string[];
  defaultSelected?: string[];
  onHoverInvestor?: (name: string | null) => void;
  onToggleInvestor?: (name: string, selected: boolean) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const initial = useMemo(() => new Set(defaultSelected && defaultSelected.length ? defaultSelected : allInvestors), [allInvestors, defaultSelected]);
  const [selected, setSelected] = useState<Set<string>>(initial);

  const toggle = (name: string) => {
    // Simple comment: Compute new selection state and notify parent
    const isCurrentlySelected = selected.has(name);
    const willBeSelected = !isCurrentlySelected;
    setSelected(prev => {
      const next = new Set(prev);
      if (isCurrentlySelected) next.delete(name); else next.add(name);
      return next;
    });
    onToggleInvestor?.(name, willBeSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPdfError("");
    // If a PDF is selected, upload and extract text first
    if (pdfFile) {
      if (pdfFile.type !== 'application/pdf') {
        setPdfError('Kun PDF-filer er tilladt.');
        return;
      }
      if (pdfFile.size > 10 * 1024 * 1024) {
        setPdfError('Filen er for stor (max 10 MB).');
        return;
      }
      try {
        setSubmitting(true);
        const form = new FormData();
        form.append('file', pdfFile);
        const res = await fetch('/api/extract-pdf-text', { method: 'POST', body: form });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Kunne ikke læse PDF');
        }
        const data = await res.json();
        const extracted: string = (data?.text || '').trim();
        if (!extracted) {
          setPdfError('PDF’en indeholdt ikke læsbar tekst.');
          return;
        }
        onSubmit(extracted, Array.from(selected));
      } catch (err: any) {
        setPdfError(err?.message || 'Uventet fejl ved PDF upload.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const pitch = inputValue.trim();
    if (!pitch) return;
    onSubmit(pitch, Array.from(selected));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-3xl">
      <div className="relative">
        <textarea
          placeholder="Skriv dit pitch her..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full min-h-[140px] p-4 pr-12 rounded-2xl bg-white/90 backdrop-blur text-[#111b21] placeholder-[#8e8e93] shadow-lg border border-white focus:outline-none focus:ring-4 focus:ring-[#009866]/20 focus:border-[#009866] resize-none"
          rows={5}
        />
        <span className="pointer-events-none absolute top-3 right-3 text-xs text-[#8e8e93] bg-white/70 px-2 py-0.5 rounded-full border border-white/80">
          🦁 Pitch
        </span>
      </div>

      {/* Simple comment: PDF upload (optional) */}
      <div className="space-y-2">
        <label className="block text-sm text-[#667781]">Eller upload PDF (max 10 MB)</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            setPdfError("");
            const f = e.target.files?.[0] || null;
            setPdfFile(f);
          }}
          className="block w-full text-sm text-[#111b21] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-[#e5e7eb] file:text-sm file:font-medium file:bg-white file:text-[#111b21] hover:file:bg-[#f9fafb]"
        />
        {pdfFile && (
          <div className="text-xs text-[#667781]">Valgt: {pdfFile.name} ({Math.ceil(pdfFile.size/1024)} KB)</div>
        )}
        {pdfError && (
          <div className="text-xs text-red-600">{pdfError}</div>
        )}
      </div>

      {/* Simple comment: Investor toggles - tight overlapping row */}
      <div className="relative z-10 mt-12 flex items-center justify-center gap-0 flex-nowrap overflow-visible px-1">
        {allInvestors.map((name, idx) => {
          const isSelected = selected.has(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              onMouseEnter={() => onHoverInvestor?.(name)}
              onMouseLeave={() => onHoverInvestor?.(null)}
              className={`group relative z-0 rounded-full border-2 ${isSelected ? 'border-[#25d366]' : 'border-[#e5e7eb] opacity-60'} hover:opacity-100 transition -ml-3 first:ml-0 group-hover:z-30`}
              aria-pressed={isSelected}
              aria-label={`Toggle ${name}`}
              title={name}
            >
              <div className={`${!isSelected ? 'grayscale' : ''} w-20 h-20 rounded-full ring-2 ring-white overflow-hidden inline-block align-middle`}>
                <InvestorAvatar name={name} size="xl" className="w-full h-full" />
              </div>
              {!isSelected && (
                <span className="pointer-events-none absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-[14px] flex items-center justify-center shadow border border-[#e5e7eb]">❌</span>
              )}
              {/* Simple comment: Tooltip with investor name on hover */}
              <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded bg-white text-[#111b21] text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow border border-[#e5e7eb] z-[9999]">
                {name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Simple comment: Submit button with custom green color */}
      <Button type="submit" className="w-full bg-[#009866] hover:bg-[#00855a] text-white rounded-xl h-12 text-lg shadow-md" disabled={submitting || (selected.size === 0) || (!pdfFile && !inputValue.trim())}>
        {submitting ? 'Uploader PDF...' : 'Kast mig for løverne'}
      </Button>
    </form>
  );
}


