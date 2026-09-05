import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fff9ed] text-[#1a2b27] font-sans antialiased flex flex-col">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="relative z-50">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div className="pl-0 lg:pl-64 flex flex-col min-h-screen">
        <Navbar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
          <div className="max-w-[1440px] w-full mx-auto flex flex-col gap-6 mt-4">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};
