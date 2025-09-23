"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom component overrides for better styling
          h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold text-white mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-medium text-white mb-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-medium text-white mb-2">{children}</h4>,
          p: ({ children }) => <p className="text-white/80 mb-3 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-white/90">{children}</em>,
          a: ({ children, href }) => (
            <a 
              href={href} 
              className="text-primary-400 underline hover:text-primary-300 transition-colors"
              target="_blank" 
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 text-white/80">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 text-white/80">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 italic text-white/70 my-3">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-white/10 text-white/90 px-1 py-0.5 rounded text-sm font-mono border border-white/10">
                  {children}
                </code>
              );
            }
            return (
              <code className={`${className} block bg-gray-900/50 p-3 rounded-lg text-white/90 overflow-x-auto font-mono border border-white/10`}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-900/50 p-3 rounded-lg overflow-x-auto mb-3 border border-white/10">
              {children}
            </pre>
          ),
          mark: ({ children, className }) => {
            // Extract color from className if present (e.g., "highlight-yellow")
            const colorMatch = className?.match(/highlight-(\w+)/);
            const color = colorMatch ? colorMatch[1] : 'yellow';
            
            // Fallback colors for when CSS variables aren't available
            const colorMap: Record<string, { bg: string; text: string }> = {
              yellow: { bg: '#6b6524', text: '#58531e' },
              green: { bg: '#509568', text: '#47855d' },
              blue: { bg: '#6e92aa', text: '#5e86a1' },
              purple: { bg: '#583e74', text: '#4c3564' },
              red: { bg: '#743e42', text: '#643539' },
              gray: { bg: 'rgb(47, 47, 47)', text: 'rgba(255, 255, 255, 0.094)' },
              brown: { bg: 'rgb(74, 50, 40)', text: 'rgba(184, 101, 69, 0.25)' },
              orange: { bg: 'rgb(92, 59, 35)', text: 'rgba(233, 126, 37, 0.2)' },
              pink: { bg: 'rgb(78, 44, 60)', text: 'rgba(220, 76, 145, 0.22)' }
            };
            
            const fallbackColors = colorMap[color] || colorMap.yellow;
            
            return (
              <mark 
                className={`px-1 py-0.5 rounded`}
                style={{
                  backgroundColor: fallbackColors.bg,
                  color: fallbackColors.text
                }}
              >
                {children}
              </mark>
            );
          },
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
