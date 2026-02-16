"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { DraftCategory } from "@/lib/chat/types";

function isTableMissingError(error: any): boolean {
  const errorStr = JSON.stringify(error).toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST204" ||
    errorStr.includes("does not exist") ||
    errorStr.includes("42p01")
  );
}

export function useDraftCategories() {
  const { user } = useAuth();
  const [draftCategories, setDraftCategories] = useState<DraftCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadDraftCategories = useCallback(async () => {
    if (!user) {
      setDraftCategories([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("draft_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          // Silently handle - table not created yet
          setDraftCategories([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      const transformed: DraftCategory[] = (data || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        promptTemplate: cat.prompt_template,
        difficultyGuidance: cat.difficulty_guidance,
        answerFormatGuidance: cat.answer_format_guidance,
        examples: cat.examples,
        origin: cat.origin as "classic" | "chat_draft",
        tags: cat.tags || [],
        createdAt: new Date(cat.created_at).getTime(),
        updatedAt: new Date(cat.updated_at).getTime(),
      }));

      setDraftCategories(transformed);
    } catch (error: any) {
      if (isTableMissingError(error)) {
        setDraftCategories([]);
      } else {
        console.error("Error loading draft categories:", error);
        setDraftCategories([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadDraftCategories();
  }, [loadDraftCategories]);

  const saveDraftCategory = useCallback(
    async (category: Omit<DraftCategory, "id" | "createdAt" | "updatedAt">) => {
      if (!user) return null;

      try {
        const { data, error } = await supabase
          .from("draft_categories")
          .insert({
            user_id: user.id,
            name: category.name,
            prompt_template: category.promptTemplate,
            difficulty_guidance: category.difficultyGuidance,
            answer_format_guidance: category.answerFormatGuidance,
            examples: category.examples,
            origin: category.origin,
            tags: category.tags || [],
          })
          .select()
          .single();

        if (error) throw error;

        await loadDraftCategories();
        return data.id;
      } catch (error: any) {
        if (isTableMissingError(error)) {
          console.info("💡 Chat Board Builder: Run the database migration to enable draft categories.");
          return null;
        }
        console.error("Error saving draft category:", error?.message || error);
        return null;
      }
    },
    [user, supabase, loadDraftCategories]
  );

  const updateDraftCategory = useCallback(
    async (category: DraftCategory) => {
      if (!user) return;

      try {
        await supabase
          .from("draft_categories")
          .update({
            name: category.name,
            prompt_template: category.promptTemplate,
            difficulty_guidance: category.difficultyGuidance,
            answer_format_guidance: category.answerFormatGuidance,
            examples: category.examples,
            tags: category.tags || [],
          })
          .eq("id", category.id);

        await loadDraftCategories();
      } catch (error: any) {
        if (!isTableMissingError(error)) {
          console.error("Error updating draft category:", error?.message || error);
        }
      }
    },
    [user, supabase, loadDraftCategories]
  );

  const deleteDraftCategory = useCallback(
    async (categoryId: string) => {
      if (!user) return;

      try {
        await supabase.from("draft_categories").delete().eq("id", categoryId);
        await loadDraftCategories();
      } catch (error: any) {
        if (!isTableMissingError(error)) {
          console.error("Error deleting draft category:", error?.message || error);
        }
      }
    },
    [user, supabase, loadDraftCategories]
  );

  const promoteToClassic = useCallback(
    async (draftCategoryId: string) => {
      if (!user) return { success: false, error: "Not authenticated" };

      try {
        const draftCat = draftCategories.find((c) => c.id === draftCategoryId);
        if (!draftCat) {
          return { success: false, error: "Draft category not found" };
        }

        const { data, error: insertError } = await supabase
          .from("category_library")
          .insert({
            user_id: user.id,
            name: draftCat.name,
            prompt_template: draftCat.promptTemplate,
            difficulty_guidance: draftCat.difficultyGuidance,
            answer_format_guidance: draftCat.answerFormatGuidance,
            examples: draftCat.examples,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        await deleteDraftCategory(draftCategoryId);

        return { success: true, categoryLibraryId: data.id };
      } catch (error: any) {
        console.error("Error promoting category:", error?.message || error);
        return {
          success: false,
          error: error?.message || "Unknown error",
        };
      }
    },
    [user, supabase, draftCategories, deleteDraftCategory]
  );

  return {
    draftCategories,
    loading,
    saveDraftCategory,
    updateDraftCategory,
    deleteDraftCategory,
    promoteToClassic,
    reload: loadDraftCategories,
  };
}
