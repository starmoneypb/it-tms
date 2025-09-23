"use client";

import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Button } from '@heroui/react';
import { MarkdownRenderer } from './markdown-renderer';

type ViewMode = 'edit' | 'preview' | 'split';

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
  const [viewMode, setViewMode] = useState<ViewMode>('edit');

  const renderPreview = () => (
    <div className="p-4 bg-white/5 rounded-lg">
      <MarkdownRenderer content={value || ''} />
    </div>
  );

  const renderEditor = () => (
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
        hideToolbar={true}
        visibleDragbar={false}
        height={parseInt(minHeight.replace('px', ''))}
        preview="edit"
      />
    </div>
  );

  return (
    <div className={`markdown-editor ${className}`}>
      {label && (
        <label className="text-sm font-medium text-white/80 mb-2 block">
          {label}
        </label>
      )}
      
      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-3">
        <Button
          size="sm"
          variant={viewMode === 'edit' ? 'solid' : 'bordered'}
          color={viewMode === 'edit' ? 'primary' : 'default'}
          onPress={() => setViewMode('edit')}
          className="text-xs"
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'preview' ? 'solid' : 'bordered'}
          color={viewMode === 'preview' ? 'primary' : 'default'}
          onPress={() => setViewMode('preview')}
          className="text-xs"
        >
          Preview
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'split' ? 'solid' : 'bordered'}
          color={viewMode === 'split' ? 'primary' : 'default'}
          onPress={() => setViewMode('split')}
          className="text-xs"
        >
          Split
        </Button>
      </div>
      
      <div className={`border rounded-lg transition-colors ${
        isFocused 
          ? 'border-primary-500 bg-white/10' 
          : 'border-white/20 bg-white/5'
      }`}>
        {viewMode === 'edit' && renderEditor()}
        {viewMode === 'preview' && (
          <div style={{ minHeight }}>
            {renderPreview()}
          </div>
        )}
        {viewMode === 'split' && (
          <div className="grid grid-cols-2 gap-4" style={{ minHeight }}>
            <div className="border-r border-white/20">
              {renderEditor()}
            </div>
            <div className="overflow-auto">
              {renderPreview()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
