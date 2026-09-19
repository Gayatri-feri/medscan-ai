import React, { useState } from 'react';
import {
  LayoutDashboard,
  ScanLine,
  Pill,
  History,
  CalendarClock,
  FileSpreadsheet,
  Settings,
  Menu,
  X,
  ShieldCheck,
  Activity,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'scan'
  | 'records'
  | 'history'
  | 'expiry'
  | 'reports'
  | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  validCount?: number;
  expiringCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  validCount = 0,
  expiringCount = 0,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scan', label: 'Scan Medicine', icon: ScanLine, highlight: true },
    { id: 'records', label: 'Medicine Records', icon: Pill },
    {
      id: 'history',
      label: 'Scan History',
      icon: History,
    },
    {
      id: 'expiry',
      label: 'Expiry Management',
      icon: CalendarClock,
      badge: expiringCount > 0 ? expiringCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings & System', icon: Settings },
  ];

  const handleSelect = (tab: NavTab) => {
    onTabChange(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-teal-100 shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              MedScan AI
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                Medical
              </span>
            </h1>
          </div>
        </div>
        <button
          id="mobile-menu-toggle-btn"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Navigation Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-teal-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-teal-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center text-white shadow-sm ring-2 ring-teal-100">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-slate-900 tracking-tight">MedScan AI</span>
              </div>
              <p className="text-xs text-teal-700/80 font-medium">Medicine OCR & Intel</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle / Value proposition badge */}
        <div className="px-4 py-3 bg-teal-50/60 border-b border-teal-50">
          <p className="text-[11px] leading-relaxed text-teal-900/90 font-medium">
            Turn medicine package images into structured digital records.
          </p>
        </div>

        {/* Main Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelect(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs font-semibold'
                    : item.highlight
                    ? 'bg-teal-50 text-teal-800 hover:bg-teal-100/80 border border-teal-200/60'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-teal-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4.5 h-4.5 ${
                      isActive
                        ? 'text-white'
                        : item.highlight
                        ? 'text-teal-700'
                        : 'text-slate-500 group-hover:text-teal-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-teal-100 text-teal-800'}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Medical Safety Disclaimer Notice in Sidebar */}
        <div className="p-3 border-t border-teal-50 bg-slate-50/50">
          <div className="p-2.5 rounded-lg bg-white border border-teal-100 shadow-xs">
            <div className="flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 leading-tight">
                <strong>Medical Notice:</strong> MedScan AI extracts package information and is not a substitute for professional medical advice.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
