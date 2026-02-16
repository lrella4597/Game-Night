export default function HelpContent() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3">Welcome to Jeopardy Game Night! 🎮</h3>
        <p className="text-slate-700 leading-relaxed">
          Create custom AI-generated Jeopardy boards, manage teams, track stats, and have an amazing game night with friends and family!
        </p>
      </section>

      {/* Getting Started */}
      <section>
        <h4 className="text-lg font-semibold text-slate-900 mb-2">🚀 Getting Started</h4>
        <ol className="list-decimal list-inside space-y-2 text-slate-700">
          <li><strong>Create Teams:</strong> Go to the Setup tab to create teams and add players</li>
          <li><strong>Generate Board:</strong> Click "Generate New Board" or create custom categories</li>
          <li><strong>Start Playing:</strong> Click questions to reveal them, award points to teams</li>
          <li><strong>Track Stats:</strong> View player performance in the Stats tab</li>
        </ol>
      </section>

      {/* Main Features */}
      <section>
        <h4 className="text-lg font-semibold text-slate-900 mb-2">✨ Main Features</h4>

        <div className="space-y-3">
          <div>
            <h5 className="font-semibold text-slate-800">🎲 Board Tab</h5>
            <ul className="list-disc list-inside ml-4 text-slate-700 space-y-1">
              <li>Click any question tile to open it</li>
              <li>Award points to teams by clicking their buttons</li>
              <li>Click the refresh icon (🔄) on a column to regenerate specific questions</li>
              <li>Long-press or right-click tiles for quick actions</li>
              <li>Questions track which teams have answered them</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-slate-800">⚙️ Setup Tab</h5>
            <ul className="list-disc list-inside ml-4 text-slate-700 space-y-1">
              <li>Create and manage teams</li>
              <li>Add/remove players from teams</li>
              <li>Set point values for each row (100-1000)</li>
              <li>Choose game mode (standard or custom points)</li>
              <li>Enable/disable timers and buzzer mode</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-slate-800">📊 Stats Tab</h5>
            <ul className="list-disc list-inside ml-4 text-slate-700 space-y-1">
              <li>View detailed player statistics</li>
              <li>See accuracy percentages and total points</li>
              <li>Review answer history for each player</li>
              <li>Export stats or reset data</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-slate-800">📚 Categories Tab</h5>
            <ul className="list-disc list-inside ml-4 text-slate-700 space-y-1">
              <li>Create custom category templates with AI prompts</li>
              <li>Save frequently-used categories to your library</li>
              <li>Edit prompts to fine-tune question generation</li>
              <li>Mix custom and AI-generated categories on the same board</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-slate-800">⭐ Favorites Tab</h5>
            <ul className="list-disc list-inside ml-4 text-slate-700 space-y-1">
              <li>Bookmark your best questions</li>
              <li>Review and reuse favorite clues</li>
              <li>Export favorites to share with others</li>
            </ul>
          </div>
        </div>
      </section>

      {/* AI Generation */}
      <section>
        <h4 className="text-lg font-semibold text-slate-900 mb-2">🤖 AI Generation</h4>
        <ul className="list-disc list-inside ml-4 text-slate-700 space-y-1">
          <li><strong>Smart Anti-Repeat:</strong> The AI tracks all previously seen answers and avoids duplicates</li>
          <li><strong>Refresh Questions:</strong> Don't like a question? Click refresh to generate a new one</li>
          <li><strong>Custom Prompts:</strong> Create detailed category instructions to get exactly the questions you want</li>
          <li><strong>Difficulty Levels:</strong> Lower point values = easier questions, higher = harder</li>
          <li><strong>Auto-Save:</strong> All your boards, stats, and preferences sync to the cloud</li>
        </ul>
      </section>

      {/* Tips & Tricks */}
      <section>
        <h4 className="text-lg font-semibold text-slate-900 mb-2">💡 Tips & Tricks</h4>
        <ul className="list-disc list-inside ml-4 text-slate-700 space-y-1">
          <li>Click a category title to view/edit all questions in that column</li>
          <li>Use the fact-check feature to verify AI-generated answers</li>
          <li>Save boards for later or share them with friends</li>
          <li>Enable buzzer mode for authentic Jeopardy gameplay</li>
          <li>Track individual player stats to crown the trivia champion</li>
          <li>Mix different point modes (100-500 or 200-1000) for variety</li>
        </ul>
      </section>

      {/* Keyboard Shortcuts */}
      <section>
        <h4 className="text-lg font-semibold text-slate-900 mb-2">⌨️ Keyboard Shortcuts</h4>
        <ul className="list-disc list-inside ml-4 text-slate-700 space-y-1">
          <li><kbd className="px-2 py-1 bg-slate-200 rounded text-sm">Esc</kbd> - Close any open modal</li>
          <li><kbd className="px-2 py-1 bg-slate-200 rounded text-sm">Tab</kbd> - Navigate between tabs</li>
          <li>Click team names quickly to award points</li>
        </ul>
      </section>

      {/* Support */}
      <section className="border-t border-slate-200 pt-4">
        <h4 className="text-lg font-semibold text-slate-900 mb-2">🆘 Need Help?</h4>
        <p className="text-slate-700">
          If you encounter any issues or have questions, you can access this help guide anytime by clicking the
          <strong> Help (❓)</strong> button in the top navigation area.
        </p>
      </section>
    </div>
  );
}
