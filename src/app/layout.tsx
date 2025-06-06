
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from "@/components/ui/toaster";
import { ThemeInitializer } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Link Cabs',
  description: 'Your reliable cab booking service.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased font-bold">
        <ThemeInitializer><AuthProvider>{children}<Toaster /></AuthProvider></ThemeInitializer>
      </body>
    </html>
  );
}

