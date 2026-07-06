import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ERROR_SENTINEL, USAGE_SENTINEL } from "@/lib/constants";
import { getModel, type ReasoningLevel } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Baka, an expert AI pair programmer and debugger.

Your job: help the user fix bugs, understand code, and improve it.

Guidelines:
- Lead with the answer. When you fix a bug, state the root cause in one or two sentences, then give the corrected code.
- Always put code in fenced Markdown blocks tagged with the correct language (e.g. \`\`\`python).
- Be concise and direct. Do not pad responses with filler.
- When the user attaches an image, PDF, or spreadsheet, analyze it in the context of their request.
- If something is ambiguous, make a reasonable assumption and state it, rather than asking many questions.`;

type IncomingAttachment = {
  kind: "image" | "pdf" | "excel";
  name: string;
  mediaType?: string;
  data?: string;
  textContent?: string;
};

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: IncomingAttachment[];
};

/* ─────────────── Anthropic content ─────────────── */
function anthropicContent(
  msg: IncomingMessage,
): Anthropic.MessageParam["content"] {
  if (msg.role === "assistant") return msg.content;

  const blocks: Anthropic.ContentBlockParam[] = [];
  const preambles: string[] = [];

  for (const att of msg.attachments ?? []) {
    if (att.kind === "image" && att.data && att.mediaType) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: att.mediaType as
            | "image/png"
            | "image/jpeg"
            | "image/gif"
            | "image/webp",
          data: att.data,
        },
      });
    } else if (att.kind === "pdf" && att.data) {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: att.data },
      });
    } else if (att.kind === "excel" && att.textContent) {
      preambles.push(
        `Contents of "${att.name}" (spreadsheet exported as CSV):\n\n${att.textContent}`,
      );
    }
  }

  if (preambles.length) blocks.push({ type: "text", text: preambles.join("\n\n---\n\n") });
  blocks.push({ type: "text", text: msg.content || "(no message)" });
  return blocks;
}

/* ─────────────── OpenAI content ─────────────── */
function openaiMessages(
  messages: IncomingMessage[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  for (const m of messages) {
    if (m.role === "assistant") {
      out.push({ role: "assistant", content: m.content });
      continue;
    }

    const parts: OpenAI.Chat.ChatCompletionContentPart[] = [];
    const notes: string[] = [];

    for (const att of m.attachments ?? []) {
      if (att.kind === "image" && att.data && att.mediaType) {
        parts.push({
          type: "image_url",
          image_url: { url: `data:${att.mediaType};base64,${att.data}` },
        });
      } else if (att.kind === "excel" && att.textContent) {
        notes.push(`Contents of "${att.name}" (CSV):\n\n${att.textContent}`);
      } else if (att.kind === "pdf") {
        notes.push(
          `[Attached PDF "${att.name}" was not sent — choose a Claude model to analyze PDFs.]`,
        );
      }
    }

    const text = [...notes, m.content || "(no message)"].join("\n\n");
    if (parts.length === 0) {
      out.push({ role: "user", content: text });
    } else {
      parts.push({ type: "text", text });
      out.push({ role: "user", content: parts });
    }
  }
  return out;
}

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return Response.json(
      { error: "Missing API key. Add your key in Settings." },
      { status: 401 },
    );
  }

  let body: {
    provider?: string;
    model?: string;
    reasoning?: ReasoningLevel;
    messages?: IncomingMessage[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const provider = body.provider === "openai" ? "openai" : "anthropic";
  const model = body.model || (provider === "openai" ? "gpt-4o-mini" : "claude-opus-4-8");

  // Reasoning applies only where the model supports it.
  const reasoning = body.reasoning ?? "off";
  const useReasoning =
    provider === "anthropic" &&
    reasoning !== "off" &&
    (getModel(model)?.reasoning ?? false);
  const incoming = (body.messages ?? []).filter(
    (m) => m.content?.trim() || (m.attachments?.length ?? 0) > 0,
  );

  if (!incoming.length) {
    return Response.json({ error: "No messages to send." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (t: string) => controller.enqueue(encoder.encode(t));
      let usageIn = 0;
      let usageOut = 0;

      try {
        if (provider === "openai") {
          const client = new OpenAI({ apiKey });
          const completion = await client.chat.completions.create({
            model,
            messages: openaiMessages(incoming),
            stream: true,
            stream_options: { include_usage: true },
          });
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) send(delta);
            if (chunk.usage) {
              usageIn = chunk.usage.prompt_tokens ?? 0;
              usageOut = chunk.usage.completion_tokens ?? 0;
            }
          }
        } else {
          const client = new Anthropic({ apiKey });
          const messages: Anthropic.MessageParam[] = incoming.map((m) => ({
            role: m.role,
            content: anthropicContent(m),
          }));

          const base = {
            model,
            // Give thinking room when reasoning is on (thinking counts toward max_tokens).
            max_tokens: useReasoning ? 32000 : 16000,
            system: SYSTEM_PROMPT,
            messages,
          };
          // Adaptive thinking + effort control (GA on the reasoning-capable models).
          const params = useReasoning
            ? {
                ...base,
                thinking: { type: "adaptive" as const },
                output_config: { effort: reasoning },
              }
            : base;
          const s = client.messages.stream(params as Anthropic.MessageStreamParams);
          for await (const event of s) {
            if (event.type === "message_start") {
              usageIn = event.message.usage.input_tokens ?? 0;
            } else if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send(event.delta.text);
            } else if (event.type === "message_delta") {
              usageOut = event.usage.output_tokens ?? usageOut;
            }
          }
        }

        send(`${USAGE_SENTINEL}${JSON.stringify({ in: usageIn, out: usageOut })}`);
        controller.close();
      } catch (err: unknown) {
        const message =
          err instanceof Anthropic.APIError || err instanceof OpenAI.APIError
            ? `${(err as { status?: number }).status ?? ""} ${err.message}`.trim()
            : err instanceof Error
              ? err.message
              : "Unknown error";
        send(`${ERROR_SENTINEL}${message}`);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
