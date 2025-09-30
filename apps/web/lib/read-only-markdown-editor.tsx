"use client";

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';

// Custom Image extension with alignment support (same as in knowledge-sharing-editor)
const ImageWithAlignment = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || 'center',
        renderHTML: attributes => {
          return {
            'data-align': attributes.align || 'center',
          };
        },
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
          };
        },
      },
    };
  },
});

interface ReadOnlyMarkdownEditorProps {
  content: string;
  className?: string;
  minHeight?: string;
}

export const ReadOnlyMarkdownEditor: React.FC<ReadOnlyMarkdownEditorProps> = ({
  content,
  className = '',
  minHeight = 'auto',
}) => {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false, // Make it read-only
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block',
          },
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      ImageWithAlignment.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'readonly-editor-content',
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Update editor content when content prop changes
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`readonly-markdown-editor ${className}`}>
      <style jsx global>{`
        .readonly-markdown-editor .ProseMirror {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
          box-shadow: none !important;
          outline: none !important;
          cursor: default !important;
        }
        
        .readonly-markdown-editor .ProseMirror:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        
        .readonly-markdown-editor .ProseMirror pre {
          background: #1e1e1e !important;
          color: #d4d4d4 !important;
          border: 1px solid #3e3e3e;
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0.5rem 0;
        }
        
        .readonly-markdown-editor .ProseMirror pre code {
          background: transparent !important;
          color: inherit !important;
          padding: 0 !important;
          border: none !important;
          border-radius: 0 !important;
        }
        
        .readonly-markdown-editor .ProseMirror code:not(pre code) {
          background: rgba(255, 255, 255, 0.1) !important;
          color: #f8f8f2 !important;
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace !important;
          font-size: 0.875em !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        
        .readonly-markdown-editor .ProseMirror blockquote {
          border-left: 4px solid #3b82f6 !important;
          padding-left: 1rem !important;
          margin: 1rem 0 !important;
          font-style: italic !important;
          color: rgba(255, 255, 255, 0.7) !important;
          background: rgba(59, 130, 246, 0.05) !important;
          padding: 0.75rem 1rem !important;
          border-radius: 0.25rem !important;
        }
        
        .readonly-markdown-editor .ProseMirror ul, .readonly-markdown-editor .ProseMirror ol {
          padding-left: 1.5rem !important;
          margin: 0.75rem 0 !important;
        }
        
        .readonly-markdown-editor .ProseMirror ul {
          list-style-type: disc !important;
        }
        
        .readonly-markdown-editor .ProseMirror ol {
          list-style-type: decimal !important;
        }
        
        .readonly-markdown-editor .ProseMirror li {
          margin: 0.25rem 0 !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }
        
        .readonly-markdown-editor .ProseMirror h1 {
          font-size: 1.875rem !important;
          font-weight: bold !important;
          color: white !important;
          margin: 1rem 0 !important;
          line-height: 1.2 !important;
        }
        
        .readonly-markdown-editor .ProseMirror h2 {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: white !important;
          margin: 0.75rem 0 !important;
          line-height: 1.2 !important;
        }
        
        .readonly-markdown-editor .ProseMirror h3 {
          font-size: 1.25rem !important;
          font-weight: 500 !important;
          color: white !important;
          margin: 0.5rem 0 !important;
          line-height: 1.2 !important;
        }
        
        .readonly-markdown-editor .ProseMirror h4 {
          font-size: 1.125rem !important;
          font-weight: 500 !important;
          color: white !important;
          margin: 0.5rem 0 !important;
          line-height: 1.2 !important;
        }
        
        .readonly-markdown-editor .ProseMirror p {
          color: rgba(255, 255, 255, 0.8) !important;
          margin: 0.75rem 0 !important;
          line-height: 1.6 !important;
        }
        
        .readonly-markdown-editor .ProseMirror strong {
          font-weight: bold !important;
          color: white !important;
        }
        
        .readonly-markdown-editor .ProseMirror em {
          font-style: italic !important;
          color: rgba(255, 255, 255, 0.9) !important;
        }
        
        .readonly-markdown-editor .ProseMirror a {
          color: #3b82f6 !important;
          text-decoration: underline !important;
          transition: color 0.2s !important;
        }
        
        .readonly-markdown-editor .ProseMirror a:hover {
          color: #60a5fa !important;
        }
        
        .readonly-markdown-editor .ProseMirror s {
          text-decoration: line-through !important;
          color: rgba(255, 255, 255, 0.6) !important;
        }
        
        .readonly-markdown-editor .ProseMirror hr {
          border: none !important;
          border-top: 2px solid rgba(255, 255, 255, 0.1) !important;
          margin: 2rem 0 !important;
        }
        
        .readonly-markdown-editor .ProseMirror img {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 0.375rem !important;
          margin: 0.75rem 0 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .readonly-markdown-editor .ProseMirror img[data-align="left"] {
          float: left !important;
          margin: 0 1rem 1rem 0 !important;
          max-width: 50% !important;
        }

        .readonly-markdown-editor .ProseMirror img[data-align="right"] {
          float: right !important;
          margin: 0 0 1rem 1rem !important;
          max-width: 50% !important;
        }

        .readonly-markdown-editor .ProseMirror img[data-align="center"] {
          display: block !important;
          margin: 1rem auto !important;
        }

        .readonly-markdown-editor .ProseMirror img[data-align="inline"] {
          display: inline-block !important;
          margin: 0 0.5rem !important;
          vertical-align: middle !important;
          max-width: 200px !important;
        }
        
        .readonly-markdown-editor .ProseMirror table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 0.75rem 0 !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
        
        .readonly-markdown-editor .ProseMirror th {
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          padding: 0.75rem !important;
          background: rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          font-weight: 600 !important;
          text-align: left !important;
        }
        
        .readonly-markdown-editor .ProseMirror td {
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          padding: 0.75rem !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }
        
        .readonly-markdown-editor .ProseMirror [style*="text-align: center"] {
          text-align: center !important;
        }
        
        .readonly-markdown-editor .ProseMirror [style*="text-align: right"] {
          text-align: right !important;
        }
        
        .readonly-markdown-editor .ProseMirror [style*="text-align: justify"] {
          text-align: justify !important;
        }
        
        .readonly-markdown-editor .ProseMirror mark {
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
        }
        
        .readonly-markdown-editor .ProseMirror sup {
          vertical-align: super !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }
        
        .readonly-markdown-editor .ProseMirror sub {
          vertical-align: sub !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }
        
        .readonly-markdown-editor .ProseMirror u {
          text-decoration: underline !important;
          text-decoration-color: rgba(255, 255, 255, 0.6) !important;
        }
        
        .readonly-markdown-editor .ProseMirror kbd {
          padding: 0.375rem 0.5rem !important;
          border-radius: 0.25rem !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          background: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.9) !important;
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace !important;
          font-size: 0.85em !important;
        }
      `}</style>
      
      <EditorContent 
        editor={editor} 
        className="readonly-editor-wrapper"
      />
    </div>
  );
};
