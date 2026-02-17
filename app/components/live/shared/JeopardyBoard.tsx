"use client";

import type { BoardState } from "@/app/data/boardData";

interface JeopardyBoardProps {
  board: BoardState;
  cluesRevealed: string[];
  onSelectClue?: (catIdx: number, clueIdx: number, value: number) => void;
  interactive?: boolean;
}

export default function JeopardyBoard({
  board,
  cluesRevealed,
  onSelectClue,
  interactive = false,
}: JeopardyBoardProps) {
  const numRows = board.rowValues.length;
  const numCols = board.columns.length;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${numCols}, 1fr)`,
          gridTemplateRows: `auto repeat(${numRows}, 1fr)`,
        }}
      >
        {/* Category headers */}
        {board.columns.map((col, colIdx) => (
          <div
            key={`header-${colIdx}`}
            className="bg-[#060CE9] border-2 border-[#1a1aff] p-2 text-center"
          >
            <span className="text-[#FFD700] font-bold text-xs md:text-sm uppercase leading-tight">
              {col.title}
            </span>
          </div>
        ))}

        {/* Clue cells */}
        {board.rowValues.map((rowVal, rowIdx) =>
          board.columns.map((col, colIdx) => {
            const clueKey = `${colIdx}-${rowIdx}`;
            const isRevealed = cluesRevealed.includes(clueKey);
            const question = col.questions[rowIdx];

            return (
              <button
                key={clueKey}
                disabled={isRevealed || !interactive}
                onClick={() => {
                  if (interactive && !isRevealed && onSelectClue && question) {
                    onSelectClue(colIdx, rowIdx, question.value);
                  }
                }}
                className={`
                  aspect-[4/3] flex items-center justify-center border-2 border-[#1a1aff] text-xl md:text-2xl font-bold transition-all
                  ${
                    isRevealed
                      ? "bg-[#060CE9]/40 text-transparent"
                      : interactive
                      ? "bg-[#060CE9] text-[#FFD700] hover:bg-[#0810ff] hover:scale-105 cursor-pointer"
                      : "bg-[#060CE9] text-[#FFD700]"
                  }
                `}
              >
                {isRevealed ? "" : `$${rowVal}`}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
