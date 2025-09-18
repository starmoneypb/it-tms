import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Can be imported from a shared config
export const locales = ['en', 'th'] as const;
export const defaultLocale = 'en' as const;

export default getRequestConfig(async ({ locale }) => {
  console.log('i18n getRequestConfig called with locale:', locale);
  
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as any)) {
    console.warn(`Invalid locale: ${locale}, falling back to ${defaultLocale}`);
    locale = defaultLocale;
  }

  console.log('i18n using locale:', locale);
  
  // Import the correct messages based on locale
  let messages;
  try {
    if (locale === 'th') {
      messages = (await import('./messages/th.json')).default;
    } else {
      messages = (await import('./messages/en.json')).default;
    }
    console.log('i18n loaded messages for locale:', locale, 'Sample:', messages.common?.loading);
  } catch (error) {
    console.error('Error loading messages for locale:', locale, error);
    messages = (await import('./messages/en.json')).default;
  }

  return {
    locale: locale as string,
    messages
  };
});
