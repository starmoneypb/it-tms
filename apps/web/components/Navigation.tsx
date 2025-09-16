"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";

export function Navigation() {
  const { user, isLoading, signOut, hasAnyRole } = useAuth();

  if (isLoading) {
    return (
      <nav className="container flex items-center justify-between py-4">
        <Link href="/" className="text-2xl font-bold gradient-text">
          IT‑TMS
        </Link>
        <div className="flex items-center gap-6">
          <div className="animate-pulse bg-white/20 h-8 w-24 rounded"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="container flex items-center justify-between py-4">
      <Link href="/" className="text-2xl font-bold gradient-text">
        IT‑TMS
      </Link>
      
      <div className="flex items-center gap-6">
        {/* Always visible links */}
        <Link 
          href="/dashboard" 
          className="text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          Dashboard
        </Link>
        <Link 
          href="/tickets" 
          className="text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          Tickets
        </Link>
        <Link 
          href="/tickets/new" 
          className="text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          Open Ticket
        </Link>

        {/* Role-based links */}
        {hasAnyRole(["Supervisor", "Manager"]) && (
          <Link 
            href="/admin/classify" 
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Admin
          </Link>
        )}

        {/* Authentication section */}
        {user ? (
          <Dropdown>
            <DropdownTrigger>
              <Button variant="ghost" className="text-white/80 hover:text-white">
                {user.name} ({user.role})
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem key="profile" className="text-black">
                Profile
              </DropdownItem>
              <DropdownItem key="signout" className="text-danger" onPress={signOut}>
                Sign Out
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        ) : (
          <Link 
            href="/sign-in" 
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
