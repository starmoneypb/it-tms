"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardBody, CardHeader, Input, Button, Avatar, Progress } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { AlertTriangle, Camera, User, BarChart3, TrendingUp } from "lucide-react";
import { useTranslations } from 'next-intl';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  profilePicture?: string;
}

interface PerformanceStats {
  inProgressCount: number;
  completedCount: number;
  totalSystemInProgress: number;
  totalSystemCompleted: number;
  participationRateInProgress: number;
  participationRateCompleted: number;
  effortScoreCurrentMonth: number;
  effortScorePreviousMonth: number;
  effortScoreGrowthRate: number;
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const { user, isLoading, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  // Load user profile data
  useEffect(() => {
    if (user) {
      setProfile(user);
      setValue("name", user.name);
      setValue("email", user.email);
    }
  }, [user, setValue]);

  // Load performance statistics
  useEffect(() => {
    if (user) {
      loadPerformanceStats();
    }
  }, [user]);

  const loadPerformanceStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(`${API}/api/v1/profile/performance`, {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        setPerformanceStats(result.data);
      } else {
        console.error("Failed to load performance stats");
      }
    } catch (error) {
      console.error("Error loading performance stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Clear error messages when user starts typing
  const watchedName = watch("name");
  const watchedEmail = watch("email");
  
  useEffect(() => {
    if (updateError) {
      setUpdateError(null);
    }
  }, [watchedName, watchedEmail, updateError]);

  const onSubmit = async (data: ProfileForm) => {
    setUpdateError(null);
    setUpdateSuccess(null);
    
    try {
      const response = await fetch(`${API}/api/v1/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || "Failed to update profile");
      }

      const result = await response.json();
      setProfile(result.data);
      
      // Update the auth context without page reload
      await refreshUser();
      setUpdateSuccess("Profile updated successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setUpdateSuccess(null), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setUpdateError(error instanceof Error ? error.message : "Failed to update profile");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch(`${API}/api/v1/profile/picture`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      const result = await response.json();
      setProfile(prev => prev ? { ...prev, profilePicture: result.data.profilePicture } : null);
      
      // Update the auth context without page reload
      await refreshUser();
      setUploadError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setUploadError('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-white/70">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container">
        <Card className="glass border-red-500/20">
          <CardBody className="text-center py-8">
            <div className="text-red-400 text-lg mb-2 flex items-center justify-center gap-2">
              <AlertTriangle size={20} />
              Error Loading Profile
            </div>
            <p className="text-white/70">Unable to load profile information</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">{t('title')}</h1>
        <p className="text-white/70">{t('subtitle')}</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Picture Section */}
        <Card className="glass">
          <CardHeader className="pb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Camera size={20} className="text-primary-400" />
              {t('profilePicture')}
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar
                src={profile.profilePicture ? `${API}${profile.profilePicture}` : undefined}
                name={profile.name}
                className="w-20 h-20 text-lg"
                classNames={{
                  base: "bg-gradient-to-br from-primary-400 to-primary-600",
                  name: "text-white font-semibold"
                }}
              />
              <div className="flex-1">
                <div className="text-sm text-white/70 mb-2">
                  Upload a new profile picture (JPG, PNG, GIF up to 5MB)
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-500 file:text-white hover:file:bg-primary-600 file:cursor-pointer cursor-pointer"
                />
                {isUploading && (
                  <div className="mt-2 text-sm text-blue-400">Uploading...</div>
                )}
                {uploadError && (
                  <div className="mt-2 text-sm text-red-400">{uploadError}</div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Profile Information Section */}
        <Card className="glass">
          <CardHeader className="pb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User size={20} className="text-primary-400" />
              {t('personalInfo')}
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Success/Error Messages */}
              {updateSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400 text-sm">
                  {updateSuccess}
                </div>
              )}
              {updateError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                  {updateError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('name')}
                  variant="bordered"
                  placeholder={t('enterDisplayName')}
                  {...register("name")}
                  errorMessage={errors.name?.message}
                  isInvalid={!!errors.name}
                />
                <Input
                  label={t('email')}
                  variant="bordered"
                  placeholder={t('enterEmail')}
                  {...register("email")}
                  errorMessage={errors.email?.message}
                  isInvalid={!!errors.email}
                />
              </div>

              <div className="bg-white/5 rounded-lg p-6">
                <div className="text-sm text-white/70 mb-2">{t('accountInfo')}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/50">{t('currentRole')}:</span>
                    <span className="ml-2 text-white/80">{profile.role}</span>
                  </div>
                  <div>
                    <span className="text-white/50">User ID:</span>
                    <span className="ml-2 text-white/80 font-mono text-xs">{profile.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  color="primary"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Performance Statistics Section */}
        <Card className="glass">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 size={20} className="text-primary-400" />
                {t('performanceStatistics')}
              </h2>
              <p className="text-sm text-white/70">{t('performanceSubtitle')}</p>
            </div>
          </CardHeader>
          <CardBody>
            {loadingStats ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-white/70">{t('loadingStats')}</p>
                </div>
              </div>
            ) : performanceStats ? (
              <div className="space-y-6">
                {/* Participation Rate Explanation */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-400">
                      <p className="font-medium mb-1">{t('participationExplanation')}</p>
                    </div>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* In Progress Tickets */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{t('ticketsInProgress')}</h3>
                      <div className="text-2xl font-bold text-primary-400">{performanceStats.inProgressCount}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-white/70">
                        <span>{t('yourTickets')}</span>
                        <span>{performanceStats.inProgressCount}</span>
                      </div>
                      <div className="flex justify-between text-sm text-white/70">
                        <span>{t('totalSystemTickets')}</span>
                        <span>{performanceStats.totalSystemInProgress}</span>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/80">{t('participationRateInProgress')}</span>
                          <span className="font-medium text-white">{performanceStats.participationRateInProgress.toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={performanceStats.participationRateInProgress} 
                          className="w-full"
                          color="primary"
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Completed Tickets */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{t('ticketsCompleted')}</h3>
                      <div className="text-2xl font-bold text-green-400">{performanceStats.completedCount}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-white/70">
                        <span>{t('yourTickets')}</span>
                        <span>{performanceStats.completedCount}</span>
                      </div>
                      <div className="flex justify-between text-sm text-white/70">
                        <span>{t('totalSystemTickets')}</span>
                        <span>{performanceStats.totalSystemCompleted}</span>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/80">{t('participationRateCompleted')}</span>
                          <span className="font-medium text-white">{performanceStats.participationRateCompleted.toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={performanceStats.participationRateCompleted} 
                          className="w-full"
                          color="success"
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Effort Score Growth Section */}
                <div className="bg-white/5 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={20} className="text-primary-400" />
                    <h3 className="text-lg font-semibold text-white">{t('effortScoreGrowth')}</h3>
                  </div>
                  <p className="text-sm text-white/70 mb-6">{t('effortScoreGrowthExplanation')}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Current Month */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-white/70 mb-2">{t('currentMonth')}</div>
                      <div className="text-2xl font-bold text-primary-400">{performanceStats.effortScoreCurrentMonth}</div>
                      <div className="text-xs text-white/50 mt-1">{t('effortScoreCurrentMonth')}</div>
                    </div>

                    {/* Previous Month */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-white/70 mb-2">{t('previousMonth')}</div>
                      <div className="text-2xl font-bold text-blue-400">{performanceStats.effortScorePreviousMonth}</div>
                      <div className="text-xs text-white/50 mt-1">{t('effortScorePreviousMonth')}</div>
                    </div>

                    {/* Growth Rate */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-white/70 mb-2">{t('effortScoreGrowthRate')}</div>
                      <div className={`text-2xl font-bold ${
                        performanceStats.effortScoreGrowthRate > 0 ? 'text-green-400' : 
                        performanceStats.effortScoreGrowthRate < 0 ? 'text-red-400' : 
                        'text-white/70'
                      }`}>
                        {performanceStats.effortScoreGrowthRate > 0 ? '+' : ''}{performanceStats.effortScoreGrowthRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        {performanceStats.effortScoreGrowthRate > 0 ? t('positiveGrowth') : 
                         performanceStats.effortScoreGrowthRate < 0 ? t('negativeGrowth') : 
                         t('noGrowth')}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Comparison */}
                  <div className="mt-6 bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3">{t('detailedComparison')}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">{t('previousMonth')}:</span>
                        <span className="text-white">{performanceStats.effortScorePreviousMonth} {t('points')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">{t('currentMonth')}:</span>
                        <span className="text-white">{performanceStats.effortScoreCurrentMonth} {t('points')}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2">
                        <span className="text-white/70">{t('effortScoreGrowthRate')}:</span>
                        <span className={`font-medium ${
                          performanceStats.effortScoreGrowthRate > 0 ? 'text-green-400' : 
                          performanceStats.effortScoreGrowthRate < 0 ? 'text-red-400' : 
                          'text-white'
                        }`}>
                          {performanceStats.effortScoreGrowthRate > 0 ? '+' : ''}{performanceStats.effortScoreGrowthRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-red-400 text-lg mb-2 flex items-center justify-center gap-2">
                  <AlertTriangle size={20} />
                  {t('errorLoadingStats')}
                </div>
                <p className="text-white/70">{t('errorLoadingStats')}</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
