import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Instrument_Serif } from "next/font/google";
import { Icon } from "@/app/components/day-of-deception/ui";

const displayFont = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
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
  themeColor: "#0A0A0D",
  viewportFit: "cover",
};

export default function TraitorsDayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${displayFont.variable} min-h-screen w-full bg-[#0A0A0D] text-white antialiased`}>
      <nav className="fixed top-0 inset-x-0 z-40 border-b border-white/[0.06] bg-[#0A0A0D]/75 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/day-of-deception" className="flex items-center gap-2.5 text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8C67A]/12 text-[#E8C67A] ring-1 ring-[#E8C67A]/25">
              <Icon name="mask" className="h-4 w-4" />
            </span>
            <span className="font-[family-name:var(--font-display)] text-[19px] leading-none">Day of Deception</span>
          </Link>
          <Link
            href="/day-of-deception"
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white hover:border-white/20"
          >
            My games
          </Link>
        </div>
      </nav>
      <div className="pt-[calc(3.5rem+env(safe-area-inset-top))]">{children}</div>
    </div>
  );
}
