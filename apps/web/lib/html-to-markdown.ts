// Simple HTML to Markdown converter for basic content
// Notes:
// - ป้องกัน `<code>` หลายบรรทัดไม่ให้กลายเป็น inline backticks
// - รองรับ <div class="not-prose"> จาก renderer เดิม ให้แปลงกลับเป็น fenced block ```
// - เปิดทางให้ markup ที่จำเป็น (mark/sup/sub/u/kbd/br)

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function pickAttr(tagHtml: string, name: string): string | undefined {
  const m = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tagHtml);
  return m?.[1];
}

function extractTextAlign(tagHtml: string): string | null {
  const styleMatch = /style\s*=\s*["']([^"']*)["']/i.exec(tagHtml);
  if (styleMatch) {
    const styleContent = styleMatch[1];
    const textAlignMatch = /text-align\s*:\s*(left|center|right|justify)/i.exec(styleContent);
    if (textAlignMatch) return `text-align: ${textAlignMatch[1]}`;
  }
  return null;
}

function convertImages(html: string): string {
  return html.replace(/<img\b[^>]*?>/gi, (fullTag: string) => {
    const src = pickAttr(fullTag, "src") || "";
    if (!src) return "";
    const alt = pickAttr(fullTag, "alt") || "";
    const title = pickAttr(fullTag, "title");
    const titlePart = title ? ` "${title}"` : "";
    return `![${alt}](${src}${titlePart})`;
  });
}

function convertOrderedLists(html: string): string {
  const olRegex = /<ol\b[^>]*>([\s\S]*?)<\/ol>/gi;
  return html.replace(olRegex, (match: string, inner: string) => {
    const startMatch = /<ol\b[^>]*\bstart=["']?(\d+)["']?[^>]*>/i.exec(match);
    let index = startMatch ? parseInt(startMatch[1], 10) || 1 : 1;

    let content = convertOrderedLists(inner);
    content = convertUnorderedLists(content);

    content = content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_liFull: string, liInner: string) => {
      const trimmed = liInner.trim();
      const lines = decodeEntities(trimmed).split("\n");
      const first = lines.shift() ?? "";
      const rest = lines.length ? "\n" + lines.map((l) => (l ? "   " + l : "")).join("\n") : "";
      return `${index++}. ${first}${rest}\n`;
    });

    return `\n${content}\n`;
  });
}

function convertUnorderedLists(html: string): string {
  const ulRegex = /<ul\b[^>]*>([\s\S]*?)<\/ul>/gi;
  return html.replace(ulRegex, (_match: string, inner: string) => {
    let content = convertOrderedLists(inner);
    content = convertUnorderedLists(content);

    content = content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_liFull: string, liInner: string) => {
      const trimmed = liInner.trim();
      const lines = decodeEntities(trimmed).split("\n");
      const first = lines.shift() ?? "";
      const rest = lines.length ? "\n" + lines.map((l) => (l ? "  " + l : "")).join("\n") : "";
      return `- ${first}${rest}\n`;
    });

    return `\n${content}\n`;
  });
}

export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === "") return "";

  let markdown = html;

  // Remove outermost wrapper (เช่น DOMPurify)
  markdown = markdown.replace(/^\s*<div[^>]*>/i, "").replace(/<\/div>\s*$/i, "");

  // Normalize newlines
  markdown = markdown.replace(/\r\n?/g, "\n");

  // ——— Protect & capture code blocks ———
  const codeBlocks: string[] = [];

  // <pre>...</pre>
  markdown = markdown.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
    const index = codeBlocks.length;
    codeBlocks.push(match);
    return `__CODE_BLOCK_${index}__`;
  });

  // <div class="... not-prose ...">...</div> (renderer เดิม)
  markdown = markdown.replace(/<div[^>]*class="[^"]*not-prose[^"]*"[^>]*>[\s\S]*?<\/div>/gi, (match) => {
    const index = codeBlocks.length;
    codeBlocks.push(match);
    return `__CODE_BLOCK_${index}__`;
  });

  // Inline code: multi-line → fenced block
  markdown = markdown.replace(
    /<code\b[^>]*>([\s\S]*?)<\/code>/gi,
    (_m: string, c: string) => {
      const text = decodeEntities(c).replace(/\r\n?/g, "\n");
      if (/\n/.test(text)) {
        return `\n\`\`\`\n${text}\n\`\`\`\n`;
      }
      return "`" + text + "`";
    }
  );

  // Headings with alignment
  markdown = markdown
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (m: string, c: string) => {
      const style = extractTextAlign(m);
      return style ? `<h1 style="${style}">${decodeEntities(c)}</h1>\n\n` : `# ${decodeEntities(c)}\n\n`;
    })
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (m: string, c: string) => {
      const style = extractTextAlign(m);
      return style ? `<h2 style="${style}">${decodeEntities(c)}</h2>\n\n` : `## ${decodeEntities(c)}\n\n`;
    })
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (m: string, c: string) => {
      const style = extractTextAlign(m);
      return style ? `<h3 style="${style}">${decodeEntities(c)}</h3>\n\n` : `### ${decodeEntities(c)}\n\n`;
    })
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, (m: string, c: string) => {
      const style = extractTextAlign(m);
      return style ? `<h4 style="${style}">${decodeEntities(c)}</h2>\n\n` : `#### ${decodeEntities(c)}\n\n`;
    })
    .replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, (m: string, c: string) => {
      const style = extractTextAlign(m);
      return style ? `<h5 style="${style}">${decodeEntities(c)}</h5>\n\n` : `##### ${decodeEntities(c)}\n\n`;
    })
    .replace(/<h6\b[^>]*>([\s\S]*?)<\/h6>/gi, (m: string, c: string) => {
      const style = extractTextAlign(m);
      return style ? `<h6 style="${style}">${decodeEntities(c)}</h6>\n\n` : `###### ${decodeEntities(c)}\n\n`;
    });

  // HR
  markdown = markdown.replace(/<hr\s*\/?>/gi, `\n---\n\n`);

  // Emphasis / strong / strike
  markdown = markdown
    .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, (_m: string, c: string) => {
      const t = decodeEntities(c);
      return t.includes("**") || t.includes("*") || t.includes("~~") ? t : `*${t}*`;
    })
    .replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, (_m: string, c: string) => {
      const t = decodeEntities(c);
      return t.includes("**") || t.includes("*") || t.includes("~~") ? t : `*${t}*`;
    })
    .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, (_m: string, c: string) => {
      const t = decodeEntities(c);
      return t.includes("**") || t.includes("*") || t.includes("~~") ? t : `**${t}**`;
    })
    .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, (_m: string, c: string) => {
      const t = decodeEntities(c);
      return t.includes("**") || t.includes("*") || t.includes("~~") ? t : `**${t}**`;
    })
    .replace(/<(del|s|strike)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m: string, _t: string, c: string) => {
      const t = decodeEntities(c);
      return t.includes("**") || t.includes("*") || t.includes("~~") ? t : `~~${t}~~`;
    });

  // BR
  markdown = markdown.replace(/<br\s*\/?>/gi, "\n");

  // Images
  markdown = convertImages(markdown);

  // Links
  markdown = markdown.replace(
    /<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m: string, href: string, text: string) => `[${decodeEntities(text)}](${href})`
  );

  // Blockquote
  markdown = markdown.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m: string, c: string) => {
    const inner = c.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_mp: string, pc: string) => decodeEntities(pc) + "\n");
    return `\n> ${inner.trim().replace(/\n/g, "\n> ")}\n\n`;
  });

  // Lists
  markdown = convertOrderedLists(markdown);
  markdown = convertUnorderedLists(markdown);

  // Paragraphs
  markdown = markdown.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (m: string, c: string) => {
    const style = extractTextAlign(m);
    const decoded = decodeEntities(c);
    if (isMarkdownContent(decoded)) return `${decoded}\n\n`;
    return style ? `<p style="${style}">${decoded}</p>\n\n` : `${decoded}\n\n`;
  });

  // คืน code blocks ที่กันไว้
  codeBlocks.forEach((block, index) => {
    const placeholder = `__CODE_BLOCK_${index}__`;
    if (!markdown.includes(placeholder)) return;

    let finalBlock = block;
    const isDivCodeBlock = /<div[^>]*class="[^"]*not-prose[^"]*"/i.test(block);

    if (isDivCodeBlock) {
      const codeMatch = block.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
      if (codeMatch) {
        const content = decodeEntities(codeMatch[1]).replace(/\r\n?/g, "\n");
        finalBlock = `\n\`\`\`\n${content}\n\`\`\`\n\n`;
      } else {
        const textContent = decodeEntities(block.replace(/<[^>]*>/g, "")).replace(/\r\n?/g, "\n");
        finalBlock = `\n\`\`\`\n${textContent}\n\`\`\`\n\n`;
      }
    } else {
      finalBlock = finalBlock
        .replace(
          /<pre[^>]*>\s*<code[^>]*class=["']language-([^"']+)["'][^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
          (_m: string, lang: string, content: string) =>
            `\n\`\`\`${lang}\n${decodeEntities(content).replace(/<br\s*\/?>/gi, "\n").replace(/\r\n?/g, "\n")}\n\`\`\`\n\n`
        )
        .replace(
          /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
          (_m: string, content: string) =>
            `\n\`\`\`\n${decodeEntities(content).replace(/<br\s*\/?>/gi, "\n").replace(/\r\n?/g, "\n")}\n\`\`\`\n\n`
        )
        .replace(
          /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
          (_m: string, content: string) =>
            `\n\`\`\`\n${decodeEntities(content).replace(/<br\s*\/?>/gi, "\n").replace(/\r\n?/g, "\n")}\n\`\`\`\n\n`
        );
    }

    markdown = markdown.replace(placeholder, finalBlock);
  });

  // อนุรักษ์ tag inline ที่จำเป็น และลบ tag อื่น
  markdown = markdown.replace(/<(?!\/?(mark|sup|sub|u|kbd|br)\b)[^>]*>/gi, "");

  // Decode leftovers
  markdown = decodeEntities(markdown);

  // Clean blank lines
  markdown = markdown.replace(/\n{4,}/g, "\n\n\n").trim();

  return markdown;
}

// Heuristics: HTML?
export function isHtmlContent(content: string): boolean {
  if (!content || content.trim() === "") return false;
  const hasHtmlEntities = /&[a-zA-Z]+;|&#\d+;/.test(content);
  const hasHtmlTags = /<[a-zA-Z][^>]*\s[^>]*>/.test(content);
  const hasHtmlStructure = /<(div|span|p|h[1-6]|ul|ol|li|blockquote|pre|code|strong|em|b|i|a|img|hr|br)[^>]*>/.test(content);
  const hasMarkdownPatterns = isMarkdownContent(content);
  return (hasHtmlEntities || hasHtmlTags || hasHtmlStructure) && !hasMarkdownPatterns;
}

// Heuristics: Markdown?
export function isMarkdownContent(content: string): boolean {
  if (!content || content.trim() === "") return false;

  const markdownPatterns = [
    /^\s*#{1,6}\s+/m,
    /^\s*[-*+]\s+/m,
    /^\s*\d+\.\s+/m,
    /\*\*[^*]+\*\*/,
    /\*[^*]+\*/,
    /`[^`]+`/,
    /```[\s\S]*?```/,
    /^\s*>\s+/m,
    /\[([^\]]+)\]\([^)]+\)/,
    /!\[([^\]]*)\]\([^)]+\)/,
    /^\s*---+\s*$/m,
    /~~[^~]+~~/,
    /^\s*\|.*\|.*\|/m,
    /^\s*- \[[ x]\]\s+/m,
    /\*\*[^*]*\*\*/,
    /\*[^*]*\*/,
  ];

  return markdownPatterns.some((p) => p.test(content));
}

export function convertContentToMarkdown(content: string): string {
  if (!content || content.trim() === "") return "";
  const hasHtml = isHtmlContent(content);
  const hasMarkdown = isMarkdownContent(content);
  if (hasHtml && hasMarkdown) return htmlToMarkdown(content);
  if (hasHtml) return htmlToMarkdown(content);
  if (hasMarkdown) return content;
  return content;
}

export function convertContentToMarkdownEnhanced(content: string): string {
  if (!content || content.trim() === "") return "";
  const hasHtml = isHtmlContent(content);
  const hasMarkdown = isMarkdownContent(content);
  if (hasHtml && hasMarkdown) return htmlToMarkdown(content);
  if (hasHtml) return htmlToMarkdown(content);
  if (hasMarkdown) return content;
  return content;
}

// Convert content to HTML format for TiptapEditor (read-only mode)
export function convertContentToHtml(content: string): string {
  if (!content || content.trim() === "") return "";
  const hasHtml = isHtmlContent(content);
  const hasMarkdown = isMarkdownContent(content);
  
  // If it's already HTML, return as-is
  if (hasHtml && !hasMarkdown) return content;
  
  // If it's markdown, we need to convert it to HTML
  if (hasMarkdown && !hasHtml) {
    // Simple markdown to HTML conversion for basic cases
    return convertMarkdownToHtml(content);
  }
  
  // If it has both or neither, return as-is (assume it's HTML)
  return content;
}

// Simple markdown to HTML converter for basic cases
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]*)`/gim, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]*)\]\(([^)]*)\)/gim, '<a href="$2">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/gim, '<br>');
  
  return html;
}
