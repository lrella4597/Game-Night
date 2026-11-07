import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Permanent_Marker } from "next/font/google";

const chalk = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-chalk",
});

export const metadata: Metadata = {
  title: "Day of Deception",
  description: "All-day social deduction event",
  // iPhone home screen app: full screen, own icon and name
  appleWebApp: {
    capable: true,
    title: "Deception",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1f14",
  viewportFit: "cover",
};

export default function TraitorsDayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${chalk.variable} min-h-screen w-full bg-[#1a1f14] text-white`}>
      {/* Nav bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-[#1a1f14]/90 backdrop-blur border-b border-green-900/30">
        <Link
          href="/day-of-deception"
          className="text-sm font-bold text-green-400 hover:text-green-300 transition-colors"
        >
          Day of Deception
        </Link>
        <Link
          href="/"
          className="text-xs text-green-400/60 hover:text-green-300 transition-colors"
        >
          Exit
        </Link>
      </nav>
      <div className="pt-[calc(3rem+env(safe-area-inset-top))]">{children}</div>
    </div>
  );
}
