"use client";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { I18nProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchInterval: 5000, staleTime: 2000 } } }));
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider defaultLocale="zh-CN">
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
