import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Pin Seeker | Game Night",
  description: "A new nine-hole golf course every day. Time your swing, beat your friends.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function GolfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
