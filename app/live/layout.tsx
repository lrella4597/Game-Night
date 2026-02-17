import type { Metadata } from "next";
import LiveNavBar from "@/app/components/live/shared/LiveNavBar";

export const metadata: Metadata = {
  title: "Classic Jeopardy Live",
  description: "Host or join a live Jeopardy game",
};

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#060CE9] text-white">
      <LiveNavBar />
      {children}
    </div>
  );
}
