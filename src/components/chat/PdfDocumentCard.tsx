"use client";

import React from "react";
import { PdfAttachment } from "./types";

interface PdfDocumentCardProps {
  pdf: PdfAttachment;
}

// Simple comment: Displays a PDF attachment as a visual document card similar to WhatsApp
export function PdfDocumentCard({ pdf }: PdfDocumentCardProps) {
  // Format file size to display (e.g., "5 KB", "1.2 MB")
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-[#f0f2f5] rounded-lg p-3 max-w-xs border border-[#e9edef]">
      {/* PDF Preview Header */}
      <div className="bg-white rounded-md p-3 mb-2 border border-[#e9edef]">
        <div className="text-xs text-[#667781] mb-1 font-medium">
          Forretningsplan: Tinder for VC'er
        </div>
        <div className="text-xs text-[#667781] mb-2">
          Resumé
        </div>
        <div className="text-xs text-[#667781] leading-relaxed">
          Tinder for VC'er er en mobil-først platform, der forbinder venturekapitalister (VC'er) med 
          lovende startups på en hurtig, intuitiv og datadrevet måde. Ved at kombinere 
          swipe-baserede interaktioner, AI-drevet matching og realtids notifikationer om 
          investeringsmuligheder reducerer platformen friktionen i opdagelsen af startups og 
          accelererer investeringsprocessen.
        </div>
        <div className="text-xs text-[#667781] mt-2 font-medium">
          Problem
        </div>
      </div>

      {/* PDF File Info */}
      <div className="flex items-center gap-3">
        {/* PDF Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-[#dc2626] rounded-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">PDF</span>
        </div>

        {/* File Details */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#111b21] truncate">
            {pdf.fileName}
          </div>
          <div className="text-xs text-[#667781] flex items-center gap-2">
            <span>{pdf.pageCount} sider</span>
            <span>•</span>
            <span>{formatFileSize(pdf.size)}</span>
            <span>•</span>
            <span>pdf</span>
          </div>
        </div>
      </div>
    </div>
  );
}
