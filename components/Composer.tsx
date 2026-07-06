"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  Square,
  X,
} from "lucide-react";
import type { Attachment } from "@/lib/types";
import { ACCEPT, humanSize, processFile } from "@/lib/files";
import { APP_NAME, DEVELOPER } from "@/lib/constants";

const QUICK_ACTIONS: { label: string; template: string }[] = [
  { label: "Fix bug", template: "Find and fix the bug in this code:\n\n" },
  { label: "Explain", template: "Explain what this code does:\n\n" },
  { label: "Optimize", template: "Optimize this code for performance and readability:\n\n" },
  { label: "Add tests", template: "Write unit tests for this code:\n\n" },
];

interface Props {
  disabled: boolean;
  streaming: boolean;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
}

export function Composer({ disabled, streaming, onSend, onStop }: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [text]);

  const canSend =
    !disabled && !streaming && (text.trim().length > 0 || attachments.length > 0);

  const submit = () => {
    if (!canSend) return;
    onSend(text.trim(), attachments);
    setText("");
    setAttachments([]);
    setError(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const processed: Attachment[] = [];
      for (const file of Array.from(files)) processed.push(await processFile(file));
      setAttachments((prev) => [...prev, ...processed]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) =>
    handleFiles(e.target.files);

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const applyQuickAction = (template: string) => {
    setText((prev) => (prev.startsWith(template) ? prev : template + prev));
    textareaRef.current?.focus();
  };

  const iconFor = (kind: string) =>
    kind === "image" ? ImageIcon : kind === "excel" ? FileSpreadsheet : FileText;

  return (
    <div className="border-t border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto w-full max-w-4xl px-4 pb-4 pt-3">
        {/* Quick actions */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => applyQuickAction(qa.template)}
              disabled={disabled}
              className="rounded-full border border-border bg-panel2 px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-text disabled:opacity-40"
            >
              {qa.label}
            </button>
          ))}
        </div>

        <div
          className="rounded-2xl border border-border bg-panel focus-within:border-accent/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {attachments.map((a) => {
                const Icon = iconFor(a.kind);
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-panel2 py-1.5 pl-2.5 pr-1.5 text-xs"
                  >
                    <Icon size={14} className="text-accent" />
                    <span className="max-w-[160px] truncate text-text">{a.name}</span>
                    <span className="text-faint">{humanSize(a.size)}</span>
                    <button
                      onClick={() => removeAttachment(a.id)}
                      className="rounded p-0.5 text-faint hover:bg-elevated hover:text-text"
                      aria-label="Remove attachment"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-end gap-2 p-2.5">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={disabled || busy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-text disabled:opacity-40"
              aria-label="Attach file"
              title="Attach image, PDF, or spreadsheet"
            >
              {busy ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Paperclip size={18} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={onFileInput}
            />

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                disabled
                  ? "Add your API key in Settings to start…"
                  : "Paste code or describe a bug…  (Enter to send, Shift+Enter for newline)"
              }
              disabled={disabled}
              className="max-h-[260px] flex-1 resize-none bg-transparent py-1.5 text-[0.95rem] text-text placeholder:text-faint focus:outline-none disabled:cursor-not-allowed"
            />

            {/* Animated command button */}
            {streaming ? (
              <motion.button
                onClick={onStop}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-text"
                aria-label="Stop generating"
                title="Stop"
              >
                <motion.span
                  animate={{ scale: [1, 0.82, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Square size={14} fill="currentColor" />
                </motion.span>
              </motion.button>
            ) : (
              <div className="relative shrink-0">
                {canSend && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-lg bg-accent"
                    animate={{ scale: [1, 1.4], opacity: [0.45, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                  />
                )}
                <motion.button
                  onClick={submit}
                  disabled={!canSend}
                  whileHover={canSend ? { scale: 1.12 } : undefined}
                  whileTap={canSend ? { scale: 0.85 } : undefined}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-bg transition-colors disabled:cursor-not-allowed disabled:bg-elevated disabled:text-faint"
                  aria-label="Send message"
                >
                  <motion.span
                    animate={canSend ? { y: [0, -2.5, 0] } : { y: 0 }}
                    transition={
                      canSend
                        ? { repeat: Infinity, duration: 1.3, ease: "easeInOut" }
                        : undefined
                    }
                  >
                    <ArrowUp size={18} strokeWidth={2.6} />
                  </motion.span>
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {error && <div className="mt-2 text-xs text-danger">{error}</div>}
        <div className="mt-2 flex flex-col items-center gap-0.5 text-[11px] text-faint">
          <span>{APP_NAME} can make mistakes. Verify important code before shipping.</span>
          <span>
            Developed by{" "}
            <span className="font-medium text-accent">{DEVELOPER}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
