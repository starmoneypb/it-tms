"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../lib/auth';
import { Button, Card, CardBody, Avatar, Chip, Spinner } from '@heroui/react';
import {
  Heart,
  Share2,
  Edit,
  Trash2,
  Users,
  Calendar,
  Copy,
  Check,
  Eye,
  Clock,
  Calendar as CalendarIcon,
  FileX,
  Search
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { ReadOnlyMarkdownEditor } from '../../../../lib/read-only-markdown-editor';
import { formatRelativeTime } from '../../../../lib/relative-time';

// Use relative URLs for production-like environment behind reverse proxy
const API = typeof window !== 'undefined' && window.location.port === '8000'
  ? '' // Use relative URLs when accessed through port 8000 (production-like)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");


interface KnowledgeSharingDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  contributors: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    profilePicture?: string;
  }>;
  likeCount: number;
  viewCount: number;
  isLiked: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export default function KnowledgeSharingDocumentPage() {
  const t = useTranslations('knowledgeSharing');
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  
  const [document, setDocument] = useState<KnowledgeSharingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heartAnimation, setHeartAnimation] = useState(false);
  // Fetch document
  const fetchDocument = async () => {
    try {
      // Always increment view count - backend will handle deduplication
      const shouldIncrementView = true;
      
      const url = `${API}/api/v1/knowledge-sharing/${documentId}`;
      
      // Add retry mechanism for network issues
      let response: Response | undefined;
      let retries = 3;
      
      while (retries > 0) {
        try {
          response = await fetch(url, {
            credentials: 'include',
            headers: {
              'X-Increment-View': shouldIncrementView ? 'true' : 'false',
              'Content-Type': 'application/json',
            },
          });
          break; // Success, exit retry loop
        } catch (fetchError) {
          retries--;
          console.warn(`Fetch attempt failed, ${retries} retries left:`, fetchError);
          if (retries === 0) {
            throw fetchError;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!response) {
        throw new Error('Failed to get response after retries');
      }

      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        if (response.status === 404) {
          setError(t('failedToLoad'));
          return;
        }
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setDocument(result.data);
    } catch (error) {
      console.error('Error fetching document:', error);
      console.error('API URL:', API);
      console.error('Document ID:', documentId);
      if (error instanceof Error) {
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
      }
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  // Handle like/unlike
  const handleLike = async () => {
    if (!document || liking) return;

    setLiking(true);
    setHeartAnimation(true);
    
    try {
      const method = document.isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`${API}/api/v1/knowledge-sharing/${documentId}/like`, {
        method,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update like status');
      }

      // Update local state
      setDocument(prev => prev ? {
        ...prev,
        isLiked: !prev.isLiked,
        likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
      } : null);
    } catch (error) {
      console.error('Error updating like status:', error);
    } finally {
      setLiking(false);
      // Reset animation after a short delay
      setTimeout(() => setHeartAnimation(false), 600);
    }
  };

  // Handle copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!document || !confirm(t('deleteConfirm'))) {
      return;
    }

    try {
      const response = await fetch(`${API}/api/v1/knowledge-sharing/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Redirect to knowledge sharing list
      router.push('/knowledge-sharing');
    } catch (error) {
      console.error('Error deleting document:', error);
      setError(t('failedToDelete'));
    }
  };


  useEffect(() => {
    if (documentId && documentId !== 'undefined') {
      fetchDocument();
    } else {
      console.error('Invalid document ID:', documentId);
      setError('Invalid document ID');
      setLoading(false);
    }
  }, [documentId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700/50">
            <CardBody className="text-center py-16 px-8">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
                    <FileX className="w-12 h-12 text-red-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-white mb-4">
                {t('documentNotFound')}
              </h1>

              {/* Description */}
              <p className="text-white/70 text-lg mb-8 leading-relaxed">
                {t('documentNotFoundDescription')}
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="bordered"
                  size="lg"
                  startContent={<Search className="w-4 h-4" />}
                  onPress={() => router.push('/knowledge-sharing')}
                  className="font-semibold border-gray-600 text-gray-300 hover:border-gray-500"
                >
                  {t('searchPlaceholder')}
                </Button>
              </div>

              {/* Additional Help Text */}
              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <p className="text-sm text-white/50">
                  {t('noDocumentsDescription')}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight break-words hyphens-auto">
          {document.title}
        </h1>
      </div>

      <div className={`grid grid-cols-1 gap-8 ${user ? 'lg:grid-cols-4' : ''}`}>
        {/* Main Content */}
        <div className={user ? "lg:col-span-3" : ""}>
          {/* Document Content */}
          <div className="mb-8">
            <div className="knowledge-sharing-content">
              <ReadOnlyMarkdownEditor 
                content={document.content}
                className="text-white/90"
              />
            </div>
          </div>
        </div>

        {/* Sidebar - Only show when user is authenticated */}
        {user && (
          <div className="space-y-6">
          {/* Contributors */}
          {document.contributors && document.contributors.length > 0 && (
            <Card>
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">{t('contributors')}</h3>
                
                <div className="space-y-3">
                  {document.contributors.map((contributor) => (
                    <div key={contributor.id} className="flex items-center gap-3">
                      <Avatar
                        src={contributor.profilePicture ? `${API}/api/v1${contributor.profilePicture}` : undefined}
                        name={contributor.name}
                        size="sm"
                      />
                      <div>
                        <p className="text-white text-sm font-medium">{contributor.name}</p>
                        <p className="text-white/60 text-xs">{contributor.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Document Info */}
          <Card>
            <CardBody className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{t('documentTitle')}</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-white/50" />
                  <div>
                    <p className="text-white text-sm font-medium">{t('createdAt')}</p>
                    <p className="text-white/60 text-xs">
                      {formatRelativeTime(document.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white/50" />
                  <div>
                    <p className="text-white text-sm font-medium">{t('updatedAt')}</p>
                    <p className="text-white/60 text-xs">
                      {formatRelativeTime(document.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Actions */}
          <Card>
            <CardBody className="p-6">
              <div className="space-y-3">
                {/* Stats */}
                <div className="space-y-2">
                  {/* View Count */}
                  <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
                    <Eye className="w-4 h-4" />
                    <span>{document.viewCount} {t('views')}</span>
                  </div>
                  
                  {/* Like Button */}
                  <Button
                    color={document.isLiked ? "danger" : "primary"}
                    variant={document.isLiked ? "solid" : "bordered"}
                    startContent={
                      <Heart 
                        className={`w-4 h-4 transition-all duration-300 ${
                          document.isLiked ? 'fill-current text-white' : 'text-primary'
                        } ${
                          heartAnimation ? 'scale-125 animate-pulse' : ''
                        }`} 
                      />
                    }
                    onPress={handleLike}
                    isLoading={liking}
                    className={`w-full transition-all duration-300 ${
                      document.isLiked 
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg shadow-red-500/25' 
                        : 'border-primary/50 hover:border-primary hover:bg-primary/10'
                    } ${
                      heartAnimation ? 'scale-105' : ''
                    }`}
                  >
                    <span className="font-semibold">
                      {document.likeCount} {document.isLiked ? t('liked') : t('like')}
                    </span>
                  </Button>
                </div>

                {/* Share Button */}
                <Button
                  variant="ghost"
                  startContent={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  onPress={handleCopyLink}
                  className="w-full"
                >
                  {copied ? t('copied') : t('copyLink')}
                </Button>

                {/* Edit Button */}
                {document.canEdit && (
                  <Button
                    color="primary"
                    variant="ghost"
                    startContent={<Edit className="w-4 h-4" />}
                    onPress={() => router.push(`/knowledge-sharing/${documentId}/edit` as any)}
                    className="w-full"
                  >
                    {t('editDocument')}
                  </Button>
                )}

                {/* Delete Button */}
                {document.canDelete && (
                  <Button
                    color="danger"
                    variant="ghost"
                    startContent={<Trash2 className="w-4 h-4" />}
                    onPress={handleDelete}
                    className="w-full"
                  >
                    {t('deleteDocument')}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          </div>
        )}
      </div>
      
      {/* Knowledge Sharing Specific Styles */}
      <style jsx global>{`
        .knowledge-sharing-content .readonly-markdown-editor {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 2rem;
          box-shadow: 
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          position: relative;
          overflow: hidden;
        }
        
        .knowledge-sharing-content .readonly-markdown-editor::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        }
        
        .knowledge-sharing-content .readonly-markdown-editor .ProseMirror p {
          color: rgba(255, 255, 255, 0.9) !important;
          line-height: 1.7 !important;
          font-size: 1.05rem !important;
        }
        
        .knowledge-sharing-content .readonly-markdown-editor .ProseMirror li {
          color: rgba(255, 255, 255, 0.9) !important;
        }
      `}</style>
    </div>
  );
}
