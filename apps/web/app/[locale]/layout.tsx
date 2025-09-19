import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ReactNode } from 'react';
import { HeroUIProvider } from "@heroui/react";
import { AuthProvider } from "../../lib/auth";
import { Navigation } from "../../components/Navigation";
import { locales } from "../../i18n";
import { IBM_Plex_Sans_Thai } from "next/font/google";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await params before accessing its properties
  const { locale } = await params;
  
  
  // Load messages explicitly for the correct locale
  let messages;
  try {
    if (locale === 'th') {
      messages = (await import('../../messages/th.json')).default;
    } else {
      messages = (await import('../../messages/en.json')).default;
    }
  } catch (error) {
    messages = (await import('../../messages/en.json')).default;
  }
  

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <HeroUIProvider>
        <AuthProvider>
          <div 
            className={locale === 'th' ? ibmPlexSansThai.className : undefined}
            lang={locale}
          >
            <header className="sticky top-0 z-50 glass border-b border-white/10">
              <Navigation />
            </header>
            <main className="min-h-screen py-8">{children}</main>
          </div>
        </AuthProvider>
      </HeroUIProvider>
    </NextIntlClientProvider>
  );
}
