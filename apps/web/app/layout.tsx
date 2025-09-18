import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "IT‑TMS",
  description: "IT Ticket Management System",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}