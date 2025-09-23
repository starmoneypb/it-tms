import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "UniSight",
  description: "IT Ticket Management System",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="dark" lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}