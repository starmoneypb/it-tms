"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from 'next-intl';
import { Suspense, useState } from 'react';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type Form = z.infer<typeof schema>;
// Use current hostname with port 8000 for production-like environment
const API = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

function SignInForm() {
  const t = useTranslations('auth');
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Form>({ resolver: zodResolver(schema) });
  const searchParams = useSearchParams();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  async function onSubmit(values: Form) {
    const res = await fetch(`${API}/api/v1/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      setError("password", { message: t('invalidCredentials') });
      return;
    }
    
    // Redirect to the originally requested page or default to dashboard
    const redirectTo = searchParams.get('redirect') || '/dashboard';
    window.location.href = redirectTo;
  }

  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">{t('welcomeBack')}</h1>
          <p className="text-white/70">{t('signInToAccount')}</p>
        </div>
        
        <Card className="glass">
          <CardHeader className="text-center pb-2">
            <h2 className="text-xl font-semibold">{t('signIn')}</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input 
                label={t('email')} 
                variant="bordered" 
                type="email"
                placeholder={t('enterEmail')}
                {...register("email")} 
                isInvalid={!!errors.email} 
                errorMessage={errors.email?.message}
              />
              <Input 
                label={t('password')} 
                type={isPasswordVisible ? "text" : "password"}
                variant="bordered"
                placeholder={t('enterPassword')}
                {...register("password")} 
                isInvalid={!!errors.password} 
                errorMessage={errors.password?.message}
                endContent={
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="focus:outline-none"
                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  >
                    {isPasswordVisible ? (
                      <EyeOff className="text-2xl text-default-400 pointer-events-none" />
                    ) : (
                      <Eye className="text-2xl text-default-400 pointer-events-none" />
                    )}
                  </button>
                }
              />
              <Button 
                type="submit" 
                color="primary" 
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-semibold"
              >
                {isSubmitting ? t('signingIn') : t('signIn')}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div className="container flex items-center justify-center min-h-[80vh]">Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}