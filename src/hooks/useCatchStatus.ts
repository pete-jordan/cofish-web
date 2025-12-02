// src/hooks/useCatchStatus.ts
import { useEffect, useState } from "react";
import { getCatchById } from "../api/catchApi";
import type {CatchRecord} from "../api/catchApi";


export function useCatchStatus(catchId: string | null) {
  const [catchRecord, setCatchRecord] = useState<CatchRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!catchId) {
      setCatchRecord(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      if (!catchId) return; // Type guard
      try {
        setLoading(true);
        const rec = await getCatchById(catchId);
        if (!cancelled) {
          setCatchRecord(rec);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error("useCatchStatus error", e);
          setError(e?.message || "Failed to load catch");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    // initial fetch
    poll();

    // poll every ~3 seconds
    const intervalId = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [catchId]);

  return { catchRecord, loading, error };
}
