import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useAuth } from "../context/AuthContext";
let draftGeneration = 0;
export function clearPredictionDraft(email?: string) {
  draftGeneration++;
  const prefix = email ? `prediction-draft:${email}:` : "prediction-draft:";
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(prefix)) sessionStorage.removeItem(key);
  }
}

const preparedUsers = new Set<string>();
export function usePredictionDraft<T>(name: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const { user } = useAuth();
  const owner = user?.email ?? "guest";
  if (!preparedUsers.has(owner)) {
    preparedUsers.add(owner);
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type !== "reload") clearPredictionDraft(owner);
    else {
      const resultKey = `prediction-draft:${owner}:prediction`;
      try {
        const result = JSON.parse(sessionStorage.getItem(resultKey) ?? "null");
        if (result?.id) sessionStorage.setItem(resultKey, JSON.stringify({ id: result.id }));
      } catch {}
    }
  }
  const generation = useRef(draftGeneration);
  const key = `prediction-draft:${user?.email ?? "guest"}:${name}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (!stored) return initial;
      const parsed = JSON.parse(stored);
      if (name === "currentStep") {
        if (parsed === 3) {
          const result = JSON.parse(sessionStorage.getItem(`prediction-draft:${owner}:prediction`) ?? "null");
          return (result?.id ? 3 : 2) as T;
        }
        if (parsed >= 4) {
          const result = JSON.parse(sessionStorage.getItem(`prediction-draft:${owner}:prediction`) ?? "null");
          if (!result?.id) return 1 as T;
        }
      }
      if (name === "prediction" && parsed?.id && !Array.isArray(parsed.forecastResults)) return initial;
      if (name === "files") return parsed.filter((file: {datasetId?: string}) => file.datasetId) as T;
      return parsed;
    } catch { return initial; }
  });
  useEffect(() => { if (generation.current !== draftGeneration || !user || (name === "prediction" && value === null)) return; try { sessionStorage.setItem(key, JSON.stringify(name === "prediction" && value ? { id: (value as { id: string }).id } : value, (key, item) => key === "rawFile" ? undefined : item)); } catch {} }, [key, value, user]);
  return [value, setValue];
}
