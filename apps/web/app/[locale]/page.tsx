'use client';

import Link from "next/link";
import Image from "next/image";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Ticket, BarChart3, Clipboard, LogIn, Sparkles, Zap, Star, Rocket, ArrowRight, CheckCircle, Shield, Clock, Users } from "lucide-react";
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
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 animate-gradient-shift"></div>
        
        {/* Floating Particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-white/5 animate-pulse"
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
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-full animate-float-fast"></div>
        <div className="absolute bottom-40 left-1/4 w-40 h-40 bg-gradient-to-r from-slate-700/10 to-slate-600/10 rounded-full animate-float-medium"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-gradient-to-r from-purple-700/10 to-slate-600/10 rounded-full animate-float-slow"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-3">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
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
          {/* Logo with Enhanced Animation */}
          <div className="flex justify-center mb-8 relative">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full animate-ping opacity-10"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-full animate-pulse opacity-15"></div>
              <div className="relative bg-white/5 backdrop-blur-sm rounded-full p-4 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                <Image
                  src="/logo.svg"
                  alt="IT-TMS Logo"
                  width={80}
                  height={80}
                  className="h-20 w-20 animate-spin-slow opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Title Structure */}
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-4 py-2 mb-6 text-sm font-medium text-blue-300">
              <Sparkles className="animate-spin" size={16} />
              <span>Modern IT Management Platform</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold mb-6 gradient-text animate-text-glow relative leading-tight">
              {t('title')}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-slate-600 opacity-10 blur-xl animate-pulse"></div>
            </h1>
            
            {/* Enhanced Subtitle */}
            <p className="text-2xl md:text-3xl text-white/70 mb-8 max-w-4xl mx-auto leading-relaxed font-light">
              Streamline your IT operations with our{" "}
              <span className="text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text font-semibold">
                intelligent ticket management system
              </span>
            </p>
            
            {/* Value Proposition */}
            <div className="flex flex-wrap justify-center items-center gap-6 mb-12 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-500" size={16} />
                <span>99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="text-blue-500" size={16} />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="text-purple-500" size={16} />
                <span>&lt;2min Response Time</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="text-orange-500" size={16} />
                <span>24/7 Support</span>
              </div>
            </div>
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

        {/* Enhanced Features Grid */}
        <section className="py-20">
          <div className={`text-center mb-20 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-4 py-2 mb-6 text-sm font-medium text-blue-300">
              <Zap className="animate-pulse" size={16} />
              <span>Quick Actions</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold gradient-text mb-6 leading-tight">
              Everything you need to manage IT tickets
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
              Streamline your workflow with our comprehensive suite of tools designed for modern IT operations
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

        {/* Enhanced Stats Section */}
        <section className="py-20">
          <div className={`text-center mb-16 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600/20 to-blue-600/20 backdrop-blur-sm border border-green-500/30 rounded-full px-4 py-2 mb-6 text-sm font-medium text-green-300">
              <CheckCircle className="animate-pulse" size={16} />
              <span>Trusted by Teams Worldwide</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
              Built for Enterprise Scale
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Experience unmatched reliability and performance with our enterprise-grade infrastructure
            </p>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="text-center group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
              <div className="relative p-8 border border-white/5 hover:border-white/20 rounded-2xl backdrop-blur-sm transition-all duration-300 group-hover:scale-105">
                <div className="relative mb-6">
                  <div className="text-6xl md:text-7xl font-bold text-transparent bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text animate-counter">
                    99.9%
                  </div>
                  <div className="absolute inset-0 text-6xl md:text-7xl font-bold text-blue-500/10 blur-sm animate-pulse">
                    99.9%
                  </div>
                </div>
                <div className="text-white/60 text-lg font-semibold group-hover:text-white/80 transition-colors duration-300 mb-2">
                  {tCommon('uptime')}
                </div>
                <div className="text-white/40 text-sm">
                  Guaranteed availability
                </div>
              </div>
            </div>
            
            <div className="text-center group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
              <div className="relative p-8 border border-white/5 hover:border-white/20 rounded-2xl backdrop-blur-sm transition-all duration-300 group-hover:scale-105">
                <div className="relative mb-6">
                  <div className="text-6xl md:text-7xl font-bold text-transparent bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text animate-counter">
                    &lt;2min
                  </div>
                  <div className="absolute inset-0 text-6xl md:text-7xl font-bold text-purple-500/10 blur-sm animate-pulse">
                    &lt;2min
                  </div>
                </div>
                <div className="text-white/60 text-lg font-semibold group-hover:text-white/80 transition-colors duration-300 mb-2">
                  {tCommon('responseTime')}
                </div>
                <div className="text-white/40 text-sm">
                  Average response time
                </div>
              </div>
            </div>
            
            <div className="text-center group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
              <div className="relative p-8 border border-white/5 hover:border-white/20 rounded-2xl backdrop-blur-sm transition-all duration-300 group-hover:scale-105">
                <div className="relative mb-6">
                  <div className="text-6xl md:text-7xl font-bold text-transparent bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text animate-counter">
                    24/7
                  </div>
                  <div className="absolute inset-0 text-6xl md:text-7xl font-bold text-green-500/10 blur-sm animate-pulse">
                    24/7
                  </div>
                </div>
                <div className="text-white/60 text-lg font-semibold group-hover:text-white/80 transition-colors duration-300 mb-2">
                  {tCommon('support')}
                </div>
                <div className="text-white/40 text-sm">
                  Round-the-clock assistance
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Trust Section */}
        <section className="py-20">
          <div className={`text-center transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600/20 to-red-600/20 backdrop-blur-sm border border-orange-500/30 rounded-full px-4 py-2 mb-6 text-sm font-medium text-orange-300">
              <Shield className="animate-pulse" size={16} />
              <span>Enterprise Security</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-8">
              Secure by Design
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-white/90 mb-2">SOC 2</div>
                <div className="text-white/50 text-sm">Compliant</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white/90 mb-2">ISO 27001</div>
                <div className="text-white/50 text-sm">Certified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white/90 mb-2">GDPR</div>
                <div className="text-white/50 text-sm">Ready</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white/90 mb-2">256-bit</div>
                <div className="text-white/50 text-sm">Encryption</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}