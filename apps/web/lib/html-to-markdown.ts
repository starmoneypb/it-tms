// Simple HTML to Markdown converter for basic content
// This is a basic implementation - for production use, consider using turndown or similar library

export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '') return '';
  
  let markdown = html;
  
  // Remove DOMPurify wrapper if present
  markdown = markdown.replace(/^<div[^>]*>|<\/div>$/g, '');
  
  // Convert basic HTML tags to Markdown
  markdown = markdown
    // Bold
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    
    // Italic
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    
    // Strikethrough
    .replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
    .replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~')
    
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    
    // Paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    
    // Lists
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    
    // Links
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    
    // Code blocks (handle multi-line code properly)
    .replace(/<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>(.*?)<\/code><\/pre>/gis, (match, language, content) => {
      // Clean up the content and preserve line breaks
      const cleanContent = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return `\`\`\`${language}\n${cleanContent}\n\`\`\`\n\n`;
    })
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, (match, content) => {
      // Clean up the content and preserve line breaks
      const cleanContent = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return `\`\`\`\n${cleanContent}\n\`\`\`\n\n`;
    })
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, (match, content) => {
      // Clean up the content and preserve line breaks
      const cleanContent = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return `\`\`\`\n${cleanContent}\n\`\`\`\n\n`;
    })
    // Inline code (do this after code blocks to avoid conflicts)
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    
    // Highlighting - preserve mark tags with their color information
    .replace(/<mark[^>]*data-color="([^"]*)"[^>]*style="[^"]*background-color:\s*([^;]*);[^"]*"[^>]*>(.*?)<\/mark>/gi, (match, dataColor, bgColor, content) => {
      // Extract color name from CSS variable or use the actual color
      const colorMatch = bgColor.match(/var\(--tt-color-highlight-(\w+)\)/) || bgColor.match(/#([0-9a-fA-F]{6})/);
      const color = colorMatch ? colorMatch[1] : 'yellow';
      return `<mark class="highlight-${color}">${content}</mark>`;
    })
    .replace(/<mark[^>]*class="highlight-(\w+)"[^>]*>(.*?)<\/mark>/gi, '<mark class="highlight-$1">$2</mark>')
    .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '<mark class="highlight-yellow">$1</mark>')
    
    // Blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
      const cleanContent = content.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n');
      return `> ${cleanContent.trim()}\n\n`;
    })
    
    // Remove remaining HTML tags (but preserve mark tags)
    .replace(/<(?!\/?mark\b)[^>]*>/g, '')
    
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return markdown;
}

// Check if content appears to be HTML
export function isHtmlContent(content: string): boolean {
  if (!content || content.trim() === '') return false;
  
  // Check for common HTML patterns
  const htmlPatterns = [
    /<[a-zA-Z][^>]*>/,
    /&[a-zA-Z]+;/,
    /&#\d+;/
  ];
  
  // Also check for TiptapEditor specific patterns
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
  
  return htmlPatterns.some(pattern => pattern.test(content)) || 
         tiptapPatterns.some(pattern => pattern.test(content));
}

// Safe content converter that checks if content is HTML before converting
export function convertContentToMarkdown(content: string): string {
  if (!content || content.trim() === '') return '';
  
  // If it's already Markdown-like (no HTML tags), check if it looks like code
  if (!isHtmlContent(content)) {
    // Check if content looks like code (contains common code patterns)
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
    
    const looksLikeCode = codePatterns.some(pattern => pattern.test(content)) ||
                         content.includes('{') && content.includes('}') ||
                         content.includes('(') && content.includes(')') ||
                         content.split('\n').length > 3;
    
    if (looksLikeCode) {
      // Wrap in code block
      return `\`\`\`\n${content}\n\`\`\``;
    }
    
    return content;
  }
  
  // Convert HTML to Markdown
  return htmlToMarkdown(content);
}
