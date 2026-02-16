"use client";

import { useState } from "react";
import { useDraftCategories } from "@/lib/data/useDraftCategories";
import { useBoardTemplates } from "@/lib/data/useBoardTemplates";
import { useBoards } from "@/lib/data/useBoards";
import type { DraftCategory, BoardTemplate } from "@/lib/chat/types";

export default function DraftCategoriesTab() {
  const {
    draftCategories,
    loading: categoriesLoading,
    deleteDraftCategory,
    promoteToClassic,
  } = useDraftCategories();

  const {
    boardTemplates,
    loading: templatesLoading,
    deleteBoardTemplate,
  } = useBoardTemplates();

  const { saveCurrentBoard } = useBoards();

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePromote = async (categoryId: string) => {
    const category = draftCategories.find((c) => c.id === categoryId);
    if (!category) return;

    if (
      !confirm(
        `Promote "${category.name}" to Classic Categories?\n\nThis will add it to your permanent category library and remove it from drafts.`
      )
    ) {
      return;
    }

    const result = await promoteToClassic(categoryId);
    if (result.success) {
      showToast(`✅ "${category.name}" promoted to Classic Categories!`);
    } else {
      showToast(`❌ Failed to promote: ${result.error}`, "error");
    }
  };

  const handleDelete = async (categoryId: string) => {
    const category = draftCategories.find((c) => c.id === categoryId);
    if (!category) return;

    if (!confirm(`Delete draft category "${category.name}"? This cannot be undone.`)) {
      return;
    }

    await deleteDraftCategory(categoryId);
    showToast(`Deleted "${category.name}"`);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const template = boardTemplates.find((t) => t.id === templateId);
    if (!template) return;

    if (!confirm(`Delete board template "${template.name}"? This cannot be undone.`)) {
      return;
    }

    await deleteBoardTemplate(templateId);
    showToast(`Deleted "${template.name}"`);
  };

  const handleApplyTemplate = async (template: BoardTemplate) => {
    if (
      !confirm(
        `Apply "${template.name}" to current board?\n\nThis will:\n- Promote all draft categories to your Classic library\n- Create a board with ${template.categories.length} categories\n\nContinue?`
      )
    ) {
      return;
    }

    try {
      // First, promote all draft categories to classic library and get their IDs
      const categoryLibraryIds: (string | null)[] = [];

      for (const cat of template.categories) {
        // Check if this category has a categoryId (meaning it's a draft)
        if (cat.categoryId) {
          const result = await promoteToClassic(cat.categoryId);
          if (result.success && result.categoryLibraryId) {
            categoryLibraryIds.push(result.categoryLibraryId);
          } else {
            // If promotion failed, still add the column but without library ID
            categoryLibraryIds.push(null);
            console.warn(`Failed to promote category ${cat.name}:`, result.error);
          }
        } else {
          // Category doesn't have a draft ID, add it without library ID
          categoryLibraryIds.push(null);
        }
      }

      // Create board from template with proper category library IDs
      const newBoard = {
        rowValues: [100, 200, 300, 400, 500],
        columns: template.categories.map((cat, idx) => ({
          id: `col-${Date.now()}-${idx}`,
          title: cat.name,
          categoryLibraryId: categoryLibraryIds[idx],
          questions: [100, 200, 300, 400, 500].map((value) => ({
            id: `q-${Date.now()}-${idx}-${value}`,
            value,
            question: "(Generate to fill)",
            answer: "",
          })),
        })),
      };

      await saveCurrentBoard(newBoard);
      showToast(`✅ Applied "${template.name}" to board! All categories promoted to Classic.`);
    } catch (error) {
      console.error("Error applying template:", error);
      showToast(`❌ Failed to apply template: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };

  if (categoriesLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Draft Categories & Board Templates</h2>
        <p className="text-sm text-slate-600 mt-1">
          Manage AI-generated categories and board templates from Chat Board Builder
        </p>
      </div>

      {/* Board Templates Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">
            Board Templates ({boardTemplates.length})
          </h3>
        </div>

        {boardTemplates.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <p>No board templates yet.</p>
            <p className="mt-1">Use the Chat tab to create themed boards!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {boardTemplates.map((template) => (
              <div key={template.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{template.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                        Difficulty {template.difficulty_1_to_10}/10
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{template.theme}</p>
                    <p className="text-xs text-slate-500">
                      {template.categories.length} categories •{" "}
                      {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setExpandedTemplate(
                          expandedTemplate === template.id ? null : template.id
                        )
                      }
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      {expandedTemplate === template.id ? "Hide" : "View"}
                    </button>
                    <button
                      onClick={() => handleApplyTemplate(template)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
                    >
                      Apply to Board
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Expanded view */}
                {expandedTemplate === template.id && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Categories:</p>
                    {template.categories.map((cat, idx) => (
                      <div key={idx} className="text-xs text-slate-600 pl-4 border-l-2 border-blue-200">
                        <span className="font-semibold">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Draft Categories Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">
            Draft Categories ({draftCategories.length})
          </h3>
        </div>

        {draftCategories.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <p>No draft categories yet.</p>
            <p className="mt-1">Categories created via chat will appear here!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {draftCategories.map((category) => (
              <div key={category.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{category.name}</h4>
                      {category.tags && category.tags.length > 0 && (
                        <div className="flex gap-1">
                          {category.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Created {new Date(category.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setExpandedCategory(
                          expandedCategory === category.id ? null : category.id
                        )
                      }
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      {expandedCategory === category.id ? "Hide" : "View"}
                    </button>
                    <button
                      onClick={() => handlePromote(category.id)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all font-semibold"
                    >
                      ⬆ Promote
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Expanded view */}
                {expandedCategory === category.id && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Prompt Template:</p>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                        {category.promptTemplate}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Difficulty Guidance:</p>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                        {category.difficultyGuidance}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Answer Format:</p>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                        {category.answerFormatGuidance}
                      </p>
                    </div>
                    {category.examples && (
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-1">Examples:</p>
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded whitespace-pre-line">
                          {category.examples}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full bg-slate-900 text-white font-semibold shadow-lg z-50"
          style={{ animation: "fadeIn 0.2s ease-out" }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
