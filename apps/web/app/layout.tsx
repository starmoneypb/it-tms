import "./globals.css";
import { HeroUIProvider } from "@heroui/react";
import { ReactNode } from "react";
import Link from "next/link";
import { AuthProvider } from "../lib/auth";
import { Navigation } from "../components/Navigation";

export const metadata = {
  title: "IT‑TMS",
  description: "IT Ticket Management System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <HeroUIProvider>
          <AuthProvider>
            <header className="sticky top-0 z-50 glass border-b border-white/10">
              <Navigation />
            </header>
            <main className="min-h-screen py-8">{children}</main>
          </AuthProvider>
        </HeroUIProvider>
      </body>
    </html>
  );
}