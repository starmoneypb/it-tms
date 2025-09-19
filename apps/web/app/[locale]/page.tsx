'use client';

import Link from "next/link";
import Image from "next/image";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Ticket, BarChart3, Clipboard, LogIn } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';

export default function Landing() {
  const t = useTranslations('landing');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();

  // Test: Show both hardcoded and translated text for debugging
  const isThaiLocale = locale === 'th';
  
  const cards = [
    ...(user ? [{ 
      href: `/${locale}/tickets/new`, 
      title: t('openTicket.title'), 
      desc: t('openTicket.description'),
      icon: <Ticket size={24} />,
      color: "from-blue-500 to-purple-600"
    }] : []),
    { 
      href: `/${locale}/dashboard`, 
      title: t('dashboard.title'), 
      desc: t('dashboard.description'),
      icon: <BarChart3 size={24} />,
      color: "from-green-500 to-teal-600"
    },
    { 
      href: `/${locale}/tickets`, 
      title: t('myTickets.title'), 
      desc: t('myTickets.description'),
      icon: <Clipboard size={24} />,
      color: "from-orange-500 to-red-600"
    },
    ...(!user ? [{ 
      href: `/${locale}/sign-in`, 
      title: t('signIn.title'), 
      desc: t('signIn.description'),
      icon: <LogIn size={24} />,
      color: "from-purple-500 to-pink-600"
    }] : [])
  ];

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="text-center py-16">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.svg"
            alt="IT-TMS Logo"
            width={80}
            height={80}
            className="h-20 w-20"
          />
        </div>
        <h1 className="text-5xl font-bold mb-6 gradient-text pb-6">
          {t('title')}
        </h1>
        <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
          {t('subtitle')}
        </p>
        <div className="flex gap-4 justify-center">
          {user ? (
            <Button 
              as={Link} 
              href={`/${locale}/tickets/new`} 
              color="primary" 
              size="lg"
              className="px-8"
            >
              {tCommon('getStarted')}
            </Button>
          ) : (
            <Button 
              as={Link} 
              href={`/${locale}/sign-in`} 
              color="primary" 
              size="lg"
              className="px-8"
            >
              {tCommon('getStarted')}
            </Button>
          )}
          <Button 
            as={Link} 
            href={`/${locale}/dashboard`} 
            variant="bordered" 
            size="lg"
            className="px-8"
          >
            {tCommon('viewDashboard')}
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12">{t('quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c) => (
            <Card 
              key={c.href} 
              className="glass hover:scale-105 transition-all duration-300 group cursor-pointer p-2"
              isPressable
              as={Link}
              href={c.href as any}
            >
              <CardHeader className="flex flex-col items-center text-center pb-2">
                <div className={`mb-3 bg-gradient-to-r ${c.color} bg-clip-text`}>
                  {c.icon}
                </div>
                <h3 className="text-xl font-semibold group-hover:text-primary-500 transition-colors">
                  {c.title}
                </h3>
              </CardHeader>
              <CardBody className="text-center pt-0">
                <p className="text-sm text-white/70 mb-4">{c.desc}</p>
                <Button 
                  color="primary" 
                  variant="flat" 
                  size="sm"
                  className="w-full"
                >
                  {tCommon('go')}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-500 mb-2">99.9%</div>
            <div className="text-white/70">{tCommon('uptime')}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-500 mb-2">&lt;2min</div>
            <div className="text-white/70">{tCommon('responseTime')}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-500 mb-2">24/7</div>
            <div className="text-white/70">{tCommon('support')}</div>
          </div>
        </div>
      </section>
    </div>
  );
}