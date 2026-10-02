import './globals.css';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';

export const viewport = { themeColor: '#C2410C' };

export const metadata = {
  title: 'Saloone · Salon management', description: 'Bookings, billing and staff payouts',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Saloone', statusBarStyle: 'default' as const },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
      </head>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
