"use client";

import { useState } from "react";
import {
  Check,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const {
    sessions,
    currentId,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setDraft(title);
  };

  const commitEdit = () => {
    if (editingId) renameSession(editingId, draft);
    setEditingId(null);
  };

  const handleNew = () => {
    createSession();
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed z-40 flex h-full w-[264px] flex-col border-r border-border bg-panel transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-bg">
              <Wrench size={15} strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-text">
              Baka
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-panel2 hover:text-text lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={handleNew}
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-panel2 px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent/40"
          >
            <Plus size={16} className="text-accent" />
            New chat
          </button>
        </div>

        {/* Sessions */}
        <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-3">
          {sessions.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-faint">
              No conversations yet.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sessions.map((s) => {
                const active = s.id === currentId;
                const editing = editingId === s.id;
                return (
                  <li key={s.id}>
                    <div
                      className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                        active
                          ? "bg-elevated text-text"
                          : "text-muted hover:bg-panel2"
                      }`}
                    >
                      <MessageSquare
                        size={15}
                        className={active ? "text-accent" : "text-faint"}
                      />

                      {editing ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={commitEdit}
                          className="min-w-0 flex-1 border-b border-accent/50 bg-transparent text-text outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            selectSession(s.id);
                            onClose();
                          }}
                          className="min-w-0 flex-1 truncate text-left"
                        >
                          {s.title}
                        </button>
                      )}

                      {editing ? (
                        <button
                          onClick={commitEdit}
                          className="text-faint hover:text-accent"
                          aria-label="Save title"
                        >
                          <Check size={14} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => startEdit(s.id, s.title)}
                            className="text-faint hover:text-text"
                            aria-label="Rename"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteSession(s.id)}
                            className="text-faint hover:text-danger"
                            aria-label="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div className="space-y-0.5 border-t border-border px-4 py-3 text-[11px] text-faint">
          <div>Sessions are stored locally in your browser.</div>
          <div>
            Developed by <span className="font-medium text-accent">Biplab18</span>
          </div>
        </div>
      </aside>
    </>
  );
}
