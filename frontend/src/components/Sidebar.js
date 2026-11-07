"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileCheck2, 
  ReceiptText, 
  UploadCloud, 
  Truck, 
  Menu, 
  X, 
  ArrowUpRight,
  ShieldCheck
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Operations Dashboard", icon: LayoutDashboard },
    { href: "/review", label: "Exception Review Queue", icon: FileCheck2 },
    { href: "/billing", label: "Billing & Tally Export", icon: ReceiptText },
    { href: "/trips/import", label: "Import Daily Schedule", icon: UploadCloud },
  ];

  return (
    <>
      {/* Mobile Bar for Executive Screens */}
      <header className="lg:hidden flex items-center justify-between px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 text-zinc-100 w-full sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Truck className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold tracking-wide">Company A Logistics</span>
        </Link>
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800"
          aria-label="Toggle navigation"
        >
          {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {/* Backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Primary Desktop / Tablet Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-zinc-950 text-zinc-300 p-5 flex flex-col justify-between border-r border-zinc-850 transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-zinc-850">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shadow-inner">
                <Truck className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="block text-sm font-bold text-zinc-100 tracking-tight">Company A Fleet</span>
                <span className="text-[10px] text-zinc-500 font-mono">Chhatrapati Sambhajinagar</span>
              </div>
            </Link>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-3 block mb-2 font-semibold">
              Workspaces
            </span>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-zinc-900 text-amber-400 font-semibold border border-zinc-800 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-400" : "text-zinc-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Profile & Driver Switcher */}
        <div className="pt-4 border-t border-zinc-850 text-xs space-y-3">
          <div className="px-3 py-2 rounded-xl bg-zinc-900/70 border border-zinc-850">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-mono">OPERATOR</span>
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <p className="font-semibold text-zinc-200 mt-0.5 text-xs">Rajesh Sharma</p>
            <p className="text-[10px] text-zinc-500">Billing & Exception Desk</p>
          </div>

          <Link
            href="/driver"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 text-amber-300 font-medium text-xs transition-colors"
          >
            <span>📱 Driver View</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
          </Link>
        </div>
      </aside>
    </>
  );
}
