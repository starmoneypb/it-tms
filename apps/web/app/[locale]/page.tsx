'use client';

import Link from "next/link";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Ticket, BarChart3, Clipboard, LogIn, Sparkles, Zap, Rocket, ArrowRight } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { LanguageToggle } from '@/components/LanguageToggle';
import dynamic from 'next/dynamic';

// Lazy load the heavy NetworkLogoHub component
const NetworkLogoHub = dynamic(() => import('@/components/NetworkLogoHub'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center mb-8">
      <div className="w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse"></div>
      </div>
    </div>
  )
});

export default function Landing() {
  const t = useTranslations('landing');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number, speed: number}>>([]);

  // Optimized particle system with reduced count and better performance
  const initializeParticles = useCallback(() => {
    // Reduced from 50 to 20 particles for better performance
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
      y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.3 + 0.1
    }));
    setParticles(newParticles);
  }, []);

  // Initialize particles and animations with better performance
  useEffect(() => {
    setIsVisible(true);
    initializeParticles();

    // Use requestAnimationFrame instead of setInterval for better performance
    let animationId: number;
    const animateParticles = () => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        y: (particle.y + particle.speed) % (typeof window !== 'undefined' ? window.innerHeight : 800),
        x: particle.x + Math.sin(Date.now() * 0.0005 + particle.id) * 0.1
      })));
      animationId = requestAnimationFrame(animateParticles);
    };

    animationId = requestAnimationFrame(animateParticles);
    return () => cancelAnimationFrame(animationId);
  }, [initializeParticles]);

  // Memoize cards to prevent unnecessary re-renders
  const cards = useMemo(() => [
    ...(user ? [{ 
      href: `/${locale}/tickets/new`, 
      title: t('openTicket.title'), 
      desc: t('openTicket.description'),
      icon: <Ticket size={24} />,
      color: "from-blue-500 to-purple-600",
      delay: "delay-0"
    }] : []),
    { 
      href: `/${locale}/dashboard`, 
      title: t('dashboard.title'), 
      desc: t('dashboard.description'),
      icon: <BarChart3 size={24} />,
      color: "from-green-500 to-teal-600",
      delay: "delay-100"
    },
    { 
      href: `/${locale}/tickets`, 
      title: t('myTickets.title'), 
      desc: t('myTickets.description'),
      icon: <Clipboard size={24} />,
      color: "from-orange-500 to-red-600",
      delay: "delay-200"
    },
    ...(!user ? [{ 
      href: `/${locale}/sign-in`, 
      title: t('signIn.title'), 
      desc: t('signIn.description'),
      icon: <LogIn size={24} />,
      color: "from-purple-500 to-pink-600",
      delay: "delay-300"
    }] : [])
  ], [user, locale, t, tCommon]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Modern Background */}
      <div className="fixed inset-0 z-0">
        {/* Subtle Floating Particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-white/3 animate-pulse"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              animationDelay: `${particle.id * 0.1}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}

        {/* Minimal Geometric Shapes */}
        <div className="absolute top-20 left-10 w-24 h-24 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-full animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-purple-600/5 to-blue-600/5 rounded-full animate-float-fast"></div>
        <div className="absolute bottom-40 left-1/4 w-32 h-32 bg-gradient-to-r from-slate-700/5 to-slate-600/5 rounded-full animate-float-medium"></div>
        
      </div>

      {/* Content */}
      <div className="relative z-10 container">
        {/* Hero Section */}
        <section className="text-center min-h-screen flex flex-col justify-center relative pt-8">
          {/* Language Toggle */}
          <div className="absolute top-4 right-4 z-20">
            <LanguageToggle />
          </div>

          {/* Animated Network Logo Hub */}
          <NetworkLogoHub />

          {/* Clean Title Structure */}
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Simple Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-4 py-2 mb-6 text-sm font-medium text-blue-300">
              <Sparkles size={16} />
              <span>{t('badge')}</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold mb-6 gradient-text relative leading-tight pb-4 overflow-visible">
              {t('title')}
            </h1>
            
            {/* Clean Subtitle */}
            <p className="text-2xl md:text-3xl text-white/70 mb-8 max-w-4xl mx-auto leading-relaxed font-light">
              {t('subtitle')}
            </p>
          </div>

          {/* Enhanced CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-6 justify-center items-center transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {user ? (
              <Button 
                as={Link} 
                href={`/${locale}/tickets/new`} 
                color="primary" 
                size="lg"
                className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/25 group"
              >
                <Rocket className="mr-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                {tCommon('getStarted')}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={16} />
              </Button>
            ) : (
              <Button 
                as={Link} 
                href={`/${locale}/sign-in`} 
                color="primary" 
                size="lg"
                className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/25 group"
              >
                <Rocket className="mr-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                {tCommon('getStarted')}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={16} />
              </Button>
            )}
            <Button 
              as={Link} 
              href={`/${locale}/dashboard`} 
              variant="bordered" 
              size="lg"
              className="px-12 py-6 text-lg font-semibold border-2 border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm group"
            >
              <BarChart3 className="mr-2 group-hover:rotate-12 transition-transform duration-300" size={20} />
              {tCommon('viewDashboard')}
            </Button>
          </div>
        </section>

        {/* Clean Features Grid */}
        <section className="py-20">
          <div className={`text-center mb-20 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-4 py-2 mb-6 text-sm font-medium text-blue-300">
              <Zap size={16} />
              <span>{t('quickActions')}</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold gradient-text mb-6 leading-normal pb-1">
              {t('quickActions')}
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
              {t('description')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {cards.map((card, index) => (
              <Card 
                key={card.href} 
                className={`group cursor-pointer border border-white/5 hover:border-white/20 backdrop-blur-lg hover:shadow-2xl hover:shadow-purple-600/10 animate-fade-in-up ${card.delay} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} relative overflow-hidden`}
                isPressable
                as={Link}
                href={card.href as any}
                style={{
                  animationDelay: `${index * 200 + 1000}ms`
                }}
              >
                {/* Animated Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                
                <CardHeader className="flex flex-col items-center text-center pb-6 pt-8 relative z-10">
                  {/* Enhanced Icon Container */}
                  <div className="relative mb-6">
                    <div className={`absolute inset-0 bg-gradient-to-r ${card.color} opacity-20 rounded-full blur-md group-hover:opacity-30 transition-opacity duration-300`}></div>
                    <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${card.color} bg-opacity-10 border border-white/10 group-hover:border-white/20 group-hover:scale-110 transition-all duration-300`}>
                      <div className="text-white/90 group-hover:text-white transition-colors duration-300">
                        {card.icon}
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                    {card.title}
                  </h3>
                </CardHeader>
                
                <CardBody className="text-center pt-0 pb-8 px-8 relative z-10">
                  <p className="text-white/60 mb-8 group-hover:text-white/80 transition-colors duration-300 leading-relaxed">
                    {card.desc}
                  </p>
                  
                  <Button 
                    color="primary" 
                    variant="flat" 
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-white/10 hover:border-white/20 transition-all duration-300 group-hover:scale-105 font-semibold group/btn"
                  >
                    <span className="group-hover/btn:translate-x-1 transition-transform duration-300">
                      {tCommon('go')}
                    </span>
                    <ArrowRight className="ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" size={16} />
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}