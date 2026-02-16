"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/lib/data/useTheme";

export default function ThemeSettingsTab() {
  const { currentTheme, presets, selectPreset, customizeColor, loading, saveTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<"presets" | "custom">("presets");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const initialThemeRef = useRef(currentTheme);

  // Track unsaved changes
  useEffect(() => {
    if (!loading && initialThemeRef.current) {
      const hasChanges = JSON.stringify(currentTheme.colors) !== JSON.stringify(initialThemeRef.current.colors);
      setHasUnsavedChanges(hasChanges);
    }
  }, [currentTheme, loading]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    const result = await saveTheme();

    if (result.success) {
      const message = (result as any).localOnly
        ? "Theme saved! ✓"
        : "Theme saved successfully!";

      setSaveMessage({ text: message, type: "success" });
      setHasUnsavedChanges(false);
      initialThemeRef.current = currentTheme;
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage({ text: result.error || "Failed to save theme", type: "error" });
    }

    setSaving(false);
  };

  const handlePresetSelect = async (presetId: string) => {
    selectPreset(presetId);
    // Auto-save when selecting a preset
    setTimeout(async () => {
      await saveTheme();
      setHasUnsavedChanges(false);
      initialThemeRef.current = currentTheme;
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Theme Settings</h2>
          <p className="text-sm text-slate-600 mt-1">
            Customize the look and feel of your game board
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span
              className={`text-sm font-semibold ${
                saveMessage.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {saveMessage.text}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              hasUnsavedChanges && !saving
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving..." : hasUnsavedChanges ? "Save Theme ●" : "Saved ✓"}
          </button>
        </div>
      </div>

      {/* Section Toggle */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSection("presets")}
          className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
            activeSection === "presets"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Preset Themes
        </button>
        <button
          onClick={() => setActiveSection("custom")}
          className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
            activeSection === "custom"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Custom Colors
        </button>
      </div>

      {/* Current Theme Display */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
          Current Theme
        </p>
        <p className="text-lg font-bold text-slate-900">{currentTheme.name}</p>
        <div className="flex gap-2 mt-3">
          {Object.entries(currentTheme.colors).map(([key, value]) => (
            <div
              key={key}
              className="w-8 h-8 rounded border border-slate-300 shadow-sm"
              style={{ backgroundColor: value }}
              title={`${key}: ${value}`}
            />
          ))}
        </div>
      </div>

      {/* Preset Themes */}
      {activeSection === "presets" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handlePresetSelect(theme.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                currentTheme.id === theme.id
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">{theme.name}</h3>
                {currentTheme.id === theme.id && (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-900 text-white font-semibold">
                    Active
                  </span>
                )}
              </div>

              {/* Color swatches */}
              <div className="flex gap-1.5">
                {Object.entries(theme.colors).slice(0, 6).map(([key, value]) => (
                  <div
                    key={key}
                    className="w-6 h-6 rounded border border-slate-300"
                    style={{ backgroundColor: value }}
                  />
                ))}
              </div>

              {/* Preview mini board */}
              <div className="mt-3 p-2 rounded-lg" style={{ backgroundColor: theme.colors.boardBackground }}>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-video rounded text-center flex items-center justify-center text-[10px] font-bold border"
                      style={{
                        backgroundColor: theme.colors.tileBackground,
                        color: theme.colors.tileText,
                        borderColor: theme.colors.tileBorder,
                      }}
                    >
                      ${i}00
                    </div>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Custom Colors */}
      {activeSection === "custom" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Customize individual colors with hex codes. Click "Save Theme" when you're done.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(currentTheme.colors).map(([key, value]) => (
              <div key={key} className="bg-white border border-slate-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </label>
                <div className="flex gap-3 items-center">
                  {/* Color preview */}
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-slate-300 shadow-sm flex-shrink-0"
                    style={{ backgroundColor: value }}
                  />

                  {/* Hex input */}
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      const hex = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
                        customizeColor(key as any, hex);
                      }
                    }}
                    placeholder="#000000"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    maxLength={7}
                  />

                  {/* HTML5 color picker */}
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => customizeColor(key as any, e.target.value)}
                    className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Reset to preset */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 mb-3">
              Want to start fresh? Pick a preset theme and customize from there.
            </p>
            <div className="flex gap-2 flex-wrap">
              {presets.slice(0, 4).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handlePresetSelect(theme.id)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Reset to {theme.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
