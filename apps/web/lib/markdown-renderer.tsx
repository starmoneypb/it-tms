"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Sanitize schema:
 * - Allow <mark> and color-related props
 * - Keep className on <code>/<pre>/<span> to preserve language-xxx classes
 * - Allow target/rel on <a>
 */
const sanitizeSchema = (() => {
  const schema: any = JSON.parse(JSON.stringify(defaultSchema));

  schema.tagNames = Array.from(new Set([...(schema.tagNames || []), "mark"]));

  schema.attributes = {
    ...(schema.attributes || {}),
    code: [...(schema.attributes?.code || []), "className", "data-language"],
    pre: [...(schema.attributes?.pre || []), "className"],
    span: [...(schema.attributes?.span || []), "className"],
    mark: [
      ...(schema.attributes?.mark || []),
      "className",
      "style",
      "data-color",
      "data-highlight",
      "color",
    ],
    a: [...(schema.attributes?.a || []), "target", "rel"],
  };

  return schema;
})();

// ————— mark helpers —————
function pickMarkStyle(
  className?: string,
  props?: { [k: string]: unknown }
): React.CSSProperties {
  // 1) Respect existing background/backgroundColor styles
  const style = (props?.style || {}) as React.CSSProperties;
  if (style.background || style.backgroundColor) {
    return style;
  }

  // 2) Read color from data-* or color attr
  const dataColor =
    (props?.["data-color"] as string) ||
    (props?.["data-highlight"] as string) ||
    (props?.["color"] as string) ||
    "";

  // 3) Read from class="highlight-blue"
  const classColor = (className || "").match(/highlight-([\w-]+)/)?.[1];

  const colorKey = (dataColor || classColor || "yellow").toLowerCase();

  const colorMap: Record<string, { bg: string; text: string }> = {
    yellow: { bg: "#6b6524", text: "#58531e" },
    green: { bg: "#509568", text: "#47855d" },
    blue: { bg: "#6e92aa", text: "#5e86a1" },
    purple: { bg: "#583e74", text: "#4c3564" },
    red: { bg: "#743e42", text: "#643539" },
    gray: { bg: "rgb(47,47,47)", text: "rgba(255,255,255,0.094)" },
    brown: { bg: "rgb(74,50,40)", text: "rgba(184,101,69,0.25)" },
    orange: { bg: "rgb(92,59,35)", text: "rgba(233,126,37,0.2)" },
    pink: { bg: "rgb(78,44,60)", text: "rgba(220,76,145,0.22)" },
  };

  const picked = colorMap[colorKey] || colorMap.yellow;
  return { ...style, backgroundColor: picked.bg, color: picked.text };
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div
      className={[
        "markdown-content",
        "prose prose-invert prose-sm max-w-none",
        // Beautiful container for code blocks
        "prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-white/10",
        "prose-pre:rounded-lg prose-pre:overflow-x-auto",
        // Remove backticks decoration from typography for inline code
        "prose-code:before:content-[''] prose-code:after:content-['']",
        "prose-a:text-primary-400 hover:prose-a:text-primary-300",
        "prose-blockquote:border-l-primary-500",
        className,
      ].join(" ")}
    >
      <ReactMarkdown
        // Just GFM is enough (tables, task list, strikethrough, autolink)
        remarkPlugins={[remarkGfm]}
        // Order: raw -> sanitize -> slug
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeSlug]}
        components={{
          // Headings with alignment support
          h1: ({ children, ...props }) => {
            const style = (props as any).style || {};
            const textAlign = style.textAlign || 'left';
            
            return (
              <h1 
                className="text-2xl font-bold text-white mb-4"
                style={{ textAlign }}
              >
                {children}
              </h1>
            );
          },
          h2: ({ children, ...props }) => {
            const style = (props as any).style || {};
            const textAlign = style.textAlign || 'left';
            
            return (
              <h2 
                className="text-xl font-semibold text-white mb-3"
                style={{ textAlign }}
              >
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const style = (props as any).style || {};
            const textAlign = style.textAlign || 'left';
            
            return (
              <h3 
                className="text-lg font-medium text-white mb-2"
                style={{ textAlign }}
              >
                {children}
              </h3>
            );
          },
          h4: ({ children, ...props }) => {
            const style = (props as any).style || {};
            const textAlign = style.textAlign || 'left';
            
            return (
              <h4 
                className="text-base font-medium text-white mb-2"
                style={{ textAlign }}
              >
                {children}
              </h4>
            );
          },

          // Basic text with alignment support
          p: ({ children, ...props }) => {
            const style = (props as any).style || {};
            const textAlign = style.textAlign || 'left';
            
            return (
              <p 
                className="text-white/80 mb-3 leading-relaxed"
                style={{ textAlign }}
              >
                {children}
              </p>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white/90">{children}</em>
          ),

          // Links: anchor (#...) doesn't open new tab
          a: ({ children, href }) => {
            const isHash = href?.startsWith("#");
            return (
              <a
                href={href}
                className="underline transition-colors"
                target={isHash ? undefined : "_blank"}
                rel={isHash ? undefined : "noopener noreferrer"}
              >
                {children}
              </a>
            );
          },

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 text-white/80 pl-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 text-white/80 pl-4">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="mb-1">{children}</li>,

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 italic text-white/70 my-3 bg-primary-500/5 rounded-r-md py-2">
              {children}
            </blockquote>
          ),

          /**
           * PRE/Code:
           * - Override <pre> to be a simple wrapper to avoid "pre inside pre"
           * - Code blocks use SyntaxHighlighter (Prism) → supports multiple lines + no external CSS needed
           * - Inline code still uses <code> as before
           */
          pre: ({ children }) => (
            <div className="mb-3 overflow-x-auto">{children}</div>
          ),
          code: ({
            inline,
            className,
            children,
            ...props
          }: {
            inline?: boolean;
            className?: string;
            children?: React.ReactNode;
          } & React.HTMLAttributes<HTMLElement>) => {
            const raw = String(children ?? "");
            if (inline) {
              return (
                <code
                  className="bg-white/10 text-white/90 px-1 py-0.5 rounded text-[0.9em] font-mono border border-white/10"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // language-xxx → xxx
            const match = /language-([\w-]+)/.exec(className || "");
            const language = match?.[1] || undefined;

            // Remove trailing newline from block according to react-markdown standard
            const content = raw.replace(/\n$/, "");

            return (
              <SyntaxHighlighter
                language={language}
                style={oneDark}
                wrapLongLines
                PreTag="pre"
                CodeTag="code"
                customStyle={{
                  margin: 0,
                  background: "transparent",
                  padding: 0,
                }}
                className="not-prose"
              >
                {content}
              </SyntaxHighlighter>
            );
          },

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border-collapse border border-white/20">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-white/20 px-3 py-2 bg-white/10 text-white font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-white/20 px-3 py-2 text-white/80">
              {children}
            </td>
          ),

          // Strikethrough
          del: ({ children }) => (
            <del className="line-through text-white/60">{children}</del>
          ),

          // <mark> supports multiple ways to specify color
          mark: ({ children, className, ...props }: any) => {
            const style = pickMarkStyle(className, props);
            return (
              <mark
                className={`px-1 py-0.5 rounded ${className || ""}`}
                style={style}
              >
                {children}
              </mark>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
