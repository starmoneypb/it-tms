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
    
    // Code
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n')
    
    // Blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
      const cleanContent = content.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n');
      return `> ${cleanContent.trim()}\n\n`;
    })
    
    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
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
  
  return htmlPatterns.some(pattern => pattern.test(content));
}

// Safe content converter that checks if content is HTML before converting
export function convertContentToMarkdown(content: string): string {
  if (!content || content.trim() === '') return '';
  
  // If it's already Markdown-like (no HTML tags), return as-is
  if (!isHtmlContent(content)) {
    return content;
  }
  
  // Convert HTML to Markdown
  return htmlToMarkdown(content);
}
