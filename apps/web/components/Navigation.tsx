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
              <Button variant="ghost" className="text-white/80 hover:text-white flex items-center gap-2">
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {user.name} ({user.role})
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem key="profile" className="text-gray-700" onPress={() => window.location.href = '/profile'}>
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
      <div className={`md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg transition-all duration-300 ease-in-out ${
        isMobileMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-4'
      }`}>
        <div className="px-6 py-6 space-y-1">
          {/* Navigation Links */}
          <div className="space-y-1">
            <Link 
              href="/dashboard" 
              className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              href="/tickets" 
              className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Tickets
            </Link>
            <Link 
              href="/tickets/new" 
              className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Open Ticket
            </Link>

            {/* Role-based links */}
            {hasAnyRole(["Supervisor", "Manager"]) && (
              <Link 
                href="/admin/classify" 
                className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Authentication section */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            {user ? (
              <div className="space-y-2">
                <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 rounded-lg flex items-center gap-2">
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt={user.name}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {user.name} ({user.role})
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link 
                href="/sign-in" 
                className="flex items-center justify-center w-full px-4 py-3 text-base font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-all duration-200"
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
