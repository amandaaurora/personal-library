'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BookOpen, Search, Upload, LayoutDashboard, Settings } from 'lucide-react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }));

  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/books/add', icon: BookOpen, label: 'Add Book' },
    { href: '/search', icon: Search, label: 'AI Search' },
    { href: '/import', icon: Upload, label: 'Import' },
  ];

  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <div className="h-screen flex">
            {/* Sidebar - white */}
            <aside
              className="w-56 flex-shrink-0 flex flex-col border-r hidden md:flex"
              style={{ backgroundColor: '#ffffff', borderColor: '#1a1a1a' }}
            >
              {/* Logo */}
              <div className="p-5 border-b" style={{ borderColor: '#1a1a1a' }}>
                <Link href="/" className="flex items-center gap-2.5">
                  <BookOpen className="h-5 w-5" style={{ color: '#1a1a1a' }} />
                  <span className="text-base font-bold" style={{ color: '#1a1a1a' }}>
                    MyLibrary
                  </span>
                </Link>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: '#999' }}>
                  Menu
                </div>
                <div className="space-y-0.5">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-item ${isActive ? 'active' : ''}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Settings at bottom */}
              <div className="p-3 border-t" style={{ borderColor: '#1a1a1a' }}>
                <Link href="/settings" className="sidebar-item">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </div>
            </aside>

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#faf6fc' }}>
              {/* Mobile header */}
              <header
                className="h-14 flex-shrink-0 flex md:hidden items-center justify-between px-4 border-b"
                style={{ backgroundColor: '#ffffff', borderColor: '#1a1a1a' }}
              >
                <Link href="/" className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" style={{ color: '#1a1a1a' }} />
                  <span className="font-bold" style={{ color: '#1a1a1a' }}>MyLibrary</span>
                </Link>
              </header>

              {/* Page content */}
              <main className="flex-1 overflow-auto p-5">
                {children}
              </main>
            </div>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
