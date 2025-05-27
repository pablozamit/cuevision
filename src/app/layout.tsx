import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppProviders from '@/components/AppProviders'; // To manage theme, etc.

// No need to call GeistSans and GeistMono as functions here, 
// they are objects with the variable name when imported directly from geist/font/sans and geist/font/mono.

export const metadata: Metadata = {
  title: 'Cue Vision',
  description: 'AI Powered Pool Shot Assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}> {/* Apply dark theme by default */}
      <body className={`antialiased font-sans`}> {/* font-sans will use the --font-geist-sans variable */}
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
