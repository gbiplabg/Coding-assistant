export type Provider = "anthropic" | "openai";

export interface ModelInfo {
  id: string;
  label: string;
  provider: Provider;
  /** USD per 1M input tokens */
  inputPrice: number;
  /** USD per 1M output tokens */
  outputPrice: number;
  tier: string;
  /** whether this model supports the adjustable reasoning/effort control */
  reasoning: boolean;
}

/**
 * Ordered cheapest → most expensive within each provider.
 * Prices are per 1M tokens (approximate list prices; verify with your provider).
 */
export const MODELS: ModelInfo[] = [
  // ── Anthropic (Claude) ──────────────────────────────
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "anthropic", inputPrice: 1, outputPrice: 5, tier: "Cheapest", reasoning: false },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "anthropic", inputPrice: 3, outputPrice: 15, tier: "Balanced", reasoning: true },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", provider: "anthropic", inputPrice: 3, outputPrice: 15, tier: "Fast & sharp", reasoning: true },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", provider: "anthropic", inputPrice: 5, outputPrice: 25, tier: "Most capable", reasoning: true },
  { id: "claude-fable-5", label: "Claude Fable 5", provider: "anthropic", inputPrice: 10, outputPrice: 50, tier: "Premium", reasoning: true },

  // ── OpenAI (GPT) ────────────────────────────────────
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai", inputPrice: 0.15, outputPrice: 0.6, tier: "Cheapest", reasoning: false },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini", provider: "openai", inputPrice: 0.4, outputPrice: 1.6, tier: "Budget", reasoning: false },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai", inputPrice: 2, outputPrice: 8, tier: "Capable", reasoning: false },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", inputPrice: 2.5, outputPrice: 10, tier: "Multimodal", reasoning: false },
];

export const DEFAULT_MODEL = "claude-opus-4-8";

/* ─────────────── Reasoning power ─────────────── */
export type ReasoningLevel = "off" | "low" | "medium" | "high" | "max";

export const REASONING_LEVELS: { id: ReasoningLevel; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "max", label: "Max" },
];

export const DEFAULT_REASONING: ReasoningLevel = "off";

export function getModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelsByProvider(provider: Provider): ModelInfo[] {
  return MODELS.filter((m) => m.provider === provider);
}

/** Cost in USD for a single exchange. */
export function computeCost(
  model: ModelInfo | undefined,
  inputTokens: number,
  outputTokens: number,
): number {
  if (!model) return 0;
  return (
    (inputTokens / 1_000_000) * model.inputPrice +
    (outputTokens / 1_000_000) * model.outputPrice
  );
}

export function formatUSD(v: number): string {
  if (!v || v <= 0) return "$0.00";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 1) return `$${v.toFixed(3)}`;
  return `$${v.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  return n.toLocaleString("en-US");
}
