"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import type { LanguageFn } from 'highlight.js';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import markdown from 'highlight.js/lib/languages/markdown';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code, 
  Code2,
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Minus, 
  Undo, 
  Redo,
  Eye,
  Edit3,
} from 'lucide-react';
import { Button } from '@heroui/react';

const languages: Record<string, LanguageFn> = {
  javascript,
  typescript,
  python,
  java,
  cpp,
  css,
  xml,
  json,
  sql,
  bash,
  markdown,
};

Object.entries(languages).forEach(([name, language]) => {
  if (!hljs.listLanguages().includes(name)) {
    hljs.registerLanguage(name, language);
  }
});

interface TiptapEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: string;
  className?: string;
  showPreviewToggle?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  onClick, 
  isActive = false, 
  disabled = false, 
  children, 
  title 
}) => (
  <Button
    size="sm"
    variant={isActive ? "solid" : "ghost"}
    color={isActive ? "primary" : "default"}
    isDisabled={disabled}
    onPress={onClick}
    className={`
      min-w-7 h-7 sm:min-w-8 sm:h-8 p-1 transition-all duration-200
      ${isActive 
        ? 'bg-primary-500 text-white shadow-md' 
        : 'text-white/70 hover:text-white hover:bg-white/10 border-0'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    title={title}
  >
    {children}
  </Button>
);

const ToolbarSeparator = () => (
  <div className="w-px h-6 bg-white/20 mx-1" />
);

const ToolbarGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-0.5 sm:gap-1">
    {children}
  </div>
);

const Toolbar: React.FC<{ editor: any }> = ({ editor }) => {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-surface-elevated border border-white/10 rounded-t-lg flex-wrap backdrop-blur-sm overflow-x-auto">
      {/* History */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* Headings */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* Text Formatting */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code"
        >
          <Code className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* Lists and Blocks */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      {/* Other */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <Underline className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
      </ToolbarGroup>
    </div>
  );
};

const PreviewContent: React.FC<{ content: string }> = ({ content }) => (
  <div 
    className="prose prose-invert max-w-none p-4 bg-surface border border-white/10 rounded-b-lg"
    dangerouslySetInnerHTML={{ __html: content }}
  />
);

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  label,
  minHeight = '200px',
  className = '',
  showPreviewToggle = false,
}) => {
  const [isPreview, setIsPreview] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: {
            class: 'hljs',
          },
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none p-4 bg-surface border border-white/10 rounded-b-lg text-white/90',
        style: `min-height: ${minHeight}`,
        placeholder: placeholder,
      },
    },
  });

  // Apply syntax highlighting to code blocks
  useEffect(() => {
    if (!editor) {
      return;
    }

    const applyHighlighting = () => {
      if (typeof window === 'undefined') {
        return;
      }

      const codeBlocks = document.querySelectorAll('.ProseMirror pre code');
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    };

    editor.on('update', applyHighlighting);
    editor.on('create', applyHighlighting);

    // Run once when the editor is ready
    applyHighlighting();

    return () => {
      editor.off('update', applyHighlighting);
      editor.off('create', applyHighlighting);
    };
  }, [editor]);

  // Update editor content when value prop changes
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`tiptap-editor ${className}`}>
      <style jsx global>{`
        .ProseMirror pre {
          background: #1e1e1e !important;
          color: #d4d4d4 !important;
          border: 1px solid #3e3e3e;
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        
        .ProseMirror pre code {
          background: transparent !important;
          color: inherit !important;
          padding: 0 !important;
          border: none !important;
          border-radius: 0 !important;
        }
        
        .ProseMirror code:not(pre code) {
          background: rgba(255, 255, 255, 0.1) !important;
          color: #f8f8f2 !important;
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace !important;
          font-size: 0.875em !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        
        .ProseMirror blockquote {
          border-left: 4px solid #3b82f6 !important;
          padding-left: 1rem !important;
          margin: 1rem 0 !important;
          font-style: italic !important;
          color: rgba(255, 255, 255, 0.7) !important;
          background: rgba(59, 130, 246, 0.05) !important;
          padding: 0.75rem 1rem !important;
          border-radius: 0.25rem !important;
        }
        
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem !important;
          margin: 0.75rem 0 !important;
        }
        
        .ProseMirror ul {
          list-style-type: disc !important;
        }
        
        .ProseMirror ol {
          list-style-type: decimal !important;
        }
        
        .ProseMirror li {
          margin: 0.25rem 0 !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }
        
        .ProseMirror s {
          text-decoration: line-through !important;
          color: rgba(255, 255, 255, 0.6) !important;
        }
        
        .ProseMirror [style*="text-align: center"] {
          text-align: center !important;
        }
        
        .ProseMirror [style*="text-align: right"] {
          text-align: right !important;
        }
        
        .ProseMirror [style*="text-align: justify"] {
          text-align: justify !important;
        }
      `}</style>
      
      {label && (
        <label className="text-sm font-medium text-white/90 mb-3 block">
          {label}
        </label>
      )}
      
      <div className="border border-white/10 rounded-lg overflow-hidden shadow-lg backdrop-blur-sm">
        <Toolbar editor={editor} />
        
        {showPreviewToggle && (
          <div className="flex items-center justify-between p-2 bg-surface-elevated border-t border-white/10">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={!isPreview ? "solid" : "ghost"}
                color={!isPreview ? "primary" : "default"}
                onPress={() => setIsPreview(false)}
                className="h-7 px-3"
              >
                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant={isPreview ? "solid" : "ghost"}
                color={isPreview ? "primary" : "default"}
                onPress={() => setIsPreview(true)}
                className="h-7 px-3"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                Preview
              </Button>
            </div>
          </div>
        )}
        
        {isPreview ? (
          <PreviewContent content={editor.getHTML()} />
        ) : (
          <EditorContent 
            editor={editor} 
            className="focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-opacity-50 transition-all duration-200"
          />
        )}
      </div>
    </div>
  );
};
