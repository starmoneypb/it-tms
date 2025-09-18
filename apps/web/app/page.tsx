import { redirect } from 'next/navigation';

export default function RootPage() {
  // Always redirect to English as default
  redirect('/en');
}

