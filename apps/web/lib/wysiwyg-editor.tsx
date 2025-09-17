"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@heroui/react';
import { useState } from 'react';

interface WysiwygEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: string;
  className?: string;
}

export function WysiwygEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Start typing...',
  label,
  minHeight = '200px',
  className = ''
}: WysiwygEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    immediatelyRender: false, 
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
    },
  });

  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();

  if (!editor) {
    return null;
  }

  return (
    <div className={`wysiwyg-editor ${className}`}>
      {label && (
        <label className="text-sm font-medium text-white/80 mb-2 block">
          {label}
        </label>
      )}
      
      <div className={`border rounded-lg transition-colors ${
        isFocused 
          ? 'border-primary-500 bg-white/10' 
          : 'border-white/20 bg-white/5'
      }`}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-white/10">
          <Button
            size="sm"
            variant={editor.isActive('bold') ? 'solid' : 'ghost'}
            color={editor.isActive('bold') ? 'primary' : 'default'}
            onPress={toggleBold}
            className="min-w-8 h-8 p-0"
          >
            <strong>B</strong>
          </Button>
          <Button
            size="sm"
            variant={editor.isActive('italic') ? 'solid' : 'ghost'}
            color={editor.isActive('italic') ? 'primary' : 'default'}
            onPress={toggleItalic}
            className="min-w-8 h-8 p-0"
          >
            <em>I</em>
          </Button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <Button
            size="sm"
            variant={editor.isActive('bulletList') ? 'solid' : 'ghost'}
            color={editor.isActive('bulletList') ? 'primary' : 'default'}
            onPress={toggleBulletList}
            className="min-w-8 h-8 p-0"
          >
            •
          </Button>
          <Button
            size="sm"
            variant={editor.isActive('orderedList') ? 'solid' : 'ghost'}
            color={editor.isActive('orderedList') ? 'primary' : 'default'}
            onPress={toggleOrderedList}
            className="min-w-8 h-8 p-0"
          >
            1.
          </Button>
        </div>
        
        {/* Editor Content */}
        <div 
          className="p-3 text-white/90"
          style={{ minHeight }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
