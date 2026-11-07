"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Download, UploadCloud, Truck, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Operations Dashboard", icon: LayoutDashboard },
    { href: "/review", label: "Exception Review Queue", icon: FileText },
    { href: "/billing", label: "Billing Queue & Export", icon: Download },
    { href: "/trips/import", label: "Import Trips (CSV)", icon: UploadCloud },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 p-5 flex flex-col justify-between flex-shrink-0 min-h-screen border-r border-slate-800">
      <div>
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 text-white font-bold text-lg">
          <Truck className="w-6 h-6 text-blue-500" />
          <span>FastTrack Fleet</span>
        </Link>

        {/* Navigation Items */}
        <nav className="space-y-1.5 text-sm font-medium">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Switcher */}
      <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 space-y-2">
        <div>
          <p className="font-semibold text-slate-200">Billing Executive</p>
          <p className="text-[11px] text-slate-500">Rajesh Sharma • Chhatrapati Sambhajinagar</p>
        </div>
        <Link
          href="/driver"
          className="mt-2 block bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 px-3 py-2 rounded-lg text-center font-medium transition-colors"
        >
          📱 Switch to Mobile Driver App
        </Link>
      </div>
    </aside>
  );
}
