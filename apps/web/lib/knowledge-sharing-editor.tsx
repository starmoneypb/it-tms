"use client";

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
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
  ImageIcon,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';
import { Button, Input, Progress } from '@heroui/react';

// Custom Image extension with alignment support
type ImageAttributes = {
  src?: string | null;
  alt?: string | null;
  title?: string | null;
  align?: string | null;
  width?: string | null;
};

const ImageWithAlignment = Image.extend({
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('src'),
        renderHTML: (attributes: ImageAttributes) => {
          if (!attributes.src) {
            return {};
          }
          return {
            src: attributes.src,
          };
        },
      },
      alt: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('alt'),
        renderHTML: (attributes: ImageAttributes) => {
          if (!attributes.alt) {
            return {};
          }
          return {
            alt: attributes.alt,
          };
        },
      },
      title: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('title'),
        renderHTML: (attributes: ImageAttributes) => {
          if (!attributes.title) {
            return {};
          }
          return {
            title: attributes.title,
          };
        },
      },
      align: {
        default: 'center',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes: ImageAttributes) => {
          return {
            'data-align': attributes.align || 'center',
          };
        },
      },
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('width'),
        renderHTML: (attributes: ImageAttributes) => {
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
  addCommands() {
    return {
      setImage: (options: { src: string; align?: string; width?: string }) => {
        return ({
          commands,
        }: {
          commands: {
            insertContent: (content: unknown) => boolean;
          };
        }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              align: options.align || 'center',
              width: options.width,
            },
          });
        };
      },
    };
  },
});

// Use relative URLs for production-like environment behind reverse proxy
const API = typeof window !== 'undefined' && window.location.port === '8000'
  ? '' // Use relative URLs when accessed through port 8000 (production-like)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

interface KnowledgeSharingEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: string;
  className?: string;
  showPreviewToggle?: boolean;
  disabled?: boolean;
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

const ImageUploadDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImageUploaded: (url: string, align?: string) => void;
}> = ({ isOpen, onClose, onImageUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [alignment, setAlignment] = useState<string>('center');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API}/api/v1/knowledge-sharing/upload-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      onImageUploaded(result.data.url, alignment);
      onClose();
      setFile(null);
      setAlignment('center');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          setFile(file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
    >
      <div className="bg-surface border border-white/10 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Upload Image</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Select Image
            </label>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="text-white"
            />
          </div>

          {file && (
            <div className="space-y-2">
              <p className="text-sm text-white/70">Selected: {file.name}</p>
              <p className="text-xs text-white/50">
                Size: {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Image Alignment
            </label>
            <div className="flex gap-2">
              {[
                { value: 'left', label: 'Left', icon: AlignLeft },
                { value: 'center', label: 'Center', icon: AlignCenter },
                { value: 'right', label: 'Right', icon: AlignRight },
                { value: 'inline', label: 'Inline', icon: AlignJustify },
              ].map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  size="sm"
                  variant={alignment === value ? "solid" : "ghost"}
                  color={alignment === value ? "primary" : "default"}
                  onPress={() => setAlignment(value)}
                  className="flex-1"
                  title={label}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-white/70">Uploading...</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onPress={onClose}
              isDisabled={uploading}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleUpload}
              isDisabled={!file || uploading}
              isLoading={uploading}
            >
              Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Toolbar: React.FC<{ 
  editor: any;
  onImageUpload: () => void;
  disabled?: boolean;
}> = ({ editor, onImageUpload, disabled = false }) => {
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
          disabled={disabled || !editor.can().chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* Headings */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => {
            const { from, to } = editor.state.selection;
            if (from === to) {
              // No selection, apply to current line
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            } else {
              // Has selection, wrap selected text in heading
              editor.chain().focus().setHeading({ level: 1 }).run();
            }
          }}
          isActive={editor.isActive('heading', { level: 1 })}
          disabled={disabled}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          disabled={disabled}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          disabled={disabled}
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
          disabled={disabled}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          disabled={disabled}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          disabled={disabled}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          disabled={disabled}
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
          disabled={disabled}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          disabled={disabled}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          disabled={disabled}
          title="Quote"
        >
          <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          disabled={disabled}
          title="Code Block"
        >
          <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* Text Alignment */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          disabled={disabled}
          title="Align Left"
        >
          <AlignLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          disabled={disabled}
          title="Align Center"
        >
          <AlignCenter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          disabled={disabled}
          title="Align Right"
        >
          <AlignRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          disabled={disabled}
          title="Justify"
        >
          <AlignJustify className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* Image and Links */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={onImageUpload}
          disabled={disabled}
          title="Upload Image"
        >
          <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          disabled={disabled}
          title="Add Link"
        >
          <Underline className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
          title="Horizontal Rule"
        >
          <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </ToolbarButton>
      </ToolbarGroup>
    </div>
  );
};

export const KnowledgeSharingEditor: React.FC<KnowledgeSharingEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  label,
  minHeight = '200px',
  className = '',
  showPreviewToggle = false,
  disabled = false,
}) => {
  const [showImageUpload, setShowImageUpload] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
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
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none p-4 bg-surface border border-white/10 rounded-b-lg text-white/90 prose prose-invert max-w-none',
        style: `min-height: ${minHeight}`,
        placeholder: placeholder,
      },
    },
  });

  // Handle image upload
  const handleImageUpload = useCallback((url: string, align?: string) => {
    if (editor) {
      editor.chain().focus().insertContent({
        type: 'image',
        attrs: {
          src: url,
          align: align || 'center',
        },
      }).run();
    }
  }, [editor]);

  // Handle paste events for images
  useEffect(() => {
    if (!editor) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            // Upload the pasted image
            const formData = new FormData();
            formData.append('image', file);

            fetch(`${API}/api/v1/knowledge-sharing/upload-image`, {
              method: 'POST',
              body: formData,
              credentials: 'include',
            })
            .then(response => response.json())
            .then(result => {
              if (result.data?.url) {
                editor.chain().focus().insertContent({
                  type: 'image',
                  attrs: {
                    src: result.data.url,
                    align: 'center',
                  },
                }).run();
              }
            })
            .catch(error => {
              console.error('Failed to upload pasted image:', error);
            });

            event.preventDefault();
            break;
          }
        }
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('paste', handlePaste);

    return () => {
      editorElement.removeEventListener('paste', handlePaste);
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
    <div className={`knowledge-sharing-editor ${className}`}>
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

        .ProseMirror img {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 0.5rem !important;
          margin: 1rem 0 !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }

        .ProseMirror img[data-align="left"] {
          float: left !important;
          margin: 0 1rem 1rem 0 !important;
          max-width: 50% !important;
        }

        .ProseMirror img[data-align="right"] {
          float: right !important;
          margin: 0 0 1rem 1rem !important;
          max-width: 50% !important;
        }

        .ProseMirror img[data-align="center"] {
          display: block !important;
          margin: 1rem auto !important;
        }

        .ProseMirror img[data-align="inline"] {
          display: inline-block !important;
          margin: 0 0.5rem !important;
          vertical-align: middle !important;
          max-width: 200px !important;
        }

        .ProseMirror h1 {
          font-size: 2rem !important;
          font-weight: 700 !important;
          color: #ffffff !important;
          margin: 1.5rem 0 1rem 0 !important;
          line-height: 1.2 !important;
        }

        .ProseMirror h2 {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: #ffffff !important;
          margin: 1.25rem 0 0.75rem 0 !important;
          line-height: 1.3 !important;
        }

        .ProseMirror h3 {
          font-size: 1.25rem !important;
          font-weight: 600 !important;
          color: #ffffff !important;
          margin: 1rem 0 0.5rem 0 !important;
          line-height: 1.4 !important;
        }

        .ProseMirror h4 {
          font-size: 1.125rem !important;
          font-weight: 600 !important;
          color: #ffffff !important;
          margin: 0.875rem 0 0.5rem 0 !important;
          line-height: 1.4 !important;
        }

        .ProseMirror h5 {
          font-size: 1rem !important;
          font-weight: 600 !important;
          color: #ffffff !important;
          margin: 0.75rem 0 0.5rem 0 !important;
          line-height: 1.4 !important;
        }

        .ProseMirror h6 {
          font-size: 0.875rem !important;
          font-weight: 600 !important;
          color: #ffffff !important;
          margin: 0.75rem 0 0.5rem 0 !important;
          line-height: 1.4 !important;
        }
      `}</style>
      
      {label && (
        <label className="text-sm font-medium text-white/90 mb-3 block">
          {label}
        </label>
      )}
      
      <div className="border border-white/10 rounded-lg overflow-hidden shadow-lg backdrop-blur-sm">
        <Toolbar 
          editor={editor} 
          onImageUpload={() => setShowImageUpload(true)}
          disabled={disabled}
        />
        
        
        <EditorContent 
          editor={editor} 
          className="focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-opacity-50 transition-all duration-200"
        />
      </div>

      <ImageUploadDialog
        isOpen={showImageUpload}
        onClose={() => setShowImageUpload(false)}
        onImageUploaded={handleImageUpload}
      />
    </div>
  );
};
