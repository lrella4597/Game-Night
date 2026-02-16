"use client";

export default function KeyboardShortcutsTab() {
  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { keys: ["↑", "↓", "←", "→"], description: "Navigate between tiles on the game board" },
        { keys: ["Enter"], description: "Select/open the highlighted tile" },
        { keys: ["Esc"], description: "Close modal or cancel action" },
      ],
    },
    {
      category: "Gameplay",
      items: [
        { keys: ["Space"], description: "Reveal answer / Submit response" },
        { keys: ["1-9"], description: "Quick select team 1-9" },
        { keys: ["Enter"], description: "Confirm selection" },
      ],
    },
    {
      category: "Controls",
      items: [
        { keys: ["S"], description: "Toggle sound effects on/off" },
        { keys: ["H", "?"], description: "Show/hide help" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Keyboard Shortcuts</h2>
        <p className="text-sm text-slate-600 mt-1">
          Speed up your gameplay with keyboard controls
        </p>
      </div>

      {/* Shortcuts List */}
      {shortcuts.map((section) => (
        <div key={section.category} className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">{section.category}</h3>
          <div className="space-y-3">
            {section.items.map((shortcut, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {shortcut.keys.map((key, keyIdx) => (
                    <kbd
                      key={keyIdx}
                      className="px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-slate-50 font-mono text-sm font-semibold text-slate-700 shadow-sm min-w-[2.5rem] text-center"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
                <p className="text-sm text-slate-600 flex-1">{shortcut.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Pro Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
          <span>💡</span> Pro Tips
        </h3>
        <ul className="space-y-2 text-sm text-purple-800">
          <li className="flex gap-2">
            <span>•</span>
            <span>
              Shortcuts are disabled when typing in text fields (so you can type normally)
            </span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Use arrow keys + Enter for lightning-fast tile selection</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Press number keys (1-9) to instantly select a team without clicking</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Hold Shift while using shortcuts for additional actions (coming soon!)</span>
          </li>
        </ul>
      </div>

      {/* Visual Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Quick Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Arrow Keys Visual */}
          <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Tile Navigation
            </p>
            <div className="flex flex-col items-center gap-1">
              <kbd className="px-4 py-2 rounded-lg border-2 border-slate-300 bg-white font-mono text-lg font-semibold text-slate-700 shadow-md">
                ↑
              </kbd>
              <div className="flex gap-1">
                <kbd className="px-4 py-2 rounded-lg border-2 border-slate-300 bg-white font-mono text-lg font-semibold text-slate-700 shadow-md">
                  ←
                </kbd>
                <kbd className="px-4 py-2 rounded-lg border-2 border-slate-300 bg-white font-mono text-lg font-semibold text-slate-700 shadow-md">
                  ↓
                </kbd>
                <kbd className="px-4 py-2 rounded-lg border-2 border-slate-300 bg-white font-mono text-lg font-semibold text-slate-700 shadow-md">
                  →
                </kbd>
              </div>
            </div>
          </div>

          {/* Number Keys Visual */}
          <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Team Selection
            </p>
            <div className="flex gap-1 flex-wrap justify-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <kbd
                  key={num}
                  className="px-3 py-2 rounded-lg border-2 border-slate-300 bg-white font-mono text-sm font-semibold text-slate-700 shadow-sm"
                >
                  {num}
                </kbd>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
