'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Search, Upload, LayoutDashboard, Settings, Copy } from 'lucide-react';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/books/add', icon: BookOpen, label: 'Add Book' },
  { href: '/search', icon: Search, label: 'AI Search' },
  { href: '/import', icon: Upload, label: 'Import' },
  { href: '/duplicates', icon: Copy, label: 'Duplicates' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
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
          <div
            className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-2"
            style={{ color: '#999' }}
          >
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

      {/* Mobile header */}
      <header
        className="h-14 flex-shrink-0 flex md:hidden items-center justify-between px-4 border-b"
        style={{ backgroundColor: '#ffffff', borderColor: '#1a1a1a' }}
      >
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" style={{ color: '#1a1a1a' }} />
          <span className="font-bold" style={{ color: '#1a1a1a' }}>
            MyLibrary
          </span>
        </Link>
      </header>
    </>
  );
}
