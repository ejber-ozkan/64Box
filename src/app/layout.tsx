import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "64Box",
  description: "GB64 frontend for browsing, filtering, and launching Commodore 64 games.",
};

import { SettingsProvider } from '@/contexts/SettingsContext';
import { UiSoundRuntime } from '@/components/UiSoundRuntime';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="/jsSID.js" defer></script>
      </head>
      <body className="antialiased">
        <SettingsProvider>
          <UiSoundRuntime />
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
