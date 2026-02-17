interface ConnectionStatusProps {
  connected: boolean;
}

export default function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          connected
            ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]"
            : "bg-red-400 animate-pulse"
        }`}
      />
      <span className={`text-xs ${connected ? "text-green-300" : "text-red-300"}`}>
        {connected ? "Connected" : "Connecting..."}
      </span>
    </div>
  );
}
