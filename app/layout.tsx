import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "my-team-success",
  description: "Shared work tracking for weekly team progress",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-950 antialiased">{children}</body>
    </html>
  );
}
