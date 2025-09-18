"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Crown, Settings, User } from "lucide-react";
import { useSearchParams } from "next/navigation";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type Form = z.infer<typeof schema>;
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function SignIn() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Form>({ resolver: zodResolver(schema) });
  const searchParams = useSearchParams();

  async function onSubmit(values: Form) {
    const res = await fetch(`${API}/api/v1/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      setError("password", { message: "Invalid credentials" });
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
          <h1 className="text-3xl font-bold gradient-text mb-2">Welcome Back</h1>
          <p className="text-white/70">Sign in to your IT-TMS account</p>
        </div>
        
        <Card className="glass">
          <CardHeader className="text-center pb-2">
            <h2 className="text-xl font-semibold">Sign In</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input 
                label="Email" 
                variant="bordered" 
                type="email"
                placeholder="Enter your email"
                {...register("email")} 
                isInvalid={!!errors.email} 
                errorMessage={errors.email?.message}
              />
              <Input 
                label="Password" 
                type="password" 
                variant="bordered"
                placeholder="Enter your password"
                {...register("password")} 
                isInvalid={!!errors.password} 
                errorMessage={errors.password?.message}
              />
              <Button 
                type="submit" 
                color="primary" 
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-semibold"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>
            </form>
            
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/60 text-center mb-2">Demo Credentials</p>
              <div className="space-y-1 text-xs text-white/50">
                <div className="flex items-center gap-2">
                  <Crown size={12} className="text-yellow-400" />
                  <strong>Manager:</strong> manager@ / Password!1
                </div>
                <div className="flex items-center gap-2">
                  <Settings size={12} className="text-blue-400" />
                  <strong>Supervisor:</strong> supervisor@ / Password!1
                </div>
                <div className="flex items-center gap-2">
                  <User size={12} className="text-gray-400" />
                  <strong>User:</strong> user@ / Password!1
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}