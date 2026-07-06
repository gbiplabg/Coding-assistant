"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, Coins, Menu, Settings2, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Attachment, Message } from "@/lib/types";
import {
  computeCost,
  formatUSD,
  getModel,
  modelsByProvider,
  REASONING_LEVELS,
} from "@/lib/models";
import { ERROR_SENTINEL, USAGE_SENTINEL } from "@/lib/constants";
import { uid } from "@/lib/id";
import { MessageItem } from "./MessageItem";
import { Composer } from "./Composer";

const EXAMPLES = [
  "Why does this function return undefined?",
  "Refactor this loop to be more efficient",
  "Explain this stack trace and how to fix it",
  "Convert this callback code to async/await",
];

interface Props {
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
}

export function ChatPanel({ onOpenSidebar, onOpenSettings }: Props) {
  const {
    currentSession,
    createSession,
    addMessage,
    patchMessage,
    anthropicKey,
    openaiKey,
    model,
    setModel,
    reasoning,
    setReasoning,
  } = useStore();

  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = currentSession?.messages ?? [];
  const activeModel = getModel(model);
  const activeKey =
    activeModel?.provider === "openai" ? openaiKey : anthropicKey;
  const disabled = !activeKey;

  const sessionCost = useMemo(
    () => messages.reduce((sum, m) => sum + (m.usage?.costUsd ?? 0), 0),
    [messages],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = useCallback(
    async (text: string, attachments: Attachment[]) => {
      const info = getModel(model);
      const key = info?.provider === "openai" ? openaiKey : anthropicKey;
      if (!key) {
        onOpenSettings();
        return;
      }

      let sessionId = currentSession?.id;
      if (!sessionId) sessionId = createSession();

      const userMsg: Message = {
        id: uid("msg_"),
        role: "user",
        content: text,
        attachments,
        createdAt: Date.now(),
      };
      addMessage(sessionId, userMsg);

      const assistantMsg: Message = {
        id: uid("msg_"),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        streaming: true,
      };
      addMessage(sessionId, assistantMsg);

      const history = [...(currentSession?.messages ?? []), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": key },
          body: JSON.stringify({
            provider: info?.provider ?? "anthropic",
            model,
            reasoning: info?.reasoning ? reasoning : "off",
            messages: history,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let msg = `Request failed (${res.status}).`;
          try {
            const data = await res.json();
            if (data?.error) msg = data.error;
          } catch {
            /* not JSON */
          }
          patchMessage(sessionId, assistantMsg.id, {
            content: msg,
            error: true,
            streaming: false,
          });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";

        const visible = (s: string) => s.split(USAGE_SENTINEL)[0];

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });

          const errIndex = acc.indexOf(ERROR_SENTINEL);
          if (errIndex >= 0) {
            const before = acc.slice(0, errIndex).trim();
            const errText = acc.slice(errIndex + ERROR_SENTINEL.length).trim();
            patchMessage(sessionId, assistantMsg.id, {
              content: before ? `${before}\n\n**Error:** ${errText}` : errText,
              error: true,
              streaming: false,
            });
            reader.cancel();
            return;
          }

          patchMessage(sessionId, assistantMsg.id, { content: visible(acc) });
        }

        // Parse trailing usage metadata.
        const patch: Partial<Message> = {
          content: visible(acc).trimEnd(),
          streaming: false,
        };
        const uIdx = acc.indexOf(USAGE_SENTINEL);
        if (uIdx >= 0) {
          try {
            const raw = acc.slice(uIdx + USAGE_SENTINEL.length).trim();
            const parsed = JSON.parse(raw) as { in: number; out: number };
            patch.usage = {
              inputTokens: parsed.in,
              outputTokens: parsed.out,
              costUsd: computeCost(info, parsed.in, parsed.out),
              model,
            };
          } catch {
            /* ignore malformed usage */
          }
        }
        patchMessage(sessionId, assistantMsg.id, patch);
      } catch (e) {
        const aborted = e instanceof DOMException && e.name === "AbortError";
        patchMessage(sessionId, assistantMsg.id, {
          streaming: false,
          ...(aborted
            ? {}
            : {
                content: e instanceof Error ? e.message : "Network error.",
                error: true,
              }),
        });
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [
      model,
      reasoning,
      anthropicKey,
      openaiKey,
      currentSession,
      createSession,
      addMessage,
      patchMessage,
      onOpenSettings,
    ],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onOpenSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-panel2 hover:text-text lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>
          <span className="truncate text-sm font-medium text-text">
            {currentSession?.title ?? "New chat"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {sessionCost > 0 && (
            <span
              className="hidden items-center gap-1.5 rounded-lg border border-border bg-panel2 px-2.5 py-1.5 text-xs text-muted sm:flex"
              title="Estimated cost of this conversation"
            >
              <Coins size={13} className="text-accent" />
              <span className="font-medium text-text">{formatUSD(sessionCost)}</span>
            </span>
          )}
          <div
            className={`hidden items-center gap-1 rounded-lg border border-border bg-panel2 pl-2 pr-1 sm:flex ${
              activeModel?.reasoning ? "" : "opacity-40"
            }`}
            title={
              activeModel?.reasoning
                ? "Reasoning power — how much the model thinks before answering"
                : "Reasoning is not available for this model"
            }
          >
            <Brain
              size={13}
              className={activeModel?.reasoning ? "text-accent" : "text-faint"}
            />
            <select
              value={reasoning}
              onChange={(e) =>
                setReasoning(e.target.value as (typeof REASONING_LEVELS)[number]["id"])
              }
              disabled={!activeModel?.reasoning}
              className="cursor-pointer bg-transparent py-1.5 pr-1 text-xs text-text outline-none disabled:cursor-not-allowed"
              aria-label="Reasoning power"
            >
              {REASONING_LEVELS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="max-w-[190px] cursor-pointer rounded-lg border border-border bg-panel2 px-2.5 py-1.5 text-xs text-text outline-none hover:border-accent/40 focus:border-accent/60"
            aria-label="Model"
          >
            <optgroup label="Claude (Anthropic)">
              {modelsByProvider("anthropic").map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} · {m.tier}
                </option>
              ))}
            </optgroup>
            <optgroup label="GPT (OpenAI)">
              {modelsByProvider("openai").map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} · {m.tier}
                </option>
              ))}
            </optgroup>
          </select>
          <button
            onClick={onOpenSettings}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-panel2 hover:text-text"
            aria-label="Settings"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-6">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10">
              <Sparkles size={26} className="text-accent" />
            </div>
            <h1 className="text-2xl font-semibold text-text">
              What can I help you fix?
            </h1>
            <p className="mt-2 max-w-md text-center text-sm text-muted">
              Paste code, drop in a screenshot, PDF, or spreadsheet, and I&apos;ll
              debug it with you.
            </p>
            <div className="mt-7 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex, [])}
                  disabled={disabled}
                  className="rounded-xl border border-border bg-panel px-4 py-3 text-left text-sm text-muted transition-colors hover:border-accent/40 hover:text-text disabled:opacity-40"
                >
                  {ex}
                </button>
              ))}
            </div>
            {disabled && (
              <button
                onClick={onOpenSettings}
                className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent2"
              >
                Add your API key to begin
              </button>
            )}
          </div>
        ) : (
          <div className="pb-4">
            {messages.map((m) => (
              <MessageItem key={m.id} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <Composer
        disabled={disabled}
        streaming={streaming}
        onSend={send}
        onStop={stop}
      />
    </div>
  );
}
