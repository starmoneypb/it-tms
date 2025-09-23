"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  หมายเหตุสำคัญ:
 *  - rehypeRaw เปิดให้ Markdown ที่มี HTML ดิบ (เช่น <mark>, <sup> ฯลฯ) ถูกเรนเดอร์จริง
 *  - rehypeSanitize ใช้ schema ที่ "ขยาย" เพื่อ:
 *      • อนุญาตแท็ก <mark> และ attribute ที่จำเป็น
 *      • คงค่า className บน <code>/<span> ที่ไฮไลต์ต้องใช้ (เช่น .hljs, .hljs-keyword ฯลฯ)
 *  - เรา override เฉพาะ inline <code> เพื่อไม่รบกวน block code ที่ไฮไลต์จัดการ
 *  - pre/block code ใช้สไตล์ผ่าน Tailwind Typography (prose-*) แทนการปรับ whitespace เอง
 * ──────────────────────────────────────────────────────────────────────────────
 */

const sanitizeSchema = (() => {
  // ทำ deep clone เพื่อไม่แก้ไขของเดิม
  const schema: any = JSON.parse(JSON.stringify(defaultSchema));

  // อนุญาต tag <mark>
  schema.tagNames = Array.from(new Set([...(schema.tagNames || []), "mark"]));

  // อนุญาต className บน <code> และ <span> (สำหรับ span ของ highlight.js)
  schema.attributes = {
    ...(schema.attributes || {}),
    code: [
      ...((schema.attributes && schema.attributes.code) || []),
      // อนุญาตเก็บ className ที่ไฮไลต์เติมเข้ามา
      "className",
      "data-language",
    ],
    span: [
      ...((schema.attributes && schema.attributes.span) || []),
      "className",
    ],
    mark: [
      ...((schema.attributes && schema.attributes.mark) || []),
      "className",
      // หากต้องการ inline style กับ <mark> (ไม่แนะนำหากรับ input ภายนอก)
      "style",
    ],
    a: [...((schema.attributes && schema.attributes.a) || []), "target", "rel"],
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
        // ปรับสไตล์บล็อกโค้ด/อินไลน์โค้ดผ่าน typography แทนการแตะ <code>/<pre> โดยตรง
        // ป้องกันไม่ให้ white-space/word-break ไปทำให้ markup ของไฮไลต์เพี้ยน
        "prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-white/10",
        "prose-pre:rounded-lg prose-pre:overflow-x-auto",
        "prose-code:before:content-[''] prose-code:after:content-['']",
        // ลิงก์และ blockquote ให้เหมาะกับธีมเข้ม
        "prose-a:text-primary-400 hover:prose-a:text-primary-300",
        "prose-blockquote:border-l-primary-500",
        className,
      ].join(" ")}
    >
      <ReactMarkdown
        // GFM: ตาราง, task list, strikethrough (+ แปลง \n เป็น <br> ถ้าอยากให้ขึ้นบรรทัดใหม่)
        remarkPlugins={[remarkGfm, remarkBreaks]}
        // ลำดับสำคัญ: raw -> sanitize -> slug/auto-link -> highlight
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema],
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
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

          // ลิงก์: เปิดแท็บใหม่เฉพาะ external; anchor (#...) จะไม่เปิดใหม่
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
           * - ปล่อย "block code" ให้ rehype-highlight จัด markup + className เอง
           * - จัดสไตล์เฉพาะ "inline code" เท่านั้น เพื่อไม่ทำลายคลาสจาก highlight.js
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
            // block code: อย่าแตะ className/children
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

          // ไฮไลต์ (==text==) ผ่านแท็ก <mark> ใน Markdown (ต้องมี rehypeRaw)
          mark: ({ children, className }: any) => {
            const colorMatch = className?.match(/highlight-(\w+)/);
            const color = colorMatch ? colorMatch[1] : "yellow";
            const colorMap: Record<
              string,
              { bg: string; text: string }
            > = {
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

            return (
              <mark
                className="px-1 py-0.5 rounded"
                style={{ backgroundColor: fallback.bg, color: fallback.text }}
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
