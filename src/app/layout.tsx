import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppHeader } from "@/components/AppHeader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpiritLife Devotional",
  description:
    "Daily devotionals from The Spirit Life C. & S. Church — read each day and keep your streak.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpiritLife",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F0A1E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} dark`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: browser extensions (e.g. Liner) inject
          attributes like data-be-installed / data-liner-extension-version onto
          <body> before React hydrates, which would otherwise trip a false
          hydration mismatch. This only suppresses the warning for these two
          elements' attributes, not for real content mismatches deeper down. */}
      <body className="font-sans" suppressHydrationWarning>
        {/* App shell: fixed header + scrollable content region below it. */}
        <div className="app-shell">
          <AppHeader />
          <main className="app-scroll">{children}</main>
        </div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
