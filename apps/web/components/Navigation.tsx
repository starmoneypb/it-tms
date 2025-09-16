"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";

export function Navigation() {
  const { user, isLoading, signOut, hasAnyRole } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-6">
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

      {/* Mobile Menu Button */}
      <button
        className="md:hidden flex flex-col items-center justify-center w-8 h-8 space-y-1"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle mobile menu"
      >
        <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
        <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
        <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
      </button>

      {/* Mobile Navigation Menu */}
      <div className={`md:hidden absolute top-full left-0 right-0 bg-black/90 backdrop-blur-md border-b border-white/10 transition-all duration-300 ease-in-out ${
        isMobileMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-4'
      }`}>
        <div className="container py-4 space-y-4">
          {/* Always visible links */}
          <Link 
            href="/dashboard" 
            className="block text-sm font-medium text-white/80 hover:text-white transition-colors py-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            href="/tickets" 
            className="block text-sm font-medium text-white/80 hover:text-white transition-colors py-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Tickets
          </Link>
          <Link 
            href="/tickets/new" 
            className="block text-sm font-medium text-white/80 hover:text-white transition-colors py-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Open Ticket
          </Link>

          {/* Role-based links */}
          {hasAnyRole(["Supervisor", "Manager"]) && (
            <Link 
              href="/admin/classify" 
              className="block text-sm font-medium text-white/80 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Admin
            </Link>
          )}

          {/* Authentication section */}
          <div className="pt-2 border-t border-white/10">
            {user ? (
              <div className="space-y-2">
                <div className="text-sm text-white/60 py-2">
                  {user.name} ({user.role})
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-sm font-medium text-red-400 hover:text-red-300 transition-colors py-2"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link 
                href="/sign-in" 
                className="block w-full text-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
