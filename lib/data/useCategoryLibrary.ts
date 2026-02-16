"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export interface CategoryPrompt {
  id: string;
  name: string;
  promptTemplate: string;
  difficultyGuidance: string;
  answerFormatGuidance: string;
  examples: string;
}

export function useCategoryLibrary() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("category_library")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformed: CategoryPrompt[] = (data || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        promptTemplate: cat.prompt_template,
        difficultyGuidance: cat.difficulty_guidance,
        answerFormatGuidance: cat.answer_format_guidance,
        examples: cat.examples,
      }));

      setCategories(transformed);
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const saveCategory = useCallback(
    async (category: Omit<CategoryPrompt, "id">) => {
      if (!user) return;

      try {
        await supabase.from("category_library").insert({
          user_id: user.id,
          name: category.name,
          prompt_template: category.promptTemplate,
          difficulty_guidance: category.difficultyGuidance,
          answer_format_guidance: category.answerFormatGuidance,
          examples: category.examples,
        });

        await loadCategories();
      } catch (error) {
        console.error("Error saving category:", error);
      }
    },
    [user, supabase, loadCategories]
  );

  const updateCategory = useCallback(
    async (category: CategoryPrompt) => {
      if (!user) return;

      try {
        await supabase
          .from("category_library")
          .update({
            name: category.name,
            prompt_template: category.promptTemplate,
            difficulty_guidance: category.difficultyGuidance,
            answer_format_guidance: category.answerFormatGuidance,
            examples: category.examples,
          })
          .eq("id", category.id);

        await loadCategories();
      } catch (error) {
        console.error("Error updating category:", error);
      }
    },
    [user, supabase, loadCategories]
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      if (!user) return;

      try {
        await supabase.from("category_library").delete().eq("id", categoryId);
        await loadCategories();
      } catch (error) {
        console.error("Error deleting category:", error);
      }
    },
    [user, supabase, loadCategories]
  );

  return {
    categories,
    loading,
    saveCategory,
    updateCategory,
    deleteCategory,
    reload: loadCategories,
  };
}
