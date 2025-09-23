"use client";

import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Button } from '@heroui/react';

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: string;
  className?: string;
}

export function MarkdownEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Start typing...',
  label,
  minHeight = '200px',
  className = ''
}: MarkdownEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`markdown-editor ${className}`}>
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
        <div 
          data-color-mode="dark"
          style={{ minHeight }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <MDEditor
            value={value}
            onChange={(val) => onChange?.(val || '')}
            data-color-mode="dark"
            hideToolbar={false}
            visibleDragbar={false}
            height={parseInt(minHeight.replace('px', ''))}
            preview="edit"
            extraCommands={[
              // Custom commands can be added here if needed
            ]}
          />
        </div>
      </div>
    </div>
  );
}
