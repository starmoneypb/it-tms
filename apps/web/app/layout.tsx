import "./globals.css";
import { HeroUIProvider } from "@heroui/react";
import { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "IT‑TMS",
  description: "IT Ticket Management System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <HeroUIProvider>
          <header className="sticky top-0 z-50 glass border-b border-white/10">
            <nav className="container flex items-center justify-between py-4">
              <Link href="/" className="text-2xl font-bold gradient-text">
                IT‑TMS
              </Link>
              <div className="flex items-center gap-6">
                <Link 
                  href="/dashboard" 
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/tickets" 
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  Tickets
                </Link>
                <Link 
                  href="/tickets/new" 
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  Open Ticket
                </Link>
                <Link 
                  href="/admin/classify" 
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  Admin
                </Link>
                <Link 
                  href="/sign-in" 
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </nav>
          </header>
          <main className="min-h-screen py-8">{children}</main>
        </HeroUIProvider>
      </body>
    </html>
  );
}