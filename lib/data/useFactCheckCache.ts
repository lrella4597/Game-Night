"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export interface FactCheckResult {
  verdict: "likely_correct" | "uncertain" | "likely_incorrect";
  confidence: number;
  explanation: string;
  supportingFacts: string[];
  commonConfusions?: string[];
}

export function useFactCheckCache() {
  const { user } = useAuth();
  const [cache, setCache] = useState<Map<string, FactCheckResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadCache = useCallback(async () => {
    if (!user) {
      setCache(new Map());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("factcheck_cache")
        .select("*")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;

      const newCache = new Map<string, FactCheckResult>();
      (data || []).forEach((item) => {
        const key = `${item.question}|${item.answer}`;
        newCache.set(key, {
          verdict: item.verdict,
          confidence: item.confidence,
          explanation: item.explanation,
          supportingFacts: item.supporting_facts || [],
          commonConfusions: item.common_confusions || [],
        });
      });

      setCache(newCache);
    } catch (error) {
      console.error("Error loading fact-check cache:", error);
      setCache(new Map());
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  const getCachedFactCheck = useCallback(
    (question: string, answer: string): FactCheckResult | undefined => {
      const key = `${question}|${answer}`;
      return cache.get(key);
    },
    [cache]
  );

  const cacheFactCheck = useCallback(
    async (question: string, answer: string, result: FactCheckResult) => {
      if (!user) return;

      try {
        await supabase.from("factcheck_cache").upsert({
          user_id: user.id,
          question,
          answer,
          verdict: result.verdict,
          confidence: result.confidence,
          explanation: result.explanation,
          supporting_facts: result.supportingFacts,
          common_confusions: result.commonConfusions || [],
        });

        const key = `${question}|${answer}`;
        const newCache = new Map(cache);
        newCache.set(key, result);
        setCache(newCache);
      } catch (error) {
        console.error("Error caching fact-check:", error);
      }
    },
    [user, supabase, cache]
  );

  return {
    getCachedFactCheck,
    cacheFactCheck,
    loading,
    reload: loadCache,
  };
}
