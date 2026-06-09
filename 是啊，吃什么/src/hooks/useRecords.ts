import { useState, useEffect } from "react";
import { RecordItem, RecordsData } from "../types";

const STORAGE_KEY = "yeah_what_to_eat_records";

function isValidRecordsData(data: unknown): data is RecordsData {
  if (typeof data !== "object" || data === null || Array.isArray(data))
    return false;
  return Object.entries(data).every(
    ([, val]) =>
      Array.isArray(val) &&
      val.every(
        (r) =>
          typeof r === "object" &&
          r !== null &&
          typeof r.id === "string" &&
          typeof r.description === "string" &&
          typeof r.cost === "number",
      ),
  );
}

export function useRecords() {
  const [records, setRecords] = useState<RecordsData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const addRecord = (dateKey: string, record: Omit<RecordItem, "id">) => {
    setRecords((prev) => ({
      ...prev,
      [dateKey]: [
        ...(prev[dateKey] || []),
        { ...record, id: crypto.randomUUID() },
      ],
    }));
  };

  const removeRecord = (dateKey: string, id: string) => {
    setRecords((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey]?.filter((m) => m.id !== id) || [],
    }));
  };

  const updateRecord = (
    dateKey: string,
    id: string,
    record: Omit<RecordItem, "id" | "createdAt">,
  ) => {
    setRecords((prev) => ({
      ...prev,
      [dateKey]:
        prev[dateKey]?.map((r) => (r.id === id ? { ...r, ...record } : r)) ||
        [],
    }));
  };

  const exportRecords = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().split("T")[0];
    a.download = `expense_records_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importRecords = (data: RecordsData, mode: "replace" | "merge") => {
    if (mode === "replace") {
      setRecords(data);
    } else {
      // Merge: add records that don't already exist (deduplicated by id)
      setRecords((prev) => {
        const merged = { ...prev };
        for (const [dateKey, newRecs] of Object.entries(data)) {
          if (!Array.isArray(newRecs)) continue;
          const existing = merged[dateKey] || [];
          const existingIds = new Set(existing.map((r) => r.id));
          const toAdd = newRecs.filter((r) => !existingIds.has(r.id));
          merged[dateKey] = [...existing, ...toAdd];
        }
        return merged;
      });
    }
  };

  const parseAndImport = (
    file: File,
  ): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (!isValidRecordsData(parsed)) {
            resolve({ success: false, error: "Invalid file format." });
            return;
          }
          const totalDays = Object.keys(parsed).length;
          const totalRecords = Object.values(parsed).flat().length;
          const mode = window.confirm(
            `Import ${totalRecords} record(s) across ${totalDays} day(s).\n\n` +
              `OK → Replace all existing data\n` +
              `Cancel → Merge (keep existing, add new)`,
          )
            ? "replace"
            : "merge";
          importRecords(parsed, mode);
          resolve({ success: true });
        } catch {
          resolve({ success: false, error: "Could not parse JSON file." });
        }
      };
      reader.onerror = () =>
        resolve({ success: false, error: "Could not read file." });
      reader.readAsText(file);
    });
  };

  return {
    records,
    addRecord,
    removeRecord,
    updateRecord,
    exportRecords,
    parseAndImport,
  };
}
