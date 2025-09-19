"use client";

import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales } from '../i18n';

export function LanguageToggle() {
  const t = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();


  const switchLocale = (newLocale: string) => {
    
    // Parse the current URL to extract the path without locale
    const segments = pathname.split('/').filter(Boolean);
    
    // Remove the first segment if it's a locale
    let pathWithoutLocale = '/';
    if (segments.length > 0 && locales.includes(segments[0] as any)) {
      // First segment is a locale, remove it
      pathWithoutLocale = '/' + segments.slice(1).join('/');
    } else {
      // No locale in path, use the full path
      pathWithoutLocale = pathname;
    }
    
    // Ensure path starts with /
    if (!pathWithoutLocale.startsWith('/')) {
      pathWithoutLocale = '/' + pathWithoutLocale;
    }
    
    // Construct the new URL with the new locale
    const newPath = `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
    
    
    // Use window.location.href for more reliable navigation
    window.location.href = newPath;
  };

  const getCurrentLanguageLabel = () => {
    return locale === 'th' ? t('thai') : t('english');
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="ghost"
          size="sm"
          className="glass text-white/90 hover:text-white hover:bg-white/10 rounded-lg border border-white/20 backdrop-blur-md transition-all duration-300 hover:border-white/30"
          startContent={<Globe size={16} />}
        >
          {getCurrentLanguageLabel()}
        </Button>
      </DropdownTrigger>
      <DropdownMenu 
        className="glass rounded-xl"
        aria-label={t('switchLanguage')}
      >
        {locales.map((loc) => (
          <DropdownItem
            key={loc}
            className={`text-white/90 ${locale === loc ? 'bg-primary-500/20' : ''}`}
            onPress={() => switchLocale(loc)}
          >
            {loc === 'th' ? t('thai') : t('english')}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
