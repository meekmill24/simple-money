import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Simple Money - Smart Money Management Made Simple",
  description:
    "Take control of your finances with Simple Money. Track spending, set budgets, and achieve your financial goals with our intuitive money management platform.",
  keywords: [
    "money management",
    "budgeting",
    "finance",
    "spending tracker",
    "financial planning",
  ],
  openGraph: {
    title: "Simple Money - Smart Money Management Made Simple",
    description:
      "Take control of your finances with Simple Money. Track spending, set budgets, and achieve your financial goals.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf9f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
