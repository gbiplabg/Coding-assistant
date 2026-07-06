"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatUSD, modelsByProvider, type Provider } from "@/lib/models";

interface Props {
  open: boolean;
  onClose: () => void;
}

function KeyField({
  label,
  placeholder,
  value,
  onChange,
  help,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  help: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-panel2 px-3 focus-within:border-accent/50">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent py-2.5 font-mono text-sm text-text placeholder:text-faint focus:outline-none"
        />
        <button
          onClick={() => setShow((s) => !s)}
          className="text-faint hover:text-text"
          aria-label={show ? "Hide key" : "Show key"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted">{help}</p>
    </div>
  );
}

function ModelGroup({
  title,
  provider,
  selected,
  onSelect,
}: {
  title: string;
  provider: Provider;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
        {title}
      </div>
      <div className="grid gap-1.5">
        {modelsByProvider(provider).map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              selected === m.id
                ? "border-accent/60 bg-accent/10 text-text"
                : "border-border bg-panel2 text-muted hover:border-border/80 hover:text-text"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="font-medium">{m.label}</span>
              <span className="text-[11px] text-faint">{m.tier}</span>
            </span>
            <span className="font-mono text-[11px] text-faint">
              {formatUSD(m.inputPrice)}/{formatUSD(m.outputPrice)} · 1M
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsModal({ open, onClose }: Props) {
  const {
    anthropicKey,
    openaiKey,
    setAnthropicKey,
    setOpenaiKey,
    model,
    setModel,
  } = useStore();

  const [anth, setAnth] = useState(anthropicKey);
  const [oai, setOai] = useState(openaiKey);

  useEffect(() => {
    if (open) {
      setAnth(anthropicKey);
      setOai(openaiKey);
    }
  }, [open, anthropicKey, openaiKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const save = () => {
    setAnthropicKey(anth.trim());
    setOpenaiKey(oai.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="animate-fade-up relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text">
            <KeyRound size={17} className="text-accent" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-panel2 hover:text-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <KeyField
            label="Anthropic API key"
            placeholder="sk-ant-..."
            value={anth}
            onChange={setAnth}
            help={
              <>
                For Claude models. Get one at{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline underline-offset-2"
                >
                  console.anthropic.com
                </a>
                .
              </>
            }
          />

          <KeyField
            label="OpenAI API key"
            placeholder="sk-..."
            value={oai}
            onChange={setOai}
            help={
              <>
                For GPT models. Get one at{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline underline-offset-2"
                >
                  platform.openai.com
                </a>
                .
              </>
            }
          />

          <p className="rounded-lg border border-border bg-panel2 px-3 py-2 text-xs text-muted">
            Keys are stored only in this browser and sent directly to the
            provider when you chat. Add either or both — the model picker uses the
            matching key.
          </p>

          <div className="space-y-3">
            <div className="text-sm font-medium text-text">Default model</div>
            <ModelGroup
              title="Claude · Anthropic"
              provider="anthropic"
              selected={model}
              onSelect={setModel}
            />
            <ModelGroup
              title="GPT · OpenAI"
              provider="openai"
              selected={model}
              onSelect={setModel}
            />
            <p className="text-[11px] text-faint">
              Prices shown are input/output per 1M tokens (approximate list
              prices). Baka estimates each chat&apos;s cost from actual token
              usage.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent2"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
