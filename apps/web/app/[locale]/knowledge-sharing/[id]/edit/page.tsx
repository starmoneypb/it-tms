"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../../lib/auth';
import { Button, Input, Select, SelectItem, Card, CardBody, Avatar } from '@heroui/react';
import { Save, Users, Trash2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { KnowledgeSharingEditor } from '../../../../../lib/knowledge-sharing-editor';
import { formatRelativeTime } from '../../../../../lib/relative-time';
import UserSearchSelect from '../../../../../components/UserSearchSelect';

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
  isLiked: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface Contributor {
  id: string;
  name: string;
  email: string;
  role: string;
  profilePicture?: string;
}

export default function EditKnowledgeSharingPage() {
  const t = useTranslations('knowledgeSharing');
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  
  const [document, setDocument] = useState<KnowledgeSharingDocument | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch document
  const fetchDocument = async () => {
    try {
      const response = await fetch(`${API}/api/v1/knowledge-sharing/${documentId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/knowledge-sharing');
          return;
        }
        throw new Error('Failed to fetch document');
      }

      const result = await response.json();
      const doc = result.data;
      
      if (!doc.canEdit) {
        router.push(`/knowledge-sharing/${documentId}` as any);
        return;
      }

      setDocument(doc);
      setTitle(doc.title);
      setContent(doc.content);
      setContributors(doc.contributors || []);
    } catch (error) {
      console.error('Error fetching document:', error);
      setErrors({ general: t('failedToLoad') });
    } finally {
      setLoadingDocument(false);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t('titleRequired');
    } else if (title.length > 255) {
      newErrors.title = t('titleMaxLength');
    }

    if (!content.trim()) {
      newErrors.content = t('contentRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API}/api/v1/knowledge-sharing/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update document');
      }

      // Redirect to the document
      router.push(`/knowledge-sharing/${documentId}` as any);
    } catch (error) {
      console.error('Error updating document:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Failed to update document' });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API}/api/v1/knowledge-sharing/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete document');
      }

      // Redirect to knowledge sharing list
      router.push('/knowledge-sharing');
    } catch (error) {
      console.error('Error deleting document:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Failed to delete document' });
    } finally {
      setLoading(false);
    }
  };

  // Handle add contributor
  const handleAddContributor = async (selectedUser: any) => {
    if (contributors.find(c => c.id === selectedUser.id)) {
      return;
    }

    try {
      const response = await fetch(`${API}/api/v1/knowledge-sharing/${documentId}/contributors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: selectedUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add contributor');
      }

      setContributors(prev => [...prev, selectedUser]);
    } catch (error) {
      console.error('Error adding contributor:', error);
      setErrors({ general: 'Failed to add contributor' });
    }
  };

  // Handle remove contributor
  const handleRemoveContributor = async (contributorId: string) => {
    try {
      const response = await fetch(`${API}/api/v1/knowledge-sharing/${documentId}/contributors/${contributorId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove contributor');
      }

      setContributors(prev => prev.filter(c => c.id !== contributorId));
    } catch (error) {
      console.error('Error removing contributor:', error);
      setErrors({ general: 'Failed to remove contributor' });
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  if (loadingDocument) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-white/70 text-lg">{t('failedToLoad')}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{t('editDocument')}</h1>
        <p className="text-white/70">{t('editDocument')}</p>
      </div>

      {/* Error Message */}
      {errors.general && (
        <Card className="mb-6 border-danger-500">
          <CardBody className="p-4">
            <p className="text-danger-400">{errors.general}</p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardBody className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">{t('documentTitle')}</h2>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <Input
                    label={t('titleLabel')}
                    placeholder={t('titleLabel')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    isInvalid={!!errors.title}
                    errorMessage={errors.title}
                    className="w-full"
                  />
                </div>


                {/* Content */}
                <div>
                  <KnowledgeSharingEditor
                    label={t('contentLabel')}
                    value={content}
                    onChange={setContent}
                    placeholder={t('contentLabel')}
                    minHeight="400px"
                    showPreviewToggle={false}
                    className="w-full"
                  />
                  {errors.content && (
                    <p className="text-danger-400 text-sm mt-2">{errors.content}</p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Document Info */}
          <Card>
            <CardBody className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{t('documentInfo')}</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-white text-sm font-medium">{t('created')}</p>
                  <p className="text-white/70 text-xs">
                    {formatRelativeTime(document.createdAt)}
                  </p>
                </div>
                
                <div>
                  <p className="text-white text-sm font-medium">{t('lastUpdated')}</p>
                  <p className="text-white/70 text-xs">
                    {formatRelativeTime(document.updatedAt)}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>


          {/* Contributors */}
          <Card>
            <CardBody className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{t('contributors')}</h3>
              
              <div className="space-y-4">
                {/* Add Contributor */}
                <UserSearchSelect
                  selectedUserIds={[]}
                  onSelectionChange={() => {}} // Required but not used
                  onUserSelect={handleAddContributor}
                  placeholder="Add a contributor..."
                  excludeUserIds={[user?.id, ...contributors.map(c => c.id)].filter((id): id is string => Boolean(id))}
                  isMultiple={false}
                  allowClear={false}
                />

                {/* Contributors List */}
                {contributors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-white/70 text-sm">Current contributors:</p>
                    {contributors.map((contributor) => (
                      <div
                        key={contributor.id}
                        className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={contributor.profilePicture ? `${API}/api/v1${contributor.profilePicture}` : undefined}
                            name={contributor.name}
                            size="sm"
                          />
                          <div>
                            <p className="text-white text-sm font-medium">{contributor.name}</p>
                            <p className="text-white/50 text-xs">{contributor.role}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          color="danger"
                          onPress={() => handleRemoveContributor(contributor.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-white/60 text-sm">
                  Contributors can edit and delete this document
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Actions */}
          <Card>
            <CardBody className="p-6">
              <div className="space-y-3">
                <Button
                  size="lg"
                  startContent={<Save className="w-4 h-4" />}
                  onPress={handleSave}
                  isLoading={loading}
                  className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {t('save')}
                </Button>
                
                {document.canDelete && (
                  <Button
                    color="danger"
                    variant="ghost"
                    size="lg"
                    startContent={<Trash2 className="w-4 h-4" />}
                    onPress={handleDelete}
                    isLoading={loading}
                    className="w-full"
                  >
                    {t('deleteDocument')}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
