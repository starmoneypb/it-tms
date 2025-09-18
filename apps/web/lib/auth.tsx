"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type UserRole = "Anonymous" | "User" | "Supervisor" | "Manager";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePicture?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  canEditTicket: (ticketCreatedBy?: string) => boolean;
  canCancelTicket: (ticketCreatedBy?: string) => boolean;
  canAssignTicket: (selfOnly?: boolean) => boolean;
  canCreateTicketType: (ticketType: string) => boolean;
  canModifyTicketFields: () => boolean;
  canEditTicketContent: (ticketCreatedBy?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API}/api/v1/me`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.data.role !== "Anonymous") {
          setUser(data.data);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API}/api/v1/auth/sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      
      if (response.ok) {
        await checkAuth();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Sign in failed:", error);
      return false;
    }
  };

  const signUp = async (name: string, email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const response = await fetch(`${API}/api/v1/auth/sign-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password, role }),
      });
      
      if (response.ok) {
        await checkAuth();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Sign up failed:", error);
      return false;
    }
  };

  const signOut = async () => {
    try {
      // Call server sign-out endpoint to properly clear cookie
      await fetch(`${API}/api/v1/auth/sign-out`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Sign out failed:", error);
      // Even if server call fails, clear client state
    } finally {
      // Clear client state
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const canEditTicket = (ticketCreatedBy?: string): boolean => {
    if (!user) return false;
    if (user.role === "Supervisor" || user.role === "Manager") return true;
    if (user.role === "User") return ticketCreatedBy === user.id;
    return false;
  };

  const canCancelTicket = (ticketCreatedBy?: string): boolean => {
    if (!user) return false;
    if (user.role === "Supervisor" || user.role === "Manager") return true;
    if (user.role === "User") return ticketCreatedBy === user.id;
    return false;
  };

  const canAssignTicket = (selfOnly: boolean = false): boolean => {
    if (!user) return false;
    if (selfOnly) return true; // Anyone can self-assign
    return user.role === "Supervisor" || user.role === "Manager";
  };

  const canCreateTicketType = (ticketType: string): boolean => {
    if (!user) {
      // Anonymous can only create Issue Reports
      return ticketType === "ISSUE_REPORT";
    }
    
    switch (user.role) {
      case "User":
        // Users can create all types except Emergency Change and Data Correction
        return !["EMERGENCY_CHANGE", "DATA_CORRECTION"].includes(ticketType);
      case "Supervisor":
      case "Manager":
        // Supervisors and Managers can create all types
        return true;
      default:
        return false;
    }
  };

  const canModifyTicketFields = (): boolean => {
    if (!user) return false;
    return user.role === "Supervisor" || user.role === "Manager";
  };

  const canEditTicketContent = (ticketCreatedBy?: string): boolean => {
    if (!user) return false;
    if (user.role === "Supervisor" || user.role === "Manager") return true;
    if (user.role === "User") return ticketCreatedBy === user.id;
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshUser,
        hasRole,
        hasAnyRole,
        canEditTicket,
        canCancelTicket,
        canAssignTicket,
        canCreateTicketType,
        canModifyTicketFields,
        canEditTicketContent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
