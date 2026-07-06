"use client";

import { FileSpreadsheet, FileText, ImageIcon, Sparkles, User } from "lucide-react";
import type { Message } from "@/lib/types";
import { humanSize } from "@/lib/files";
import { formatTokens, formatUSD } from "@/lib/models";
import { Markdown } from "./Markdown";

function AttachmentChip({
  name,
  kind,
  size,
}: {
  name: string;
  kind: string;
  size?: number;
}) {
  const Icon =
    kind === "image" ? ImageIcon : kind === "excel" ? FileSpreadsheet : FileText;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-panel2 px-2.5 py-1.5 text-xs text-muted">
      <Icon size={14} className="text-accent" />
      <span className="max-w-[180px] truncate text-text">{name}</span>
      {size ? <span className="text-faint">{humanSize(size)}</span> : null}
    </div>
  );
}

export function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className="animate-fade-up">
      <div className="mx-auto flex w-full max-w-4xl gap-3.5 px-4 py-5">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
            isUser
              ? "border-border bg-panel2 text-muted"
              : "border-accent/30 bg-accent/10 text-accent"
          }`}
        >
          {isUser ? <User size={16} /> : <Sparkles size={16} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 text-xs font-semibold text-faint">
            {isUser ? "You" : "Baka"}
          </div>

          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {message.attachments.map((a) => (
                <AttachmentChip key={a.id} name={a.name} kind={a.kind} size={a.size} />
              ))}
            </div>
          )}

          {message.error ? (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {message.content || "Something went wrong."}
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed text-text">
              {message.content}
            </div>
          ) : message.content ? (
            <Markdown>{message.content}</Markdown>
          ) : (
            <TypingDots />
          )}

          {message.streaming && message.content && (
            <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-accent align-middle" />
          )}

          {!isUser && message.usage && !message.streaming && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
              <span>{formatTokens(message.usage.inputTokens)} in</span>
              <span>{formatTokens(message.usage.outputTokens)} out</span>
              <span className="text-muted">{formatUSD(message.usage.costUsd)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
