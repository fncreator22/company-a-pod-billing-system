"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function ShellLayout({ children }) {
  const pathname = usePathname();
  // Driver routes are standalone mobile PWA views without desktop sidebar
  const isDriverRoute = pathname.startsWith("/driver");

  if (isDriverRoute) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
