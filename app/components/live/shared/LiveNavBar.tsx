"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function LiveNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmExit, setConfirmExit] = useState(false);

  // Don't show on the live landing page itself
  if (pathname === "/live") return null;

  const isInGame = pathname.includes("/host/") || pathname.includes("/play/");

  function handleExit() {
    if (isInGame && !confirmExit) {
      setConfirmExit(true);
      setTimeout(() => setConfirmExit(false), 3000);
      return;
    }
    router.push("/");
  }

  return (
    <div className="fixed top-3 left-3 z-50">
      <button
        onClick={handleExit}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all backdrop-blur-sm ${
          confirmExit
            ? "bg-red-600/90 text-white"
            : "bg-black/30 text-white/70 hover:text-white hover:bg-black/50"
        }`}
      >
        {confirmExit ? "Tap again to leave" : "Exit"}
      </button>
    </div>
  );
}
