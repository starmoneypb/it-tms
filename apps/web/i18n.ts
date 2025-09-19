import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Can be imported from a shared config
export const locales = ['en', 'th'] as const;
export const defaultLocale = 'en' as const;

export default getRequestConfig(async ({ locale }) => {
  
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  
  // Import the correct messages based on locale
  let messages;
  try {
    if (locale === 'th') {
      messages = (await import('./messages/th.json')).default;
    } else {
      messages = (await import('./messages/en.json')).default;
    }
  } catch (error) {
    messages = (await import('./messages/en.json')).default;
  }

  return {
    locale: locale as string,
    messages
  };
});
