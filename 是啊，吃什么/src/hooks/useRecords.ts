import { useEffect, useRef, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { RecordItem, RecordsData } from "../types";

const STORAGE_KEY = "yeah_what_to_eat_records";

/**
 * Firestore rejects any field with a literal `undefined` value by throwing
 * synchronously (not just a rejected promise) — e.g. `customColor: undefined`
 * on a record with no custom color. Round-tripping through JSON strips those
 * keys entirely (matching how they're already stored in localStorage), which
 * keeps writes safe without changing the shape callers rely on.
 */
function stripUndefined<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/** Merges two RecordsData objects, deduplicating entries by id. */
function mergeRecordsData(a: RecordsData, b: RecordsData): RecordsData {
  const merged: RecordsData = { ...a };
  for (const [dateKey, recs] of Object.entries(b)) {
    if (!Array.isArray(recs)) continue;
    const existing = merged[dateKey] || [];
    const existingIds = new Set(existing.map((r) => r.id));
    const toAdd = recs.filter((r) => !existingIds.has(r.id));
    merged[dateKey] = [...existing, ...toAdd];
  }
  return merged;
}

/**
 * Local-first records storage: always reads/writes localStorage, so the app
 * works fully offline with no account needed. If `uid` is provided (i.e. the
 * user is signed in with Google), it additionally:
 *  1. On sign-in, does a one-time merge of local + cloud data (so switching
 *     devices or signing in for the first time never loses anything).
 *  2. From then on, pushes every local change up to Firestore as a backup /
 *     cross-device sync — signing in is purely additive, never required.
 */
export function useRecords(uid: string | null) {
  const [records, setRecords] = useState<RecordsData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const recordsRef = useRef(records);
  useEffect(() => {
    recordsRef.current = records;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const syncedUidRef = useRef<string | null>(null);

  // On sign-in: pull cloud data once and merge it into local state.
  useEffect(() => {
    if (!uid) {
      syncedUidRef.current = null;
      return;
    }
    if (syncedUidRef.current === uid) return;
    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        if (cancelled) return;
        const cloudRecords = (snap.data()?.records as RecordsData) || {};
        const merged = mergeRecordsData(recordsRef.current, cloudRecords);
        setRecords(merged);
        syncedUidRef.current = uid;
        await setDoc(ref, { records: stripUndefined(merged) }, { merge: true });
      } catch (err) {
        console.error("Cloud sync (records) failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // While signed in, push every subsequent local change up to the cloud.
  useEffect(() => {
    if (!uid || syncedUidRef.current !== uid) return;
    const ref = doc(db, "users", uid);
    try {
      setDoc(ref, { records: stripUndefined(records) }, { merge: true }).catch(
        (err) => console.error("Cloud sync (records) failed:", err),
      );
    } catch (err) {
      // setDoc can throw synchronously (not just reject) for invalid data
      // (e.g. an undefined field) — never let that crash the whole app.
      console.error("Cloud sync (records) failed:", err);
    }
  }, [records, uid]);

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

  /** Overwrites all records (used by import → replace). */
  const replaceAllRecords = (data: RecordsData) => {
    setRecords(data);
  };

  /** Merges imported records, deduplicating by id (used by import → merge). */
  const mergeAllRecords = (data: RecordsData) => {
    setRecords((prev) => mergeRecordsData(prev, data));
  };

  return {
    records,
    addRecord,
    removeRecord,
    updateRecord,
    replaceAllRecords,
    mergeAllRecords,
  };
}
