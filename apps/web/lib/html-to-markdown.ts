// Simple HTML to Markdown converter for basic content
// This is still a lightweight implementation. For production-grade needs,
// consider using 'turndown' or a real HTML parser.
// Improvements:
// - Preserve/convert <img>, <hr>, <sup>, <sub>, <u>
// - Proper ordered list numbering (<ol> -> 1. ...), keep <ul> as '- '
// - Safer list handling per-block (not perfect for deep nesting, but correct for common cases)
// - Keep <mark> (with style/class) as raw HTML so renderer can style it
// - Better entity decoding
// - Avoid stripping useful inline HTML like <sup>/<sub>/<u>

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Extract attribute value from a whole tag string.
function pickAttr(tagHtml: string, name: string): string | undefined {
  const m = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tagHtml);
  return m?.[1];
}

// Convert <img ...> to Markdown image: ![alt](src "title")
function convertImages(html: string): string {
  return html.replace(/<img\b[^>]*?>/gi, (fullTag: string) => {
    const src = pickAttr(fullTag, 'src') || '';
    if (!src) return ''; // drop invalid image
    const alt = pickAttr(fullTag, 'alt') || '';
    const title = pickAttr(fullTag, 'title');
    const titlePart = title ? ` "${title}"` : '';
    return `![${alt}](${src}${titlePart})`;
  });
}

// Convert ordered lists block-by-block to "1. " numbering.
// Supports <ol start="N">. (Nested lists are handled reasonably for common cases.)
function convertOrderedLists(html: string): string {
  const olRegex = /<ol\b[^>]*>([\s\S]*?)<\/ol>/gi;
  return html.replace(olRegex, (match: string, inner: string) => {
    const startMatch = /<ol\b[^>]*\bstart=["']?(\d+)["']?[^>]*>/i.exec(match);
    let index = startMatch ? parseInt(startMatch[1], 10) || 1 : 1;

    // First, recursively convert any nested <ol>/<ul> inside this block
    let content = convertOrderedLists(inner);
    content = convertUnorderedLists(content);

    // Now number the top-level <li> in this block
    let out = '';
    content = content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_liFull: string, liInner: string) => {
      // Clean line breaks inside li; we will preserve inner newlines if present
      const trimmed = liInner.trim();
      // If li contains its own lists already converted to MD, indent subsequent lines
      const lines = decodeEntities(trimmed).split('\n');
      const first = lines.shift() ?? '';
      const rest = lines.length ? '\n' + lines.map(l => (l ? '   ' + l : '')).join('\n') : '';
      return `${index++}. ${first}${rest}\n`;
    });

    out += content;
    return `\n${out}\n`;
  });
}

// Convert unordered lists block-by-block to "- " bullet items.
function convertUnorderedLists(html: string): string {
  const ulRegex = /<ul\b[^>]*>([\s\S]*?)<\/ul>/gi;
  return html.replace(ulRegex, (_match: string, inner: string) => {
    // Recursively process nested lists inside
    let content = convertOrderedLists(inner);
    content = convertUnorderedLists(content);

    content = content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_liFull: string, liInner: string) => {
      const trimmed = liInner.trim();
      const lines = decodeEntities(trimmed).split('\n');
      const first = lines.shift() ?? '';
      const rest = lines.length ? '\n' + lines.map(l => (l ? '  ' + l : '')).join('\n') : '';
      return `- ${first}${rest}\n`;
    });

    return `\n${content}\n`;
  });
}

export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '') return '';

  let markdown = html;

  // Remove DOMPurify outer wrapper if present (only the outermost)
  markdown = markdown.replace(/^\s*<div[^>]*>/i, '').replace(/<\/div>\s*$/i, '');

  // Normalize newlines
  markdown = markdown.replace(/\r\n?/g, '\n');

  // Convert code blocks (with language)
  markdown = markdown.replace(
    /<pre[^>]*>\s*<code[^>]*class=["']language-([^"']+)["'][^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_m: string, language: string, content: string) => {
      const clean = decodeEntities(
        content.replace(/<br\s*\/?>/gi, '\n')
      );
      return `\n\`\`\`${language}\n${clean}\n\`\`\`\n\n`;
    }
  );

  // Convert code blocks (no language)
  markdown = markdown.replace(
    /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_m: string, content: string) => {
      const clean = decodeEntities(
        content.replace(/<br\s*\/?>/gi, '\n')
      );
      return `\n\`\`\`\n${clean}\n\`\`\`\n\n`;
    }
  );

  // Pre without inner code
  markdown = markdown.replace(
    /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_m: string, content: string) => {
      const clean = decodeEntities(
        content.replace(/<br\s*\/?>/gi, '\n')
      );
      return `\n\`\`\`\n${clean}\n\`\`\`\n\n`;
    }
  );

  // Inline code (after block code to avoid conflicts)
  markdown = markdown.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m: string, c: string) => '`' + decodeEntities(c) + '`');

  // Headings
  markdown = markdown
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_m: string, c: string) => `# ${decodeEntities(c)}\n\n`)
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_m: string, c: string) => `## ${decodeEntities(c)}\n\n`)
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_m: string, c: string) => `### ${decodeEntities(c)}\n\n`)
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, (_m: string, c: string) => `#### ${decodeEntities(c)}\n\n`)
    .replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, (_m: string, c: string) => `##### ${decodeEntities(c)}\n\n`)
    .replace(/<h6\b[^>]*>([\s\S]*?)<\/h6>/gi, (_m: string, c: string) => `###### ${decodeEntities(c)}\n\n`);

  // Horizontal rule
  markdown = markdown.replace(/<hr\s*\/?>/gi, `\n---\n\n`);

  // Bold / italic / strikethrough
  markdown = markdown
    .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, (_m: string, c: string) => `**${decodeEntities(c)}**`)
    .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, (_m: string, c: string) => `**${decodeEntities(c)}**`)
    .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, (_m: string, c: string) => `*${decodeEntities(c)}*`)
    .replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, (_m: string, c: string) => `*${decodeEntities(c)}*`)
    .replace(/<(del|s|strike)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m: string, _t: string, c: string) => `~~${decodeEntities(c)}~~`);

  // Line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

  // Images (do this before stripping other tags)
  markdown = convertImages(markdown);

  // Links
  markdown = markdown.replace(
    /<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m: string, href: string, text: string) => `[${decodeEntities(text)}](${href})`
  );

  // Blockquotes
  markdown = markdown.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m: string, c: string) => {
    // Remove wrapping paragraphs inside blockquote
    const inner = c.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_mp: string, pc: string) => decodeEntities(pc) + '\n');
    return `\n> ${inner.trim().replace(/\n/g, '\n> ')}\n\n`;
  });

  // Lists (ordered first, then unordered)
  markdown = convertOrderedLists(markdown);
  markdown = convertUnorderedLists(markdown);

  // Paragraphs
  markdown = markdown.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_m: string, c: string) => `${decodeEntities(c)}\n\n`);

  // Highlighting: keep <mark> as raw HTML (preserve style/class/data-*)
  // If there is a background-color inline style, keep it so renderer can use it.
  // (No-op here; we just ensure mark is not stripped below.)

  // Preserve useful inline HTML tags: mark, sup, sub, u, kbd, br
  // Remove the rest of remaining HTML tags
  markdown = markdown.replace(/<(?!\/?(mark|sup|sub|u|kbd|br)\b)[^>]*>/gi, '');

  // Decode any leftover entities
  markdown = decodeEntities(markdown);

  // Clean up repeated blank lines
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  return markdown;
}

// Check if content appears to be HTML
export function isHtmlContent(content: string): boolean {
  if (!content || content.trim() === '') return false;

  const htmlPatterns = [
    /<[a-zA-Z][^>]*>/,
    /&[a-zA-Z]+;/,
    /&#\d+;/
  ];

  const tiptapPatterns = [
    /<p[^>]*>/,
    /<pre[^>]*>/,
    /<code[^>]*>/,
    /<strong[^>]*>/,
    /<em[^>]*>/,
    /<h[1-6][^>]*>/,
    /<ul[^>]*>/,
    /<ol[^>]*>/,
    /<li[^>]*>/,
    /<blockquote[^>]*>/
  ];

  return htmlPatterns.some(p => p.test(content)) || tiptapPatterns.some(p => p.test(content));
}

// Safe content converter that checks if content is HTML before converting
export function convertContentToMarkdown(content: string): string {
  if (!content || content.trim() === '') return '';

  if (!isHtmlContent(content)) {
    const codePatterns = [
      /export\s+const\s+\w+\s*=/,
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /import\s+.*from/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/,
      /return\s+/,
      /console\.log/,
      /\.js$/,
      /\.ts$/,
      /\.py$/,
      /\.java$/,
      /\.cpp$/,
      /\.css$/,
      /\.html$/,
      /\.json$/,
      /\.sql$/,
      /\.bash$/,
      /\.sh$/
    ];

    const looksLikeCode =
      codePatterns.some(p => p.test(content)) ||
      (content.includes('{') && content.includes('}')) ||
      (content.includes('(') && content.includes(')')) ||
      content.split('\n').length > 3;

    return looksLikeCode ? `\`\`\`\n${content}\n\`\`\`` : content;
  }

  return htmlToMarkdown(content);
}
