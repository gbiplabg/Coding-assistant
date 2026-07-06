"use client";

import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import hljs from "highlight.js/lib/common";
import { Check, Copy } from "lucide-react";

interface Props {
  code: string;
  language?: string;
}

function highlight(code: string, language?: string): string {
  try {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch {
    // Fall back to escaped plain text.
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

function CodeBlockImpl({ code, language }: Props) {
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => highlight(code, language), [code, language]);
  const lineCount = useMemo(() => code.split("\n").length, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="group my-3 overflow-hidden rounded-xl border border-border bg-[#0d1015]"
    >
      <div className="flex items-center justify-between border-b border-border/70 bg-panel2 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
          {language || "code"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-elevated hover:text-text"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={13} className="text-accent" /> Copied
            </>
          ) : (
            <>
              <Copy size={13} /> Copy
            </>
          )}
        </button>
      </div>

      <div className="relative overflow-x-auto">
        <div className="flex min-w-full font-mono text-[13px] leading-[1.6]">
          {/* Line-number gutter */}
          <div
            aria-hidden
            className="select-none border-r border-border/60 px-3 py-3 text-right text-faint"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Highlighted code */}
          <pre className="flex-1 overflow-visible py-3 pl-4 pr-4">
            <code
              className="hljs bg-transparent"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </pre>
        </div>

        {/* One-pass "scanner" reveal — the signature animation */}
        <motion.div
          aria-hidden
          initial={{ top: "0%", opacity: 0.9 }}
          animate={{ top: "100%", opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="pointer-events-none absolute left-0 h-8 w-full bg-gradient-to-b from-transparent via-accent/10 to-transparent"
          style={{ boxShadow: "0 0 18px 2px rgba(45,212,191,0.12)" }}
        />
      </div>
    </motion.div>
  );
}

export const CodeBlock = memo(CodeBlockImpl);
