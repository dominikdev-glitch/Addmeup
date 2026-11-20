import React from 'react';
import { Logo } from './Logo';
import {
  OFFICIAL_EMAILS,
  OFFICIAL_WHATSAPP_NUMBER,
  OFFICIAL_WHATSAPP_URL,
  PublicPageId,
} from '../lib/contactConfig';
import { ArrowRight } from 'lucide-react';

interface PublicLayoutProps {
  activePage: 'home' | PublicPageId;
  onNavigate: (page: 'home' | PublicPageId) => void;
  onPrimaryCta: () => void;
  primaryCtaLabel?: string;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: 'home' | PublicPageId; label: string; href: string }[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'about', label: 'About', href: '/about' },
  { id: 'partnership', label: 'Partnerships', href: '/partnership' },
  { id: 'faq', label: 'FAQ', href: '/faq' },
  { id: 'contact', label: 'Contact', href: '/contact' },
];

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  activePage,
  onNavigate,
  onPrimaryCta,
  primaryCtaLabel = 'Open App',
  children,
}) => {
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    target: 'home' | PublicPageId
  ) => {
    e.preventDefault();
    onNavigate(target);
  };

  return (
    <div className="min-h-screen bg-[#fffaf0] text-slate-800 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Three-Zone Top Bar */}
      <header className="sticky top-0 z-40 glass-header text-slate-800 border-b border-orange-100/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-6">
          {/* Zone 1: Single Brand Lockup */}
          <a
            href="/"
            onClick={(e) => handleNavClick(e, 'home')}
            className="flex items-center shrink-0 hover:opacity-90 transition-opacity"
          >
            <Logo size="md" showText={true} />
          </a>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activePage === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.id)}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    isActive
                      ? 'text-slate-900 border-orange-500 font-bold'
                      : 'border-transparent hover:text-slate-900 hover:border-orange-300'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onPrimaryCta}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              <span>{primaryCtaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Page Body */}
      <main className="flex-1 w-full">
        <div className="md:hidden border-b border-orange-100/80 bg-white/70">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-bold text-slate-600">
            {NAV_ITEMS.map((item) => {
              const isActive = activePage === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.id)}
                  className={`whitespace-nowrap shrink-0 py-1 ${
                    isActive ? 'text-orange-600 underline underline-offset-4' : 'hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
        {children}
      </main>

      {/* Multi-Column Editorial Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 text-slate-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-slate-200/80">
            {/* Column 1: Brand Summary */}
            <div className="space-y-3">
              <Logo size="sm" showText={true} />
              <p className="text-xs leading-relaxed text-slate-500">
                AddMeUp connects everyday creators, businesses, and community members on Snapchat and WhatsApp through transparent, points-based handle discovery.
              </p>
              <p className="text-xs font-semibold text-slate-700">
                Domain: <span className="text-orange-600">addmeup.ng</span>
              </p>
            </div>

            {/* Column 2: Explore */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold text-slate-900 tracking-wide">
                Company &amp; Programs
              </h3>
              <ul className="space-y-2 text-xs font-medium">
                <li>
                  <a
                    href="/"
                    onClick={(e) => handleNavClick(e, 'home')}
                    className="hover:text-orange-600 transition-colors"
                  >
                    Home &amp; Live Feed Preview
                  </a>
                </li>
                <li>
                  <a
                    href="/about"
                    onClick={(e) => handleNavClick(e, 'about')}
                    className="hover:text-orange-600 transition-colors"
                  >
                    About AddMeUp
                  </a>
                </li>
                <li>
                  <a
                    href="/partnership"
                    onClick={(e) => handleNavClick(e, 'partnership')}
                    className="hover:text-orange-600 transition-colors"
                  >
                    Brand &amp; Creator Partnerships
                  </a>
                </li>
                <li>
                  <a
                    href="/faq"
                    onClick={(e) => handleNavClick(e, 'faq')}
                    className="hover:text-orange-600 transition-colors"
                  >
                    Help Center &amp; FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Official Emails */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold text-slate-900 tracking-wide">
                Official Emails
              </h3>
              <ul className="space-y-2 text-xs font-medium">
                {OFFICIAL_EMAILS.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <a
                      href={`mailto:${item.address}`}
                      className="hover:text-orange-600 transition-colors font-semibold text-slate-700"
                    >
                      {item.address}
                    </a>
                    <span className="text-slate-400"> · {item.label.split('&')[0].trim()}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Legal & Direct Support */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold text-slate-900 tracking-wide">
                Legal &amp; Support
              </h3>
              <ul className="space-y-2 text-xs font-medium">
                <li>
                  <a
                    href="/contact"
                    onClick={(e) => handleNavClick(e, 'contact')}
                    className="hover:text-orange-600 transition-colors"
                  >
                    Contact &amp; Inquiry Desk
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy"
                    onClick={(e) => handleNavClick(e, 'privacy')}
                    className="hover:text-orange-600 transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    onClick={(e) => handleNavClick(e, 'terms')}
                    className="hover:text-orange-600 transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href={OFFICIAL_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-semibold hover:underline"
                  >
                    WhatsApp Support ({OFFICIAL_WHATSAPP_NUMBER})
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <p>
              AddMeUp © {new Date().getFullYear()} · Social Handle Exchange Platform (addmeup.ng)
            </p>
            <p>
              Independent platform; not affiliated with Snap Inc. (Snapchat) or Meta Platforms, Inc. (WhatsApp).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
