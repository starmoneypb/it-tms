"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Button } from '@heroui/react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Code2, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Eye,
  Edit3,
  Split
} from 'lucide-react';
import { useCallback, useState } from 'react';

type ViewMode = 'edit' | 'preview' | 'split';

interface TiptapEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: string;
  className?: string;
  showPreviewToggle?: boolean;
}

export function TiptapEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Start typing...',
  label,
  minHeight = '300px',
  className = '',
  showPreviewToggle = true
}: TiptapEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-400 hover:text-primary-300 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
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
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const renderPreview = () => (
    <div 
      className="p-4 bg-white/5 rounded-lg h-full overflow-auto prose prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: value || '' }}
    />
  );

  const renderEditor = () => (
    <div className="wysiwyg-editor">
      <EditorContent editor={editor} />
    </div>
  );

  if (!editor) {
    return null;
  }

  return (
    <div className={`tiptap-editor ${className}`}>
      {label && (
        <label className="text-sm font-medium text-white/80 mb-2 block">
          {label}
        </label>
      )}
      
      {/* View Mode Toggle */}
      {showPreviewToggle && (
        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant={viewMode === 'edit' ? 'solid' : 'bordered'}
            color={viewMode === 'edit' ? 'primary' : 'default'}
            onPress={() => setViewMode('edit')}
            className="text-xs"
            startContent={<Edit3 size={14} />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'preview' ? 'solid' : 'bordered'}
            color={viewMode === 'preview' ? 'primary' : 'default'}
            onPress={() => setViewMode('preview')}
            className="text-xs"
            startContent={<Eye size={14} />}
          >
            Preview
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'split' ? 'solid' : 'bordered'}
            color={viewMode === 'split' ? 'primary' : 'default'}
            onPress={() => setViewMode('split')}
            className="text-xs"
            startContent={<Split size={14} />}
          >
            Split
          </Button>
        </div>
      )}
      
      <div className={`border rounded-lg transition-colors ${
        isFocused 
          ? 'border-primary-500 bg-white/10' 
          : 'border-white/20 bg-white/5'
      }`}>
        {/* Toolbar */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className="flex flex-wrap gap-1 p-2 border-b border-white/10 bg-white/5">
            {/* Text Formatting */}
            <Button
              size="sm"
              variant={editor.isActive('bold') ? 'solid' : 'ghost'}
              color={editor.isActive('bold') ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleBold().run()}
              className="min-w-8 h-8 p-0"
            >
              <Bold size={16} />
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('italic') ? 'solid' : 'ghost'}
              color={editor.isActive('italic') ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleItalic().run()}
              className="min-w-8 h-8 p-0"
            >
              <Italic size={16} />
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('strike') ? 'solid' : 'ghost'}
              color={editor.isActive('strike') ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleStrike().run()}
              className="min-w-8 h-8 p-0"
            >
              <Strikethrough size={16} />
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('code') ? 'solid' : 'ghost'}
              color={editor.isActive('code') ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleCode().run()}
              className="min-w-8 h-8 p-0"
            >
              <Code size={16} />
            </Button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Headings */}
            <Button
              size="sm"
              variant={editor.isActive('heading', { level: 1 }) ? 'solid' : 'ghost'}
              color={editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className="min-w-8 h-8 p-0"
            >
              <Heading1 size={16} />
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('heading', { level: 2 }) ? 'solid' : 'ghost'}
              color={editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className="min-w-8 h-8 p-0"
            >
              <Heading2 size={16} />
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('heading', { level: 3 }) ? 'solid' : 'ghost'}
              color={editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className="min-w-8 h-8 p-0"
            >
              <Heading3 size={16} />
            </Button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Lists */}
            <Button
              size="sm"
              variant={editor.isActive('bulletList') ? 'solid' : 'ghost'}
              color={editor.isActive('bulletList') ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleBulletList().run()}
              className="min-w-8 h-8 p-0"
            >
              <List size={16} />
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('orderedList') ? 'solid' : 'ghost'}
              color={editor.isActive('orderedList') ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleOrderedList().run()}
              className="min-w-8 h-8 p-0"
            >
              <ListOrdered size={16} />
            </Button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Block Elements */}
            <Button
              size="sm"
              variant={editor.isActive('blockquote') ? 'solid' : 'ghost'}
              color={editor.isActive('blockquote') ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleBlockquote().run()}
              className="min-w-8 h-8 p-0"
            >
              <Quote size={16} />
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('codeBlock') ? 'solid' : 'ghost'}
              color={editor.isActive('codeBlock') ? 'primary' : 'default'}
              onPress={() => editor.chain().focus().toggleCodeBlock().run()}
              className="min-w-8 h-8 p-0"
            >
              <Code2 size={16} />
            </Button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Media */}
            <Button
              size="sm"
              variant="ghost"
              color="default"
              onPress={addLink}
              className="min-w-8 h-8 p-0"
            >
              <LinkIcon size={16} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              color="default"
              onPress={addImage}
              className="min-w-8 h-8 p-0"
            >
              <ImageIcon size={16} />
            </Button>
          </div>
        )}

        {/* Editor Content */}
        <div style={{ minHeight }}>
          {viewMode === 'edit' && renderEditor()}
          {viewMode === 'preview' && renderPreview()}
          {viewMode === 'split' && (
            <div className="flex" style={{ minHeight }}>
              <div className="flex-1 border-r border-white/20">
                {renderEditor()}
              </div>
              <div className="flex-1">
                {renderPreview()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
