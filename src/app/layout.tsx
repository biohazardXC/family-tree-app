import type { Metadata } from "next";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Rooted — your family tree",
  description: "Build, explore and grow your family tree together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
