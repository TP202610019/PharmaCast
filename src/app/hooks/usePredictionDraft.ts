import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { useAuth } from "../context/AuthContext";
export function usePredictionDraft<T>(name: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const { user } = useAuth();
  const key = `prediction-draft:${user?.email ?? "guest"}:${name}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (!stored) return initial;
      const parsed = JSON.parse(stored);
      if (name === "currentStep" && parsed === 3) return 2 as T;
      if (name === "files") return parsed.filter((file: {datasetId?: string}) => file.datasetId) as T;
      return parsed;
    } catch { return initial; }
  });
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(value, (key, item) => key === "rawFile" ? undefined : item)); } catch {} }, [key, value]);
  return [value, setValue];
}
