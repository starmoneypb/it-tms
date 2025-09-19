"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { useTranslations, useLocale } from 'next-intl';
import { LanguageToggle } from './LanguageToggle';

// Use current hostname with port 8000 for production-like environment
const API = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

export function Navigation() {
  const { user, isLoading, signOut, hasAnyRole } = useAuth();
  const t = useTranslations('navigation');
  const locale = useLocale();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);


  // Helper function to create locale-aware URLs
  const createLocalizedUrl = (path: string) => {
    const url = `/${locale}${path}`;
    return url as any;
  };

  // Handle click outside to close mobile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        mobileMenuRef.current && 
        !mobileMenuRef.current.contains(target) &&
        mobileButtonRef.current &&
        !mobileButtonRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Handle window resize to close menus when switching between mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      if (isMobile) {
        // Switching to mobile view - close dropdown
        setIsDropdownOpen(false);
      } else {
        // Switching to desktop view - close mobile menu
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <nav className="container flex items-center justify-between py-4 min-h-[80px]">
        <Link href={createLocalizedUrl("/")} className="flex items-center">
          <Image
            src="/logo.svg"
            alt="IT-TMS Logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
        </Link>
        <div className="flex items-center gap-6">
          <div className="animate-pulse bg-white/20 h-8 w-24 rounded"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="container relative flex items-center justify-between py-6 min-h-[80px]">
      <Link href={createLocalizedUrl("/")} className="flex items-center">
        <Image
          src="/logo.svg"
          alt="IT-TMS Logo"
          width={32}
          height={32}
          className="h-8 w-8"
        />
      </Link>
      
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-6 py-1">
        {/* Always visible links */}
        <Link 
          href={createLocalizedUrl("/dashboard")} 
          className="text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          {t('dashboard')}
        </Link>
        <Link 
          href={createLocalizedUrl("/tickets")} 
          className="text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          {t('tickets')}
        </Link>
        {user && (
          <Link 
            href={createLocalizedUrl("/tickets/new")} 
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            {t('openTicket')}
          </Link>
        )}

        {/* Role-based links */}
        {hasAnyRole(["Supervisor", "Manager"]) && (
          <Link 
            href={createLocalizedUrl("/admin/classify")} 
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            {t('admin')}
          </Link>
        )}

        {/* Language Toggle */}
        <LanguageToggle />

        {/* Authentication section */}
        {user ? (
          <Dropdown isOpen={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownTrigger>
              <Button 
                variant="ghost" 
                className="glass text-white/90 hover:text-white hover:bg-white/10 rounded-full border border-white/20 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl hover:border-white/30 flex items-center p-0 pl-0 relative"
              >
                {user.profilePicture ? (
                  <img 
                    src={`${API}${user.profilePicture}`} 
                    alt={user.name}
                    className="w-10 h-10 rounded-full ring-2 ring-white/20 absolute left-0 top-1/2 transform -translate-y-1/2"
                    onError={(e) => {
                      // Hide image if it fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium ring-2 ring-white/20 absolute left-0 top-1/2 transform -translate-y-1/2">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col items-start pl-12 pr-4">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-white/60">{user.role}</span>
                </div>
              </Button>
            </DropdownTrigger>
            <DropdownMenu className="glass rounded-xl">
              <DropdownItem key="profile" className="text-white/90" onPress={() => window.location.href = createLocalizedUrl('/profile')}>
                {t('profile')}
              </DropdownItem>
              <DropdownItem key="signout" className="text-danger" onPress={signOut}>
                {t('signOut')}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        ) : (
          <Link 
            href={createLocalizedUrl("/sign-in")} 
            className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-primary-400/20 backdrop-blur-sm"
          >
            {t('signIn')}
          </Link>
        )}
      </div>

      {/* Mobile Menu Button */}
      <button
        ref={mobileButtonRef}
        className="md:hidden flex flex-col items-center justify-center w-8 h-8 space-y-1"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle mobile menu"
      >
        <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
        <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
        <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
      </button>

     {/* Mobile Navigation Menu */}
      <div
        ref={mobileMenuRef}
        className={`md:hidden absolute top-full left-0 right-0 mobile-glass border-b border-white/10 shadow-lg transition-opacity duration-300 ease-in-out ${
          isMobileMenuOpen
            ? 'opacity-100 visible pointer-events-auto'
            : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* ย้ายแอนิเมชันการเลื่อนมาไว้ที่ชั้นใน ไม่ใช่ที่ .mobile-glass */}
        <div className={`px-6 py-6 space-y-1 transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-y-0' : '-translate-y-2'
        }`}>
          {/* Navigation Links */}
          <div className="space-y-1">
            <Link 
              href={createLocalizedUrl("/dashboard")} 
              className="flex items-center px-4 py-3 text-base font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('dashboard')}
            </Link>
            <Link 
              href={createLocalizedUrl("/tickets")} 
              className="flex items-center px-4 py-3 text-base font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('tickets')}
            </Link>
            {user && (
              <Link 
                href={createLocalizedUrl("/tickets/new")} 
                className="flex items-center px-4 py-3 text-base font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('openTicket')}
              </Link>
            )}

            {hasAnyRole(["Supervisor", "Manager"]) && (
              <Link 
                href={createLocalizedUrl("/admin/classify")} 
                className="flex items-center px-4 py-3 text-base font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('admin')}
              </Link>
            )}
            
            {/* Mobile Language Toggle */}
            <div className="px-4 py-3">
              <LanguageToggle />
            </div>
          </div>

          {/* Authentication section */}
          <div className="pt-4 mt-4 border-t border-white/10">
            {user ? (
              <div className="space-y-2">
                <div className="glass px-4 py-3 text-sm text-white/90 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3 backdrop-blur-md">
                  {user.profilePicture ? (
                    <img 
                      src={`${API}${user.profilePicture}`} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full ring-2 ring-white/20"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium ring-2 ring-white/20">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{user.name}</span>
                    <span className="text-xs text-white/60">{user.role}</span>
                  </div>
                </div>
                <Link
                  href={createLocalizedUrl("/profile")}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center w-full px-4 py-3 text-base font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                >
                  {t('profile')}
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                >
                  {t('signOut')}
                </button>
              </div>
            ) : (
              <Link 
                href={createLocalizedUrl("/sign-in")} 
                className="flex items-center justify-center w-full px-6 py-4 text-base font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-primary-400/20 backdrop-blur-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('signIn')}
              </Link>
            )}
          </div>
        </div>
      </div>

    </nav>
  );
}
