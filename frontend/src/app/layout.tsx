import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: {
    default: 'MyLibrary - Personal Book Collection Manager',
    template: '%s | MyLibrary',
  },
  description:
    'Organize your personal book collection with AI-powered search, duplicate detection, and smart categorization. Track your reading progress across Kindle, physical books, audiobooks, and more.',
  keywords: [
    'book collection',
    'library manager',
    'reading tracker',
    'book organizer',
    'personal library',
    'book catalog',
    'reading list',
  ],
  authors: [{ name: 'MyLibrary' }],
  creator: 'MyLibrary',
  publisher: 'MyLibrary',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'MyLibrary',
    title: 'MyLibrary - Personal Book Collection Manager',
    description:
      'Organize your personal book collection with AI-powered search, duplicate detection, and smart categorization.',
  },
  twitter: {
    card: 'summary',
    title: 'MyLibrary - Personal Book Collection Manager',
    description:
      'Organize your personal book collection with AI-powered search, duplicate detection, and smart categorization.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1a1a1a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="h-screen flex flex-col md:flex-row">
            <Sidebar />
            {/* Main content area */}
            <div
              className="flex-1 flex flex-col overflow-hidden"
              style={{ backgroundColor: '#faf6fc' }}
            >
              {/* Page content */}
              <main className="flex-1 overflow-auto p-5">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
