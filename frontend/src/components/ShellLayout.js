"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function ShellLayout({ children }) {
  const pathname = usePathname();
  // Driver routes and public upload routes are standalone views without the executive sidebar
  const isStandaloneRoute = pathname.startsWith("/driver") || pathname.startsWith("/upload") || pathname.startsWith("/portal");

  if (isStandaloneRoute) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-50 font-sans">
      <Sidebar />
      <main className="flex-1 w-full overflow-y-auto">{children}</main>
    </div>
  );
}
