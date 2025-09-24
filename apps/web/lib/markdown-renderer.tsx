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
 * Sanitize schema (expanded):
 * - Allow <mark>, <del>, <input>, <img>, <sup>, <sub>, <u>, <kbd>, <hr>, <br>
 * - Keep className on <code>/<pre>/<span>
 * - Allow target/rel on <a>
 * - Allow style on <mark>, headings, <p> (for text-align), and <pre>/<code> (if present)
 */
const sanitizeSchema = (() => {
  const schema: any = JSON.parse(JSON.stringify(defaultSchema));

  schema.tagNames = Array.from(
    new Set([
      ...(schema.tagNames || []),
      "mark",
      "del",
      "input",
      "img",
      "sup",
      "sub",
      "u",
      "kbd",
      "hr",
      "br",
    ])
  );

  schema.attributes = {
    ...(schema.attributes || {}),
    code: [...(schema.attributes?.code || []), "className", "data-language", "style"],
    pre: [...(schema.attributes?.pre || []), "className", "style"],
    span: [...(schema.attributes?.span || []), "className"],
    mark: [
      ...(schema.attributes?.mark || []),
      "className",
      "style",
      "data-color",
      "data-highlight",
      "color",
    ],
    del: [...(schema.attributes?.del || []), "className"],
    a: [...(schema.attributes?.a || []), "target", "rel"],
    img: [
      ...(schema.attributes?.img || []),
      "src",
      "alt",
      "title",
      "width",
      "height",
      "loading",
      "decoding",
      "className",
    ],
    input: [
      ...(schema.attributes?.input || []),
      "type",
      "checked",
      "disabled",
      "aria-checked",
      "tabIndex",
      "readOnly",
      "className",
    ],
    sup: [...(schema.attributes?.sup || []), "className"],
    sub: [...(schema.attributes?.sub || []), "className"],
    u: [...(schema.attributes?.u || []), "className"],
    kbd: [...(schema.attributes?.kbd || []), "className"],

    // Allow inline style on headings and paragraphs to keep text-align from raw HTML
    h1: [...(schema.attributes?.h1 || []), "style", "align"],
    h2: [...(schema.attributes?.h2 || []), "style", "align"],
    h3: [...(schema.attributes?.h3 || []), "style", "align"],
    h4: [...(schema.attributes?.h4 || []), "style", "align"],
    h5: [...(schema.attributes?.h5 || []), "style", "align"],
    h6: [...(schema.attributes?.h6 || []), "style", "align"],
    p: [...(schema.attributes?.p || []), "style", "align"],
  };

  return schema;
})();

// ————— mark helpers —————
function pickMarkStyle(
  className?: string,
  props?: { [k: string]: unknown }
): React.CSSProperties {
  // 1) Respect existing background/backgroundColor styles
  const styleProp = props?.style as any;
  if (styleProp && (styleProp.background || styleProp.backgroundColor)) {
    return styleProp as React.CSSProperties;
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
  return { ...(styleProp as any), backgroundColor: picked.bg, color: picked.text };
}

function readTextAlign(
  styleProp: unknown,
  alignProp?: unknown
): "left" | "center" | "right" | "justify" {
  if (typeof alignProp === "string") {
    const v = alignProp.toLowerCase();
    if (v === "left" || v === "center" || v === "right" || v === "justify") {
      return v;
    }
  }

  if (styleProp && typeof styleProp === "object") {
    const ta = (styleProp as any).textAlign;
    if (ta && typeof ta === "string") {
      const v = ta.toLowerCase();
      if (v === "left" || v === "center" || v === "right" || v === "justify") return v;
    }
  }
  if (typeof styleProp === "string") {
    const m = styleProp.match(/text-align\s*:\s*(left|center|right|justify)/i);
    if (m) return m[1].toLowerCase() as any;
  }
  return "left";
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
        // GFM → tables, task list, strikethrough, autolink, (footnotes)
        remarkPlugins={[remarkGfm]}
        // Order: raw -> sanitize -> slug (ids are added after sanitize)
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeSlug]}
        components={{
          // Headings with alignment support (reads style even if it's a string)
          h1: ({ children, ...props }) => {
            const textAlign = readTextAlign((props as any).style, (props as any).align);
            const map = { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify" } as const;
            return (
              <h1 className={`text-2xl font-bold text-white mb-4 ${map[textAlign] ?? ""}`} style={{ textAlign }}>
                {children}
              </h1>
            );
          },
          h2: ({ children, ...props }) => {
            const textAlign = readTextAlign((props as any).style, (props as any).align);
            const map = { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify" } as const;
            return (
              <h2 className={`text-xl font-semibold text-white mb-3 ${map[textAlign] ?? ""}`} style={{ textAlign }}>
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const textAlign = readTextAlign((props as any).style, (props as any).align);
            const map = { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify" } as const;
            return (
              <h3 className={`text-lg font-medium text-white mb-2 ${map[textAlign] ?? ""}`} style={{ textAlign }}>
                {children}
              </h3>
            );
          },
          h4: ({ children, ...props }) => {
            const textAlign = readTextAlign((props as any).style, (props as any).align);
            const map = { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify" } as const;
            return (
              <h4 className={`text-base font-medium text-white mb-2 ${map[textAlign] ?? ""}`} style={{ textAlign }}>
                {children}
              </h4>
            );
          },

          // Basic text with alignment support
          p: ({ children, ...props }) => {
            const textAlign = readTextAlign((props as any).style, (props as any).align);

            // If this paragraph contains only a code block, don't wrap it in <p>
            if (React.Children.count(children) === 1) {
              const child = React.Children.toArray(children)[0];
              if (React.isValidElement(child) && (child as any).type === 'pre') {
                return <>{children}</>;
              }
            }

            const map = { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify" } as const;
            return (
              <p className={`text-white/80 mb-3 leading-relaxed ${map[textAlign] ?? ""}`} style={{ textAlign }}>
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
            <ul className="list-disc mb-4 text-white/80 pl-6 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal mb-4 text-white/80 pl-6 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="mb-1 leading-relaxed">
              {children}
            </li>
          ),

          // Task list checkboxes (rendered by remark-gfm as <input type="checkbox">)
          input: (props: any) => {
            const type = (props.type || '').toString().toLowerCase();
            if (type !== 'checkbox') return <input {...props} />;
            const checked =
              props.checked === true ||
              props.checked === '' ||
              props.checked === 'true' ||
              props['aria-checked'] === 'true';
            return (
              <input
                type="checkbox"
                className="mr-2 align-middle"
                checked={checked}
                readOnly
                disabled
              />
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 italic text-white/70 my-4 bg-primary-500/10 rounded-r-md py-3 pr-4 shadow-sm">
              {children}
            </blockquote>
          ),

          /**
           * PRE/Code:
           * - 'pre' is kept minimal to avoid "pre inside pre"
           * - Code blocks use SyntaxHighlighter (Prism)
           */
          pre: ({ children }) => {
            return <div className="mb-3 overflow-x-auto">{children}</div>;
          },
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
            const languageMatch = /language-([\w-]+)/.exec(className || "");
            const language = languageMatch?.[1] || undefined;
            const hasLineBreak = /\n/.test(raw.trimEnd());

            const shouldRenderInline =
              inline === true ||
              (inline === undefined && !language && !(className || "").includes("language-") && !hasLineBreak);

            if (shouldRenderInline) {
              return (
                <code
                  className="bg-white/10 text-white/90 px-1 py-0.5 rounded text-[0.9em] font-mono border border-white/10 not-prose"
                  {...props}
                >
                  {children}
                </code>
              );
            }

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
                  background: "#1e1e1e",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #3e3e3e",
                  fontSize: "0.875rem",
                  lineHeight: "1.5",
                }}
                className="not-prose"
                codeTagProps={{
                  style: {
                    fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
                  }
                }}
              >
                {content}
              </SyntaxHighlighter>
            );
          },

          // Images
          img: ({ src, alt, title }) => (
            <img
              src={src || ""}
              alt={alt || ""}
              title={title}
              loading="lazy"
              decoding="async"
              className="max-w-full h-auto rounded-md my-3 border border-white/10"
            />
          ),

          // Horizontal rule
          hr: () => <hr className="border-white/10 my-6" />,

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
            <del className="line-through text-white/50 decoration-red-400 decoration-2">{children}</del>
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

          // Extra inline HTML helpers
          sup: ({ children }) => <sup className="align-super text-white/80">{children}</sup>,
          sub: ({ children }) => <sub className="align-sub text-white/80">{children}</sub>,
          u:   ({ children }) => <u className="underline decoration-white/60">{children}</u>,
          kbd: ({ children }) => (
            <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-white/90 font-mono text-[0.85em]">
              {children}
            </kbd>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
