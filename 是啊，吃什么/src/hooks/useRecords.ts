import { useState, useEffect } from "react";
import { RecordItem, RecordsData } from "../types";

const STORAGE_KEY = "yeah_what_to_eat_records";

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

  const updateRecord = (dateKey: string, id: string, record: Omit<RecordItem, "id" | "createdAt">) => {
    setRecords((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey]?.map(r => (r.id === id ? { ...r, ...record } : r)) || [],
    }));
  };

  return { records, addRecord, removeRecord, updateRecord };
}
