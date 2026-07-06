"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

function MarkdownImpl({ children }: { children: string }) {
  return (
    <div className="prose-mend">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Unwrap <pre> so our CodeBlock controls the container.
          pre: ({ children }) => <>{children}</>,
          code(props) {
            const { className, children } = props;
            const text = String(children ?? "");
            const match = /language-(\w+)/.exec(className || "");
            const isBlock = Boolean(match) || text.includes("\n");

            if (isBlock) {
              return (
                <CodeBlock
                  code={text.replace(/\n$/, "")}
                  language={match?.[1]}
                />
              );
            }
            return <code className="inline-code">{children}</code>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
