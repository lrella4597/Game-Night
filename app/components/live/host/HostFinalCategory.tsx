"use client";

interface HostFinalCategoryProps {
  category: string;
  onProceedToWager: () => void;
}

export default function HostFinalCategory({ category, onProceedToWager }: HostFinalCategoryProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-4">
      <h2 className="text-3xl font-bold text-blue-200 tracking-wider uppercase">Final Jeopardy!</h2>

      <div className="bg-[#060CE9] border-4 border-[#FFD700] rounded-2xl p-12 max-w-2xl w-full text-center shadow-2xl">
        <p className="text-sm text-blue-300 uppercase tracking-widest mb-4">The Category Is...</p>
        <h3 className="text-4xl md:text-5xl font-bold text-[#FFD700] leading-tight">{category}</h3>
      </div>

      <button
        onClick={onProceedToWager}
        className="px-8 py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg"
      >
        Open Wagering
      </button>
    </div>
  );
}
