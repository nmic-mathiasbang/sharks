// Simple shared chat types used across components
export interface PdfAttachment {
  fileName: string;
  size: number;
  pageCount: number;
  extractedText: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
  agentName?: string;
  colors?: { background: string; text: string };
  isStreaming?: boolean;
  pdfAttachment?: PdfAttachment; // Optional PDF attachment for display
}


