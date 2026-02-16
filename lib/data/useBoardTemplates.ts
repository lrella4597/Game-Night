"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { BoardTemplate } from "@/lib/chat/types";

function isTableMissingError(error: any): boolean {
  const errorStr = JSON.stringify(error).toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST204" ||
    errorStr.includes("does not exist") ||
    errorStr.includes("42p01")
  );
}

export function useBoardTemplates() {
  const { user } = useAuth();
  const [boardTemplates, setBoardTemplates] = useState<BoardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadBoardTemplates = useCallback(async () => {
    if (!user) {
      setBoardTemplates([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("board_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          // Silently handle - table not created yet
          setBoardTemplates([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      const transformed: BoardTemplate[] = (data || []).map((template) => ({
        id: template.id,
        name: template.name,
        theme: template.theme,
        difficulty_1_to_10: template.difficulty_1_to_10,
        categories: template.categories,
        createdAt: new Date(template.created_at).getTime(),
        updatedAt: new Date(template.updated_at).getTime(),
      }));

      setBoardTemplates(transformed);
    } catch (error: any) {
      if (isTableMissingError(error)) {
        setBoardTemplates([]);
      } else {
        console.error("Error loading board templates:", error);
        setBoardTemplates([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadBoardTemplates();
  }, [loadBoardTemplates]);

  const saveBoardTemplate = useCallback(
    async (template: Omit<BoardTemplate, "id" | "createdAt" | "updatedAt">) => {
      if (!user) return null;

      try {
        const { data, error } = await supabase
          .from("board_templates")
          .insert({
            user_id: user.id,
            name: template.name,
            theme: template.theme,
            difficulty_1_to_10: template.difficulty_1_to_10,
            categories: template.categories,
          })
          .select()
          .single();

        if (error) throw error;

        await loadBoardTemplates();
        return data.id;
      } catch (error: any) {
        if (isTableMissingError(error)) {
          console.info("💡 Chat Board Builder: Run the database migration to enable board templates.");
          return null;
        }
        console.error("Error saving board template:", error?.message || error);
        return null;
      }
    },
    [user, supabase, loadBoardTemplates]
  );

  const updateBoardTemplate = useCallback(
    async (template: BoardTemplate) => {
      if (!user) return;

      try {
        await supabase
          .from("board_templates")
          .update({
            name: template.name,
            theme: template.theme,
            difficulty_1_to_10: template.difficulty_1_to_10,
            categories: template.categories,
          })
          .eq("id", template.id);

        await loadBoardTemplates();
      } catch (error: any) {
        if (!isTableMissingError(error)) {
          console.error("Error updating board template:", error?.message || error);
        }
      }
    },
    [user, supabase, loadBoardTemplates]
  );

  const deleteBoardTemplate = useCallback(
    async (templateId: string) => {
      if (!user) return;

      try {
        await supabase.from("board_templates").delete().eq("id", templateId);
        await loadBoardTemplates();
      } catch (error: any) {
        if (!isTableMissingError(error)) {
          console.error("Error deleting board template:", error?.message || error);
        }
      }
    },
    [user, supabase, loadBoardTemplates]
  );

  return {
    boardTemplates,
    loading,
    saveBoardTemplate,
    updateBoardTemplate,
    deleteBoardTemplate,
    reload: loadBoardTemplates,
  };
}
