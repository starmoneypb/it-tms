"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardBody, CardHeader, Input, Button, Avatar } from "@heroui/react";
import { useAuth } from "../../lib/auth";

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

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
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

  const onSubmit = async (data: ProfileForm) => {
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
        throw new Error("Failed to update profile");
      }

      const result = await response.json();
      setProfile(result.data);
      
      // Update the auth context
      window.location.reload(); // Simple refresh to update auth state
    } catch (error) {
      console.error("Error updating profile:", error);
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
      
      // Update the auth context
      window.location.reload(); // Simple refresh to update auth state
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
            <div className="text-red-400 text-lg mb-2">⚠️ Error Loading Profile</div>
            <p className="text-white/70">Unable to load profile information</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Profile Settings</h1>
        <p className="text-white/70">Manage your account information and preferences</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Picture Section */}
        <Card className="glass">
          <CardHeader className="pb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📸 Profile Picture
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar
                src={profile.profilePicture}
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
              👤 Profile Information
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Display Name"
                  variant="bordered"
                  placeholder="Enter your display name"
                  {...register("name")}
                  errorMessage={errors.name?.message}
                  isInvalid={!!errors.name}
                />
                <Input
                  label="Email Address"
                  variant="bordered"
                  placeholder="Enter your email"
                  {...register("email")}
                  errorMessage={errors.email?.message}
                  isInvalid={!!errors.email}
                />
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-2">Account Information</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/50">Role:</span>
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
      </div>
    </div>
  );
}
