"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * ปรับ schema ของ sanitize:
 * - อนุญาต <mark> และ attribute ที่ใช้กำหนดสี
 * - คง className บน <code>/<span>/<pre> เพื่อไม่ตัดคลาสของ highlight.js
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

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div
      className={[
        "markdown-content",
        "prose prose-invert prose-sm max-w-none",
        // block code container
        "prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-white/10",
        "prose-pre:rounded-lg prose-pre:overflow-x-auto",
        // ตัด backtick decoration ของ typography สำหรับ inline code
        "prose-code:before:content-[''] prose-code:after:content-['']",
        // ลิงก์และ blockquote ให้เข้ากับธีมมืด
        "prose-a:text-primary-400 hover:prose-a:text-primary-300",
        "prose-blockquote:border-l-primary-500",
        className,
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        // ลำดับ: raw -> sanitize -> slug -> highlight
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema],
          rehypeSlug, // ใส่ id ให้ heading (ไม่ทำเป็นลิงก์)
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        components={{
          // หัวข้อ
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-white mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-white mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-medium text-white mb-2">{children}</h4>
          ),

          // ข้อความ / เน้น
          p: ({ children }) => (
            <p className="text-white/80 mb-3 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white/90">{children}</em>
          ),

          // ลิงก์: anchor (#...) ไม่เปิดแท็บใหม่
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

          // รายการ
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 text-white/80">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 text-white/80">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="mb-1">{children}</li>,

          // อ้างอิง
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 italic text-white/70 my-3">
              {children}
            </blockquote>
          ),

          /**
           * โค้ด:
           * - inline code: แต่งเล็กน้อย
           * - block code: ปล่อยให้ rehype-highlight ใส่คลาส .hljs / .language-* เอง
           */
          code: ({ inline, className, children, ...props }: any) => {
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
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },

          // ตาราง
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

          /**
           * <mark> สี:
           * - class="highlight-blue" หรือ data-color="blue" / data-highlight="blue"
           * - ไม่ระบุ → yellow (ดีฟอลต์)
           */
          mark: ({ children, className, ...props }: any) => {
            const rawColor =
              (props["data-color"] as string) ||
              (props["data-highlight"] as string) ||
              (props["color"] as string) ||
              "";
            const classColorMatch = (className as string | undefined)?.match(
              /highlight-(\w+)/
            );
            const color = (classColorMatch?.[1] || rawColor || "yellow").toLowerCase();

            const colorMap: Record<string, { bg: string; text: string }> = {
              yellow: { bg: "#6b6524", text: "#58531e" },
              green: { bg: "#509568", text: "#47855d" },
              blue: { bg: "#6e92aa", text: "#5e86a1" },
              purple: { bg: "#583e74", text: "#4c3564" },
              red: { bg: "#743e42", text: "#643539" },
              gray: { bg: "rgb(47, 47, 47)", text: "rgba(255, 255, 255, 0.094)" },
              brown: { bg: "rgb(74, 50, 40)", text: "rgba(184, 101, 69, 0.25)" },
              orange: { bg: "rgb(92, 59, 35)", text: "rgba(233, 126, 37, 0.2)" },
              pink: { bg: "rgb(78, 44, 60)", text: "rgba(220, 76, 145, 0.22)" },
            };
            const fallback = colorMap[color] || colorMap.yellow;

            const style: React.CSSProperties = {
              backgroundColor: fallback.bg,
              color: fallback.text,
              ...(props.style as React.CSSProperties),
            };

            return (
              <mark className="px-1 py-0.5 rounded" style={style}>
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
