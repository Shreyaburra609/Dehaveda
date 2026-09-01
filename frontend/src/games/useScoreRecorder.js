import { useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const LOCAL_KEY = "dv_local_scores";

export function readLocalScores() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useScoreRecorder(game) {
  const { user } = useAuth();

  return useCallback(
    async (score, level = 1, meta = {}) => {
      const entry = { game, score, level, meta, created_at: new Date().toISOString() };
      if (user) {
        try {
          await api.post("/games/score", { game, score, level, meta });
          window.dispatchEvent(new CustomEvent("dv-score-recorded"));
          return { saved: "server" };
        } catch {
          /* fall through to local */
        }
      }
      const all = readLocalScores();
      all.unshift(entry);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(0, 200)));
      window.dispatchEvent(new CustomEvent("dv-score-recorded"));
      return { saved: "local" };
    },
    [game, user],
  );
}
