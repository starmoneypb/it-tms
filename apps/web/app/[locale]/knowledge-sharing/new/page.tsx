"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../lib/auth';
import { Button, Input, Card, CardBody } from '@heroui/react';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { KnowledgeSharingEditor } from '../../../../lib/knowledge-sharing-editor';
import UserSearchSelect from '../../../../components/UserSearchSelect';

// Use relative URLs for production-like environment behind reverse proxy
const API = typeof window !== 'undefined' && window.location.port === '8000'
  ? '' // Use relative URLs when accessed through port 8000 (production-like)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

interface Contributor {
  id: string;
  name: string;
  email: string;
  role: string;
  profilePicture?: string;
}

export default function CreateKnowledgeSharingPage() {
  const t = useTranslations('knowledgeSharing');
  const { user } = useAuth();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cleanup effect to reset loading state on unmount (safety measure)
  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, []);

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
    // Prevent multiple submissions
    if (loading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API}/api/v1/knowledge-sharing`, {
        method: 'POST',
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
        throw new Error(errorData.error?.message || t('failedToCreate'));
      }

      const result = await response.json();
      const documentId = result.data.id;

      // Add contributors if any
      if (contributors.length > 0) {
        const contributorPromises = contributors.map(async (contributor) => {
          try {
            const contributorResponse = await fetch(`${API}/api/v1/knowledge-sharing/${documentId}/contributors`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                userId: contributor.id,
              }),
            });
            if (!contributorResponse.ok) {
              console.error(`Failed to add contributor ${contributor.name}:`, await contributorResponse.text());
              throw new Error(`Failed to add contributor ${contributor.name}`);
            }
            return contributor;
          } catch (err) {
            console.error(`Error adding contributor ${contributor.name}:`, err);
            throw err;
          }
        });

        try {
          await Promise.all(contributorPromises);
        } catch (err) {
          console.error('Some contributors failed to be added:', err);
          // Continue anyway - the document was created successfully
        }
      }

      // Redirect to the created document
      router.push(`/knowledge-sharing/${documentId}` as any);
      // Don't reset loading state here - let it persist until redirect completes
    } catch (error) {
      console.error('Error creating document:', error);
      setErrors({ general: error instanceof Error ? error.message : t('failedToCreate') });
      setLoading(false); // Only reset loading state on error
    }
  };

  // Handle add contributor
  const handleAddContributor = (selectedUser: any) => {
    if (!contributors.find(c => c.id === selectedUser.id)) {
      setContributors(prev => [...prev, selectedUser]);
    }
  };

  // Handle remove contributor
  const handleRemoveContributor = (contributorId: string) => {
    setContributors(prev => prev.filter(c => c.id !== contributorId));
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-white/70 text-lg">{t('signInRequired')}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('createDocumentTitle')}</h1>
          <p className="text-white/70">{t('createDocumentSubtitle')}</p>
        </div>
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
              <h2 className="text-xl font-semibold text-white mb-4">{t('documentInformation')}</h2>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <Input
                    label={t('titleLabel')}
                    placeholder={t('enterDocumentTitle')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    isInvalid={!!errors.title}
                    errorMessage={errors.title}
                    isDisabled={loading}
                    className="w-full"
                  />
                </div>


                {/* Content */}
                <div>
                  <KnowledgeSharingEditor
                    label={t('contentLabel')}
                    value={content}
                    onChange={setContent}
                    placeholder={t('startWritingDocument')}
                    minHeight="400px"
                    showPreviewToggle={true}
                    disabled={loading}
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
                  placeholder={t('addContributor')}
                  excludeUserIds={[user.id, ...contributors.map(c => c.id)]}
                  isMultiple={false}
                  isDisabled={loading}
                />

                {/* Contributors List */}
                {contributors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-white/70 text-sm">{t('currentContributors')}</p>
                    {contributors.map((contributor) => (
                      <div
                        key={contributor.id}
                        className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                            {contributor.name.charAt(0).toUpperCase()}
                          </div>
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
                          isDisabled={loading}
                        >
                          {t('remove')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-white/60 text-sm">
                  {t('contributorsDescription')}
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
                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {t('create')}
                </Button>
                
                <Button
                  variant="ghost"
                  size="lg"
                  onPress={() => router.back()}
                  isDisabled={loading}
                  className="w-full"
                >
                  {t('cancel')}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
