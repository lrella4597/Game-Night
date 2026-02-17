"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface JoinCodeProps {
  joinCode: string;
  sessionId: string;
}

export default function JoinCode({ joinCode, sessionId }: JoinCodeProps) {
  const [baseUrl, setBaseUrl] = useState("");
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [networkIp, setNetworkIp] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    setIsLocalhost(isLocal);

    if (isLocal) {
      // Fetch the server's network IP
      fetch("/api/live/network-ip")
        .then((r) => r.json())
        .then((data) => {
          if (data.ip) {
            setNetworkIp(data.ip);
            setBaseUrl(`http://${data.ip}:${window.location.port}`);
          } else {
            setBaseUrl(window.location.origin);
          }
        })
        .catch(() => setBaseUrl(window.location.origin));
    } else {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const joinUrl = baseUrl ? `${baseUrl}/live/play?code=${joinCode}` : "";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* QR Code */}
      {joinUrl && (
        <div className="bg-white p-4 rounded-2xl shadow-lg">
          <QRCodeSVG
            value={joinUrl}
            size={200}
            bgColor="#ffffff"
            fgColor="#060CE9"
            level="M"
          />
        </div>
      )}

      {/* Join Code */}
      <div className="text-center">
        <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">
          Join Code
        </p>
        <p className="text-5xl md:text-7xl font-mono font-bold text-[#FFD700] tracking-[0.3em]">
          {joinCode}
        </p>
      </div>

      {/* URL */}
      <p className="text-blue-300/60 text-xs">
        {joinUrl}
      </p>

      {isLocalhost && !networkIp && (
        <p className="text-yellow-300/80 text-xs text-center max-w-xs">
          Players must be on the same WiFi network. Open this page using your computer&apos;s IP instead of localhost.
        </p>
      )}
    </div>
  );
}
