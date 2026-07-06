"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Message, Session } from "./types";
import { DEFAULT_MODEL, DEFAULT_REASONING, type ReasoningLevel } from "./models";
import { uid } from "./id";

const LS_SESSIONS = "baka.sessions.v1";
const LS_CURRENT = "baka.currentId.v1";
const LS_ANTHROPIC = "baka.anthropicKey.v1";
const LS_OPENAI = "baka.openaiKey.v1";
const LS_MODEL = "baka.model.v1";
const LS_REASONING = "baka.reasoning.v1";

interface StoreValue {
  hydrated: boolean;
  sessions: Session[];
  currentId: string | null;
  currentSession: Session | null;

  anthropicKey: string;
  openaiKey: string;
  model: string;
  reasoning: ReasoningLevel;

  setAnthropicKey: (key: string) => void;
  setOpenaiKey: (key: string) => void;
  setModel: (model: string) => void;
  setReasoning: (level: ReasoningLevel) => void;

  createSession: () => string;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;

  addMessage: (sessionId: string, message: Message) => void;
  patchMessage: (
    sessionId: string,
    messageId: string,
    patch: Partial<Message>,
  ) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [anthropicKey, setAnthropicKeyState] = useState("");
  const [openaiKey, setOpenaiKeyState] = useState("");
  const [model, setModelState] = useState(DEFAULT_MODEL);
  const [reasoning, setReasoningState] =
    useState<ReasoningLevel>(DEFAULT_REASONING);

  useEffect(() => {
    const loaded = loadJSON<Session[]>(LS_SESSIONS, []);
    const storedCurrent = localStorage.getItem(LS_CURRENT);
    setSessions(loaded);
    setAnthropicKeyState(localStorage.getItem(LS_ANTHROPIC) ?? "");
    setOpenaiKeyState(localStorage.getItem(LS_OPENAI) ?? "");
    setModelState(localStorage.getItem(LS_MODEL) ?? DEFAULT_MODEL);
    setReasoningState(
      (localStorage.getItem(LS_REASONING) as ReasoningLevel | null) ??
        DEFAULT_REASONING,
    );
    setCurrentId(
      storedCurrent && loaded.some((s) => s.id === storedCurrent)
        ? storedCurrent
        : loaded[0]?.id ?? null,
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
  }, [sessions, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (currentId) localStorage.setItem(LS_CURRENT, currentId);
    else localStorage.removeItem(LS_CURRENT);
  }, [currentId, hydrated]);

  const setAnthropicKey = useCallback((key: string) => {
    setAnthropicKeyState(key);
    localStorage.setItem(LS_ANTHROPIC, key);
  }, []);

  const setOpenaiKey = useCallback((key: string) => {
    setOpenaiKeyState(key);
    localStorage.setItem(LS_OPENAI, key);
  }, []);

  const setModel = useCallback((m: string) => {
    setModelState(m);
    localStorage.setItem(LS_MODEL, m);
  }, []);

  const setReasoning = useCallback((level: ReasoningLevel) => {
    setReasoningState(level);
    localStorage.setItem(LS_REASONING, level);
  }, []);

  const createSession = useCallback(() => {
    const now = Date.now();
    const session: Session = {
      id: uid("ses_"),
      title: "New chat",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setSessions((prev) => [session, ...prev]);
    setCurrentId(session.id);
    return session.id;
  }, []);

  const selectSession = useCallback((id: string) => setCurrentId(id), []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setCurrentId((cur) => (cur === id ? next[0]?.id ?? null : cur));
      return next;
    });
  }, []);

  const renameSession = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, title: title.trim() || "Untitled", updatedAt: Date.now() }
          : s,
      ),
    );
  }, []);

  const addMessage = useCallback((sessionId: string, message: Message) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const isFirstUser = message.role === "user" && s.messages.length === 0;
        const title = isFirstUser
          ? message.content.slice(0, 48).replace(/\s+/g, " ").trim() || s.title
          : s.title;
        return {
          ...s,
          title,
          messages: [...s.messages, message],
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const patchMessage = useCallback(
    (sessionId: string, messageId: string, patch: Partial<Message>) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            updatedAt: Date.now(),
            messages: s.messages.map((m) =>
              m.id === messageId ? { ...m, ...patch } : m,
            ),
          };
        }),
      );
    },
    [],
  );

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentId) ?? null,
    [sessions, currentId],
  );

  const value: StoreValue = {
    hydrated,
    sessions,
    currentId,
    currentSession,
    anthropicKey,
    openaiKey,
    model,
    reasoning,
    setAnthropicKey,
    setOpenaiKey,
    setModel,
    setReasoning,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    addMessage,
    patchMessage,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
