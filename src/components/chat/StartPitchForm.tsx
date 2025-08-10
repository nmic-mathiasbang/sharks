"use client";

import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InvestorAvatar } from "./InvestorAvatar";
import { PdfAttachment } from "./types";

// Simple comment: Start form with textarea and investor toggles
export function StartPitchForm({
  onSubmit,
  allInvestors,
  defaultSelected,
  onHoverInvestor,
  onToggleInvestor,
}: {
  onSubmit: (pitch: string, selectedInvestors: string[], pdfAttachment?: PdfAttachment) => void;
  allInvestors: string[];
  defaultSelected?: string[];
  onHoverInvestor?: (name: string | null) => void;
  onToggleInvestor?: (name: string, selected: boolean) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  // Simple comment: Track drag state for drag-and-drop UX
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0); // Simple comment: Handle nested dragenter/dragleave events
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
          setPdfError('PDF-filen indeholdt ikke læsbar tekst.');
          return;
        }
        
        // Create PDF attachment metadata for display
        const pdfAttachment: PdfAttachment = {
          fileName: pdfFile.name,
          size: pdfFile.size,
          pageCount: data?.meta?.numPages || 1,
          extractedText: extracted
        };
        
        onSubmit(extracted, Array.from(selected), pdfAttachment);
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

  // Simple comment: Validate and set PDF file after drop
  const trySetPdfFromFile = (file: File | null | undefined) => {
    setPdfError("");
    if (!file) return;
    if (file.type !== "application/pdf") {
      setPdfError("Kun PDF-filer er tilladt.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPdfError("Filen er for stor (max 10 MB).");
      return;
    }
    setPdfFile(file);
  };

  // Simple comment: Drag-and-drop handlers on the textarea container
  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);

    const dt = e.dataTransfer;
    const file = dt?.files?.[0];
    trySetPdfFromFile(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-3xl">
      {/* Simple comment: Textarea doubles as a drop zone for PDF */}
      <div
        className={`relative rounded-2xl shadow-lg border ${
          isDragging ? "border-dashed border-[#009866] ring-4 ring-[#009866]/20" : "border-white"
        } bg-white/90 backdrop-blur`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <textarea
          placeholder={pdfFile ? "PDF valgt – du kan stadig skrive ekstra noter her…" : "Skriv dit pitch her… eller træk en PDF hertil"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full min-h-[160px] p-4 pr-12 rounded-2xl bg-transparent text-[#111b21] placeholder-[#8e8e93] focus:outline-none resize-none"
          rows={6}
        />

        {/* Simple comment: Field badge */}
        <span className="pointer-events-none absolute top-3 right-3 text-xs text-[#8e8e93] bg-white/70 px-2 py-0.5 rounded-full border border-white/80">
          🦁 Pitch
        </span>

        {/* Simple comment: Selected PDF chip positioned inside field (bottom-left) */}
        {pdfFile && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0f2f5] border border-[#e9edef] text-[#111b21] text-sm shadow-sm">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#dc2626] text-white text-[10px] font-bold">PDF</span>
            <span className="max-w-[200px] truncate">{pdfFile.name}</span>
            <span className="text-[#667781]">{Math.ceil(pdfFile.size / 1024)} KB</span>
            <button
              type="button"
              onClick={() => setPdfFile(null)}
              className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-md border border-[#e5e7eb] bg-white text-[#667781] hover:text-[#111b21] hover:bg-[#fafafa]"
              aria-label="Fjern PDF"
              title="Fjern PDF"
            >
              ×
            </button>
          </div>
        )}

        {/* Simple comment: Drag overlay */}
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="px-4 py-2 rounded-xl bg-white/90 text-[#009866] text-sm font-medium border border-[#009866]/30 shadow-sm">
              Slip PDF for at uploade
            </div>
          </div>
        )}
      </div>

      {/* Simple comment: Error text below the field */}
      {pdfError && <div className="text-xs text-red-600">{pdfError}</div>}

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


