import './globals.css';

import type { Metadata, Viewport } from 'next';

import { Providers } from '@/components/providers';
import { SkipLink } from '@/components/ui/skip-link';
import { copy } from '@/messages/es';

export const metadata: Metadata = {
  title: copy.app.name,
  description: copy.app.description,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
