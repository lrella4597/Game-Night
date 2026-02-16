export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="relative w-12 h-12">
        {/* Spinning circle */}
        <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-slate-600 text-sm">{message}</p>
    </div>
  );
}
