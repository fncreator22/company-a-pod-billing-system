import "./globals.css";
import ShellLayout from "@/components/ShellLayout";

export const metadata = {
  title: "Road Transport POD Management System",
  description: "Mobile-first PWA for POD capture, verification, review, and billing.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
