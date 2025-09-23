'use client';

import Link from "next/link";
import Image from "next/image";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Ticket, BarChart3, Clipboard, LogIn, Sparkles, Zap, Star, Rocket } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';

export default function Landing() {
  const t = useTranslations('landing');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number, speed: number}>>([]);

  // Initialize particles and animations
  useEffect(() => {
    setIsVisible(true);
    
    // Create floating particles
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.1
    }));
    setParticles(newParticles);

    // Animate particles
    const animateParticles = () => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        y: (particle.y + particle.speed) % window.innerHeight,
        x: particle.x + Math.sin(Date.now() * 0.001 + particle.id) * 0.2
      })));
    };

    const interval = setInterval(animateParticles, 50);
    return () => clearInterval(interval);
  }, []);

  const cards = [
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
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-gradient-shift"></div>
        
        {/* Floating Particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-white/10 animate-pulse"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              animationDelay: `${particle.id * 0.1}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}

        {/* Geometric Shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full animate-float-fast"></div>
        <div className="absolute bottom-40 left-1/4 w-40 h-40 bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-full animate-float-medium"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-gradient-to-r from-yellow-500/20 to-red-500/20 rounded-full animate-float-slow"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'grid-move 20s linear infinite'
          }}></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container">
        {/* Hero Section */}
        <section className="text-center py-20 relative">
          {/* Logo with Animation */}
          <div className="flex justify-center mb-8 relative">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse opacity-30"></div>
              <div className="relative bg-white/10 backdrop-blur-sm rounded-full p-4 border border-white/20">
                <Image
                  src="/logo.svg"
                  alt="IT-TMS Logo"
                  width={80}
                  height={80}
                  className="h-20 w-20 animate-spin-slow"
                />
              </div>
            </div>
          </div>

          {/* Animated Title */}
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 gradient-text animate-text-glow relative">
              {t('title')}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 blur-xl animate-pulse"></div>
            </h1>
            <div className="flex justify-center items-center gap-2 mb-6">
              <Sparkles className="text-yellow-400 animate-spin" size={24} />
              <Zap className="text-blue-400 animate-bounce" size={24} />
              <Star className="text-purple-400 animate-pulse" size={24} />
              <Rocket className="text-pink-400 animate-bounce" size={24} />
            </div>
          </div>

          {/* Animated Subtitle */}
          <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>
          </div>

          {/* Animated Buttons */}
          <div className={`flex flex-col sm:flex-row gap-6 justify-center items-center transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {user ? (
              <Button 
                as={Link} 
                href={`/${locale}/tickets/new`} 
                color="primary" 
                size="lg"
                className="px-10 py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl animate-pulse-slow"
              >
                <Rocket className="mr-2" size={20} />
                {tCommon('getStarted')}
              </Button>
            ) : (
              <Button 
                as={Link} 
                href={`/${locale}/sign-in`} 
                color="primary" 
                size="lg"
                className="px-10 py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl animate-pulse-slow"
              >
                <Rocket className="mr-2" size={20} />
                {tCommon('getStarted')}
              </Button>
            )}
            <Button 
              as={Link} 
              href={`/${locale}/dashboard`} 
              variant="bordered" 
              size="lg"
              className="px-10 py-6 text-lg font-semibold border-2 border-white/30 hover:border-white/60 bg-white/5 hover:bg-white/10 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <BarChart3 className="mr-2" size={20} />
              {tCommon('viewDashboard')}
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20">
          <div className={`text-center mb-16 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">{t('quickActions')}</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {cards.map((card, index) => (
              <Card 
                key={card.href} 
                className={`glass hover:scale-105 transition-all duration-500 group cursor-pointer p-6 border border-white/10 hover:border-white/30 backdrop-blur-lg hover:shadow-2xl hover:shadow-purple-500/20 animate-fade-in-up ${card.delay} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                isPressable
                as={Link}
                href={card.href as any}
                style={{
                  animationDelay: `${index * 200 + 1000}ms`
                }}
              >
                <CardHeader className="flex flex-col items-center text-center pb-4">
                  <div className={`mb-4 p-4 rounded-full bg-gradient-to-r ${card.color} bg-clip-text relative group-hover:scale-110 transition-transform duration-300`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10 text-white">
                      {card.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                    {card.title}
                  </h3>
                </CardHeader>
                <CardBody className="text-center pt-0">
                  <p className="text-sm text-white/70 mb-6 group-hover:text-white/90 transition-colors duration-300">
                    {card.desc}
                  </p>
                  <Button 
                    color="primary" 
                    variant="flat" 
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/40 hover:to-purple-500/40 border border-white/20 hover:border-white/40 transition-all duration-300 group-hover:scale-105"
                  >
                    {tCommon('go')}
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20">
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="text-center group">
              <div className="relative mb-4">
                <div className="text-5xl md:text-6xl font-bold text-transparent bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text animate-counter">
                  99.9%
                </div>
                <div className="absolute inset-0 text-5xl md:text-6xl font-bold text-green-400/20 blur-sm animate-pulse">
                  99.9%
                </div>
              </div>
              <div className="text-white/70 text-lg font-medium group-hover:text-white transition-colors duration-300">
                {tCommon('uptime')}
              </div>
            </div>
            <div className="text-center group">
              <div className="relative mb-4">
                <div className="text-5xl md:text-6xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text animate-counter">
                  &lt;2min
                </div>
                <div className="absolute inset-0 text-5xl md:text-6xl font-bold text-yellow-400/20 blur-sm animate-pulse">
                  &lt;2min
                </div>
              </div>
              <div className="text-white/70 text-lg font-medium group-hover:text-white transition-colors duration-300">
                {tCommon('responseTime')}
              </div>
            </div>
            <div className="text-center group">
              <div className="relative mb-4">
                <div className="text-5xl md:text-6xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text animate-counter">
                  24/7
                </div>
                <div className="absolute inset-0 text-5xl md:text-6xl font-bold text-purple-400/20 blur-sm animate-pulse">
                  24/7
                </div>
              </div>
              <div className="text-white/70 text-lg font-medium group-hover:text-white transition-colors duration-300">
                {tCommon('support')}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}