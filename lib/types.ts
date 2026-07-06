export type AttachmentKind = "image" | "pdf" | "excel";

export interface Attachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  /** MIME type, e.g. image/png or application/pdf */
  mediaType?: string;
  /** base64 (no data-URL prefix) for image/pdf */
  data?: string;
  /** extracted text (CSV) for excel */
  textContent?: string;
  /** byte size, for display */
  size?: number;
}

export type Role = "user" | "assistant";

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  model: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  createdAt: number;
  /** true while the assistant reply is still streaming in */
  streaming?: boolean;
  error?: boolean;
  usage?: Usage;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
