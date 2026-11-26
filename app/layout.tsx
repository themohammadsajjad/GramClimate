import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GramClimate · Microclimate Intelligence",
  description: "Explore panchayat microclimate similarity with PCA and unsupervised clustering.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
