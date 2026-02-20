"use client";

import { useState } from "react";
import { useCategoryLibrary, type CategoryPrompt } from "@/lib/data/useCategoryLibrary";
import { DEFAULT_LIBRARY } from "../data/categoryLibrary";
import LoadingSpinner from "./LoadingSpinner";

type FormMode = { type: "add" } | { type: "edit"; id: string } | null;

const EMPTY_FORM = {
  name: "",
  promptTemplate: "",
  difficultyGuidance: "",
  answerFormatGuidance: "",
  examples: "",
};

export default function CategoriesTab() {
  const { categories, saveCategory, updateCategory, deleteCategory: deleteCategoryFromDb, loading } = useCategoryLibrary();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishDescription, setPublishDescription] = useState("");
  const [publishingInProgress, setPublishingInProgress] = useState(false);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [publishError, setPublishError] = useState<string | null>(null);

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // ── Duplicate detection ──────────────────────────────────────────────────────

  // Group categories by name to find duplicates
  const duplicateGroups = categories.reduce((groups, cat) => {
    const key = cat.name.trim().toUpperCase();
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(cat);
    return groups;
  }, {} as Record<string, typeof categories>);

  // Filter to only groups with 2+ items (actual duplicates)
  const actualDuplicates = Object.entries(duplicateGroups).filter(([_, cats]) => cats.length > 1);
  const totalDuplicateCount = actualDuplicates.reduce((sum, [_, cats]) => sum + cats.length, 0);
  const duplicateIdsSet = new Set(actualDuplicates.flatMap(([_, cats]) => cats.map(c => c.id)));

  function selectAllDuplicates() {
    setSelectedIds(new Set(duplicateIdsSet));
  }

  function selectDuplicatesOfName(name: string) {
    const group = duplicateGroups[name];
    if (group) {
      setSelectedIds(new Set(group.map(c => c.id)));
    }
  }

  function selectDuplicatesKeepOne() {
    // For each duplicate group, keep the first one and select the rest
    const idsToSelect: string[] = [];

    actualDuplicates.forEach(([_, cats]) => {
      // Skip the first one (keep it), select all others
      cats.slice(1).forEach(cat => {
        idsToSelect.push(cat.id);
      });
    });

    setSelectedIds(new Set(idsToSelect));
  }

  // ── Publish ─────────────────────────────────────────────────────────────────

  function startPublish(id: string) {
    setPublishingId(id);
    setPublishDescription("");
    setPublishError(null);
    setFormMode(null);
    setDeleteConfirmId(null);
  }

  async function handlePublish(categoryId: string) {
    setPublishingInProgress(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/community/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          description: publishDescription.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.error || "Failed to publish");
      } else {
        setPublishedIds((prev) => new Set(prev).add(categoryId));
        setPublishingId(null);
      }
    } catch {
      setPublishError("Failed to publish category");
    } finally {
      setPublishingInProgress(false);
    }
  }

  // ── Form handling ────────────────────────────────────────────────────────────

  function openAddForm() {
    setFormData(EMPTY_FORM);
    setFormMode({ type: "add" });
    setDeleteConfirmId(null);
  }

  function openEditForm(item: CategoryPrompt) {
    setFormData({
      name: item.name,
      promptTemplate: item.promptTemplate,
      difficultyGuidance: item.difficultyGuidance,
      answerFormatGuidance: item.answerFormatGuidance,
      examples: item.examples,
    });
    setFormMode({ type: "edit", id: item.id });
    setDeleteConfirmId(null);
  }

  function closeForm() {
    setFormMode(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSubmit() {
    const name = formData.name.trim().toUpperCase();
    if (!name) return;

    if (formMode?.type === "add") {
      await saveCategory({
        name,
        promptTemplate: formData.promptTemplate.trim(),
        difficultyGuidance: formData.difficultyGuidance.trim(),
        answerFormatGuidance: formData.answerFormatGuidance.trim(),
        examples: formData.examples.trim(),
      });
    } else if (formMode?.type === "edit") {
      const category = categories.find((c) => c.id === formMode.id);
      if (category) {
        await updateCategory({
          ...category,
          name,
          promptTemplate: formData.promptTemplate.trim(),
          difficultyGuidance: formData.difficultyGuidance.trim(),
          answerFormatGuidance: formData.answerFormatGuidance.trim(),
          examples: formData.examples.trim(),
        });
      }
    }
    closeForm();
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === categories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map((c) => c.id)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  function requestDelete(id: string) {
    setDeleteConfirmId(id);
    setFormMode(null);
  }

  async function confirmDelete(id: string) {
    await deleteCategoryFromDb(id);
    setDeleteConfirmId(null);
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;

    for (const id of selectedIds) {
      await deleteCategoryFromDb(id);
    }

    clearSelection();
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  async function handleResetToDefaults() {
    if (
      window.confirm(
        "Reset the category library to the 6 default categories? This cannot be undone."
      )
    ) {
      // Delete all existing categories
      for (const cat of categories) {
        await deleteCategoryFromDb(cat.id);
      }
      // Add default categories
      for (const cat of DEFAULT_LIBRARY) {
        await saveCategory({
          name: cat.name,
          promptTemplate: cat.promptTemplate,
          difficultyGuidance: cat.difficultyGuidance,
          answerFormatGuidance: cat.answerFormatGuidance,
          examples: cat.examples,
        });
      }
      closeForm();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  // Show loading state while data is loading
  if (loading) {
    return <LoadingSpinner message="Loading categories..." />;
  }

  return (
    <div className="w-full max-w-3xl flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Categories Library
          </h2>
          <p className="text-slate-600 text-sm mt-0.5">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} ·
            each category stores the prompt used for AI question generation
            {selectedIds.size > 0 && (
              <span className="ml-2 font-semibold text-accent">
                · {selectedIds.size} selected
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 ? (
            <>
              <button
                onClick={clearSelection}
                className="btn-secondary hover:bg-slate-50"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg font-semibold text-sm bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Delete Selected ({selectedIds.size})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleResetToDefaults}
                className="btn-secondary hover:bg-slate-50"
              >
                Reset Defaults
              </button>
              <button
                onClick={openAddForm}
                className="btn-primary"
              >
                Add Category
              </button>
            </>
          )}
        </div>
      </div>

      {/* Duplicate Detection Panel */}
      {actualDuplicates.length > 0 && (
        <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Duplicate Categories Detected
              </p>
              <p className="text-xs text-orange-800 mt-1">
                Found {totalDuplicateCount} categories across {actualDuplicates.length} duplicate name{actualDuplicates.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-orange-700 mt-1 font-medium">
                💡 Tip: Use "Keep One of Each" to automatically clean up duplicates
              </p>
            </div>
            <button
              onClick={() => setShowDuplicates(!showDuplicates)}
              className="btn-secondary hover:bg-orange-100 text-xs"
            >
              {showDuplicates ? "Hide" : "Show"} Details
            </button>
          </div>

          {showDuplicates && (
            <div className="flex flex-col gap-3 pt-2 border-t border-orange-200">
              {/* Quick Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={selectDuplicatesKeepOne}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm"
                >
                  Keep One of Each, Delete Rest ({totalDuplicateCount - actualDuplicates.length})
                </button>
                <button
                  onClick={selectAllDuplicates}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm bg-orange-600 text-white hover:bg-orange-700 transition-all"
                >
                  Select All {totalDuplicateCount} Duplicates
                </button>
              </div>

              {/* Individual Duplicate Groups */}
              <div className="flex flex-col gap-2 pt-2 border-t border-orange-200">
                <p className="text-xs font-semibold text-orange-900">Or select by name:</p>
                {actualDuplicates.map(([name, cats]) => (
                  <div key={name} className="flex items-center justify-between gap-4 p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">{name}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {cats.length} duplicate{cats.length !== 1 ? "s" : ""} found
                      </p>
                    </div>
                    <button
                      onClick={() => selectDuplicatesOfName(name)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-orange-300 text-orange-700 hover:bg-orange-100 transition-all"
                    >
                      Select All {cats.length}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5 flex flex-col gap-4">
          <p className="text-sm text-red-900">
            <strong>Delete {selectedIds.size} categor{selectedIds.size === 1 ? "y" : "ies"}?</strong>
            <br />
            This action cannot be undone. Board columns using these categories will show as Unassigned.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleBulkDelete}
              className="flex-1 px-4 py-2 rounded-lg font-semibold text-sm bg-red-600 text-white hover:bg-red-700 transition-all"
            >
              Yes, Delete {selectedIds.size} Categor{selectedIds.size === 1 ? "y" : "ies"}
            </button>
            <button
              onClick={() => setShowBulkDeleteConfirm(false)}
              className="flex-1 btn-secondary hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {formMode && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
          <p className="text-xs font-semibold tracking-tight text-slate-700">
            {formMode.type === "add" ? "New Category" : "Edit Category"}
          </p>

          {/* Name */}
          <FormField label="Name *">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. SCIENCE"
              maxLength={40}
              className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-slate-50 border border-slate-200"
            />
          </FormField>

          {/* Prompt Template */}
          <FormField
            label="Prompt Template"
            hint="Main instruction for the AI — what topics to draw from."
          >
            <textarea
              value={formData.promptTemplate}
              onChange={(e) => set("promptTemplate", e.target.value)}
              rows={3}
              placeholder="Generate trivia questions about…"
              className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm resize-none focus:outline-none bg-slate-50 border border-slate-200"
            />
          </FormField>

          {/* Difficulty Guidance */}
          <FormField
            label="Difficulty Guidance"
            hint="Describe how difficulty should scale with point value."
          >
            <input
              type="text"
              value={formData.difficultyGuidance}
              onChange={(e) => set("difficultyGuidance", e.target.value)}
              placeholder="$100 = basic facts, $500 = expert-level concepts"
              className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-slate-50 border border-slate-200"
            />
          </FormField>

          {/* Answer Format Guidance */}
          <FormField
            label="Answer Format Guidance"
            hint="How should answers be phrased? (e.g. proper nouns, one word)"
          >
            <input
              type="text"
              value={formData.answerFormatGuidance}
              onChange={(e) => set("answerFormatGuidance", e.target.value)}
              placeholder="Answers should be concise proper nouns or short phrases."
              className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-slate-50 border border-slate-200"
            />
          </FormField>

          {/* Examples */}
          <FormField
            label="Few-shot Examples (optional)"
            hint="One example per line: Q: … A: …"
          >
            <textarea
              value={formData.examples}
              onChange={(e) => set("examples", e.target.value)}
              rows={3}
              placeholder={"Q: This is the chemical symbol for gold. A: Au\nQ: This force keeps planets in orbit. A: Gravity"}
              className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm resize-none focus:outline-none font-mono bg-slate-50 border border-slate-200"
            />
          </FormField>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                formData.name.trim()
                  ? "btn-primary"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              {formMode.type === "add" ? "Add Category" : "Save Changes"}
            </button>
            <button
              onClick={closeForm}
              className="flex-1 btn-secondary hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category list */}
      {categories.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No categories yet. Add one above.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Select All Row */}
          <div className="flex items-center gap-3 px-2">
            <input
              type="checkbox"
              checked={categories.length > 0 && selectedIds.size === categories.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent cursor-pointer"
            />
            <span className="text-sm font-semibold text-slate-700">
              {selectedIds.size === categories.length && categories.length > 0
                ? "Deselect All"
                : "Select All"}
            </span>
          </div>

          {categories.map((item) => {
            const isEditing =
              formMode?.type === "edit" && formMode.id === item.id;
            const isDeleting = deleteConfirmId === item.id;
            const isPublishing = publishingId === item.id;
            const isPublished = publishedIds.has(item.id);
            const isSelected = selectedIds.has(item.id);
            const isDuplicate = duplicateIdsSet.has(item.id);
            const duplicateCount = duplicateGroups[item.name.trim().toUpperCase()]?.length || 0;

            return (
              <div
                key={item.id}
                className={`rounded-xl border-2 flex flex-col gap-2 p-4 transition-all ${
                  isDeleting
                    ? "bg-red-50 border-red-300"
                    : isPublishing
                    ? "bg-green-50 border-green-300"
                    : isEditing
                    ? "bg-white border-accent"
                    : isSelected
                    ? "bg-blue-50 border-blue-300"
                    : "bg-white border-slate-200"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-4">
                  {/* Checkbox */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(item.id)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold tracking-tight text-base text-slate-900">
                        {item.name}
                      </p>
                      {item.origin === "community" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold border border-purple-200">
                          Community
                        </span>
                      )}
                      {isDuplicate && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold border border-orange-300">
                          Duplicate ({duplicateCount}x)
                        </span>
                      )}
                    </div>
                    {item.promptTemplate ? (
                      <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">
                        {item.promptTemplate}
                      </p>
                    ) : (
                      <p className="text-slate-400 text-xs mt-0.5 italic">
                        No prompt template set
                      </p>
                    )}
                    {/* Field badges */}
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {item.difficultyGuidance && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          difficulty
                        </span>
                      )}
                      {item.answerFormatGuidance && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          answer format
                        </span>
                      )}
                      {item.examples && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          examples
                        </span>
                      )}
                    </div>
                  </div>
                  </div>

                  {/* Action buttons */}
                  {!isDeleting && !isPublishing && (
                    <div className="flex gap-2 shrink-0">
                      {isPublished ? (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
                          Published
                        </span>
                      ) : (
                        <button
                          onClick={() => startPublish(item.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold border border-green-200 text-green-600 hover:bg-green-50 transition-all"
                        >
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => openEditForm(item)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => requestDelete(item.id)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline publish form */}
                {isPublishing && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-green-200">
                    <p className="text-xs font-semibold text-green-800">
                      Publish "{item.name}" to Community
                    </p>
                    <textarea
                      value={publishDescription}
                      onChange={(e) => setPublishDescription(e.target.value)}
                      placeholder="Add a short description (optional)"
                      maxLength={200}
                      rows={2}
                      className="w-full rounded-lg px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 focus:outline-none focus:border-green-400 resize-none"
                    />
                    {publishError && (
                      <p className="text-xs text-red-600">{publishError}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePublish(item.id)}
                        disabled={publishingInProgress}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-all"
                      >
                        {publishingInProgress ? "Publishing..." : "Publish to Community"}
                      </button>
                      <button
                        onClick={() => setPublishingId(null)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold btn-secondary hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <a
                        href="/community?tab=categories"
                        className="ml-auto text-xs text-[#060CE9] hover:underline"
                      >
                        Browse Community
                      </a>
                    </div>
                  </div>
                )}

                {/* Inline delete confirm */}
                {isDeleting && (
                  <div className="flex items-center gap-3 pt-1">
                    <p className="text-sm text-red-700 flex-1">
                      Delete <strong>{item.name}</strong>? Board columns using
                      it will show as Unassigned.
                    </p>
                    <button
                      onClick={() => confirmDelete(item.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-all"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold btn-secondary hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Small helper component ────────────────────────────────────────────────────

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold tracking-tight text-slate-700">
        {label}
        {hint && (
          <span className="ml-2 normal-case font-normal text-slate-500">
            — {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
