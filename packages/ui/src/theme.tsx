"use client";
import { ReactNode } from "react";

export function ThemeContainer({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[--color-background] text-[--color-text]">{children}</div>;
}