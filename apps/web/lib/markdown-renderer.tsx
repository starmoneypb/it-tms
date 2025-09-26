"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/* ---------------- helpers ---------------- */

function pickMarkStyle(
  className?: string,
  props?: { [k: string]: unknown }
): React.CSSProperties {
  const styleProp = props?.style as any;
  if (styleProp && (styleProp.background || styleProp.backgroundColor)) {
    return styleProp as React.CSSProperties;
  }
  const dataColor =
    (props?.["data-color"] as string) ||
    (props?.["data-highlight"] as string) ||
    (props?.["color"] as string) ||
    "";
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

/** deep-decode ทั้ง named และ numeric entities (decimal/hex) */
function decodeEntitiesOnce(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}
function decodeEntitiesDeep(s: string): string {
  let prev = s, i = 0;
  while (i++ < 5) {                 // ถอดซ้ำได้สูงสุด 5 ชั้น
    const next = decodeEntitiesOnce(prev);
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

/** รวม children ให้เป็นสตริงเดียว พร้อม preserve \n และเว้นวรรค */
function flattenChildrenToString(ch: any): string {
  const walk = (n: any): string => {
    if (n == null) return "";
    if (typeof n === "string" || typeof n === "number") return String(n);
    if (Array.isArray(n)) return n.map(walk).join("");
    if (React.isValidElement(n)) {
      const t = typeof n.type === "string" ? n.type.toLowerCase() : "";
      if (t === "br") return "\n";
      const inner = walk((n as any).props?.children);
      // ถ้าโดนผ่าเป็น <p>/<div>/<li> ให้ปิดด้วย newline
      if (t === "p" || t === "div" || t === "li") return inner + "\n";
      return inner;
    }
    return "";
  };
  return walk(ch).replace(/\r\n?/g, "\n");
}

/* ---------------- component ---------------- */

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div
      className={[
        "markdown-content",
        "max-w-none text-white/80 leading-relaxed",
        className,
      ].join(" ")}
      style={{ "--tw-list-style-type": "initial" } as React.CSSProperties}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}      // เปิดตลอดเพื่อรองรับ HTML ปะปน
        skipHtml={false}
        components={{
          /* Headings */
          h1: ({ children, ...props }) => {
            const ta = readTextAlign((props as any).style, (props as any).align);
            return <h1 className={`text-2xl font-bold text-white mb-4 text-${ta}`.replace("text-justify","")} style={{textAlign:ta}}>{children}</h1>;
          },
          h2: ({ children, ...props }) => {
            const ta = readTextAlign((props as any).style, (props as any).align);
            return <h2 className={`text-xl font-semibold text-white mb-3 text-${ta}`.replace("text-justify","")} style={{textAlign:ta}}>{children}</h2>;
          },
          h3: ({ children, ...props }) => {
            const ta = readTextAlign((props as any).style, (props as any).align);
            return <h3 className={`text-lg font-medium text-white mb-2 text-${ta}`.replace("text-justify","")} style={{textAlign:ta}}>{children}</h3>;
          },
          h4: ({ children, ...props }) => {
            const ta = readTextAlign((props as any).style, (props as any).align);
            return <h4 className={`text-base font-medium text-white mb-2 text-${ta}`.replace("text-justify","")} style={{textAlign:ta}}>{children}</h4>;
          },

          /* Paragraph */
          p: ({ children, ...props }) => {
            const ta = readTextAlign((props as any).style, (props as any).align);
            const arr = React.Children.toArray(children);
            const empty = arr.length === 0 || (arr.length === 1 && typeof arr[0] === "string" && arr[0].trim() === "");
            if (empty) return <br />;
            return <p className={`text-white/80 mb-3 leading-relaxed text-${ta}`.replace("text-justify","")} style={{textAlign:ta}}>{children}</p>;
          },

          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-white/90">{children}</em>,
          a: ({ children, href }) => {
            const isHash = href?.startsWith("#");
            return <a href={href} className="underline transition-colors" target={isHash?undefined:"_blank"} rel={isHash?undefined:"noopener noreferrer"}>{children}</a>;
          },

          /* Lists */
          ul: ({ children }) => <ul className="mb-4 text-white/80 pl-6 space-y-1" style={{listStyleType:"disc"}}>{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 text-white/80 pl-6 space-y-1" style={{listStyleType:"decimal"}}>{children}</ol>,
          li: ({ children }) => <li className="mb-1 leading-relaxed" style={{display:"list-item"}}>{children}</li>,

          input: (props: any) => {
            const type = (props.type || "").toString().toLowerCase();
            if (type !== "checkbox") return <input {...props} />;
            const checked = props.checked === true || props.checked === "" || props.checked === "true" || props["aria-checked"] === "true";
            return <input type="checkbox" className="mr-2 align-middle" checked={checked} readOnly disabled />;
          },

          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 italic text-white/70 my-4 bg-primary-500/10 rounded-r-md py-3 pr-4 shadow-sm">
              {children}
            </blockquote>
          ),

          /**
           * <pre> — แค่จัด styling/scroll เท่านั้น
           * ข้อความภายในจะถูก “เตรียม” โดย <code> (กรณี block)
           */
          pre: ({ children }) => (
            <pre
              className="not-prose mb-3"
              style={{
                margin: 0,
                background: "#1e1e1e",
                padding: "1rem",
                borderRadius: "0.5rem",
                border: "1px solid #3e3e3e",
                fontSize: "0.875rem",
                lineHeight: 1.4,
                overflowX: "auto",
                overflowY: "visible",
                whiteSpace: "pre",
                wordBreak: "normal",
                overflowWrap: "normal",
                tabSize: 2,
                fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
                color: "#d4d4d4",
              }}
            >
              {children}
            </pre>
          ),

          /**
           * <code>
           * - inline: decode เบา ๆ แล้วคืนเป็น inline code
           * - block (ใต้ <pre>): รวม children → สตริงเดียว + deep-decode → คืนเป็นข้อความล้วน
           *   (กันเคสโดน “ผ่า” เป็น <p>/<a> และกัน entity ค้างอย่าง &lt;, &amp; ฯลฯ)
           */
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              const raw = flattenChildrenToString(children);
              const text = decodeEntitiesDeep(raw);
              return (
                <code
                  className="bg-white/10 text-white/90 px-1 py-0.5 rounded text-[0.9em] font-mono border border-white/10 not-prose"
                  {...props}
                >
                  {text}
                </code>
              );
            }

            // block code
            const raw = flattenChildrenToString(children);
            const text = decodeEntitiesDeep(raw);
            return (
              <code
                className={className}
                {...props}
                style={{ background: "transparent", color: "inherit", display: "block" }}
              >
                {text}
              </code>
            );
          },

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

          hr: () => <hr className="border-none border-t-2 border-white/10 my-8" />,

          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border-collapse border border-white/20">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-white/20 px-3 py-2 bg-white/10 text-white font-semibold text-left">{children}</th>,
          td: ({ children }) => <td className="border border-white/20 px-3 py-2 text-white/80">{children}</td>,

          del: ({ children }) => <del className="line-through text-white/50 decoration-red-400 decoration-2">{children}</del>,

          mark: ({ children, className, ...props }: any) => {
            const style = pickMarkStyle(className, props);
            return <mark className={`px-1 py-0.5 rounded ${className || ""}`} style={style}>{children}</mark>;
          },

          div: ({ children, ...props }: any) => (props.style || props.className ? <div {...props}>{children}</div> : <>{children}</>),
          sup: ({ children }) => <sup className="align-super text-white/80">{children}</sup>,
          sub: ({ children }) => <sub className="align-sub text-white/80">{children}</sub>,
          u:   ({ children }) => <u className="underline decoration-white/60">{children}</u>,
          kbd: ({ children }) => <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-white/90 font-mono text-[0.85em]">{children}</kbd>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
