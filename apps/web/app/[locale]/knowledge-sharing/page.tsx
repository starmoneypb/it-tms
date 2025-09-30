"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../lib/auth';
import { Button, Input, Select, SelectItem, Card, CardBody, Avatar, Chip, Spinner } from '@heroui/react';
import { Search, Plus, Heart, Users, Calendar, Filter, Eye, Clock, Calendar as CalendarIcon, FileText, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReadOnlyMarkdownEditor } from '../../../lib/read-only-markdown-editor';
import UserSearchSelect from '../../../components/UserSearchSelect';
import { formatRelativeTime } from '../../../lib/relative-time';

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

export default function KnowledgeSharingPage() {
  const t = useTranslations('knowledgeSharing');
  const { user } = useAuth();
  const router = useRouter();
  
  const [documents, setDocuments] = useState<KnowledgeSharingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContributor, setSelectedContributor] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popular');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch documents
  const fetchDocuments = async (reset = false) => {
    if (reset) {
      setPage(1);
      setDocuments([]);
    }

    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: reset ? '0' : ((page - 1) * 20).toString(),
      });

      if (searchQuery) params.append('q', searchQuery);
      if (selectedContributor.length > 0) params.append('contributorId', selectedContributor[0]);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await fetch(`${API}/api/v1/knowledge-sharing?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const result = await response.json();
      const newDocuments = result.data || [];

      if (reset) {
        setDocuments(newDocuments);
      } else {
        setDocuments(prev => [...prev, ...newDocuments]);
      }

      setHasMore(newDocuments.length === 20);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };


  // Handle like/unlike
  const handleLike = async (documentId: string, isLiked: boolean) => {
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`${API}/api/v1/knowledge-sharing/${documentId}/like`, {
        method,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update like status');
      }

      // Update local state
      setDocuments(prev => prev.map(doc => {
        if (doc.id === documentId) {
          return {
            ...doc,
            isLiked: !isLiked,
            likeCount: isLiked ? doc.likeCount - 1 : doc.likeCount + 1,
          };
        }
        return doc;
      }));
    } catch (error) {
      console.error('Error updating like status:', error);
    }
  };



  // Load more
  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  // Handle delete document
  const handleDelete = async (documentId: string) => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }

    setDeleting(documentId);
    try {
      const response = await fetch(`${API}/api/v1/knowledge-sharing/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Remove the document from the local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(t('failedToDelete'));
    } finally {
      setDeleting(null);
    }
  };



  // Debounced search for all filters - resets to page 1
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDocuments(true);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedContributor, sortBy]);

  useEffect(() => {
    fetchDocuments(true);
  }, []);

  useEffect(() => {
    if (page > 1) {
      fetchDocuments(false);
    }
  }, [page]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">{t('title')}</h1>
          <p className="text-white/70">{t('subtitle')}</p>
        </div>
        {user && (
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => router.push('/knowledge-sharing/new' as any)}
          >
{t('createDocument')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardBody className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search */}
            <Input
              label={t('searchPlaceholder')}
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onValueChange={setSearchQuery}
              variant="bordered"
            />

            {/* Contributor Filter */}
            <UserSearchSelect
              selectedUserIds={selectedContributor}
              onSelectionChange={setSelectedContributor}
              placeholder={t('allContributors')}
              label={t('contributor')}
              variant="bordered"
              isMultiple={false}
              allowClear={true}
              clearOptionText="Any contributor"
            />

            {/* Sort Filter */}
            <Select
              label={t('sortBy')}
              placeholder={t('sortBy')}
              selectedKeys={sortBy ? [sortBy] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setSortBy(value || 'popular');
              }}
              variant="bordered"
            >
              <SelectItem key="newest">{t('newestFirst')}</SelectItem>
              <SelectItem key="oldest">{t('oldestFirst')}</SelectItem>
              <SelectItem key="popular">{t('mostPopular')}</SelectItem>
              <SelectItem key="likes">{t('mostLiked')}</SelectItem>
              <SelectItem key="views">{t('mostViewed')}</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Documents List */}
      {loading && documents.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="glass">
          <CardBody className="text-center py-20">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center border border-primary-500/30">
                <FileText size={32} className="text-primary-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 gradient-text">{t('noDocuments')}</h3>
              <p className="text-white/70 text-lg max-w-md mx-auto leading-relaxed">
                {searchQuery || selectedContributor.length > 0
                  ? t('noDocumentsDescription')
                  : t('noDocumentsDescription')
                }
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <a 
                href={`/knowledge-sharing/new`}
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/25 border border-primary-400/20 min-w-[200px]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Plus size={20} className="mr-2 transition-transform duration-300 group-hover:rotate-90" />
                {t('createDocument')}
              </a>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:bg-white/5 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/5 border-white/10 hover:border-white/20">
              <CardBody className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link 
                      href={`/knowledge-sharing/${doc.id}` as any}
                      className="text-xl font-semibold text-white hover:text-primary-400 transition-colors"
                    >
                      {doc.title}
                    </Link>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-white/50 text-sm">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>{formatRelativeTime(doc.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white/50 text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatRelativeTime(doc.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contributors */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1 overflow-hidden">
                      {/* Show contributors */}
                      {doc.contributors && doc.contributors.length > 0 && doc.contributors.slice(0, 4).map((contributor: any, index: number) => (
                        <div
                          key={contributor.id}
                          className="relative w-6 h-6 rounded-full border-2 border-gray-800 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium overflow-hidden"
                          style={{ zIndex: 10 - index }}
                          title={contributor.name}
                        >
                          {contributor.profilePicture ? (
                            <img
                              src={`${API}/api/v1${contributor.profilePicture}`}
                              alt={contributor.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            contributor.name.charAt(0).toUpperCase()
                          )}
                        </div>
                      ))}
                      {/* Show +N indicator if there are more contributors than displayed */}
                      {doc.contributors && doc.contributors.length > 4 && (
                        <div className="relative w-6 h-6 rounded-full border-2 border-gray-800 bg-gray-600 flex items-center justify-center text-white text-xs font-medium">
                          +{doc.contributors.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-white/70 ml-1">
                      {doc.contributors ? doc.contributors.length : 0} contributor{doc.contributors && doc.contributors.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Content Preview - Full Width */}
                <div className="h-[120px] bg-white/5 rounded-lg p-4 overflow-hidden relative mb-4">
                  <div className="text-sm text-white/80 leading-5 h-full overflow-hidden">
                    <ReadOnlyMarkdownEditor 
                      content={doc.content}
                      className="text-sm text-white/80"
                    />
                  </div>
                </div>

                {/* Actions - Bottom Row */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    {/* View Count */}
                    <div className="flex items-center gap-1.5 text-white/60 text-sm bg-white/5 px-2.5 py-1.5 rounded-full">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="font-medium">{doc.viewCount}</span>
                    </div>
                    
                    {/* Like Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      startContent={<Heart className={`w-3.5 h-3.5 ${doc.isLiked ? 'fill-red-500 text-red-500' : 'text-white/60'}`} />}
                      onPress={() => handleLike(doc.id, doc.isLiked)}
                      className={`px-2.5 py-1.5 rounded-full transition-all duration-200 ${
                        doc.isLiked 
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                      }`}
                    >
                      <span className="font-medium">{doc.likeCount}</span>
                    </Button>
                  </div>

                  {/* Edit/Delete Actions */}
                  {(doc.canEdit || doc.canDelete) && (
                    <div className="flex gap-2">
                      {doc.canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => router.push(`/knowledge-sharing/${doc.id}/edit` as any)}
                          className="px-3 py-1.5 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 hover:text-primary-300 rounded-full transition-all duration-200"
                        >
                          {t('edit')}
                        </Button>
                      )}
                      {doc.canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          color="danger"
                          onPress={() => handleDelete(doc.id)}
                          isLoading={deleting === doc.id}
                          className="px-3 py-1.5 bg-danger-500/10 text-danger-400 hover:bg-danger-500/20 hover:text-danger-300 rounded-full transition-all duration-200"
                        >
                          {t('delete')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center py-8">
              <Button
                variant="ghost"
                onPress={loadMore}
                isLoading={loading}
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
