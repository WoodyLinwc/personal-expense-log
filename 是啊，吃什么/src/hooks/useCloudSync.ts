import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { RecordsData, StickyNote } from "../types";

function isEmptyRecords(data: RecordsData): boolean {
  return Object.values(data).every(
    (arr) => !Array.isArray(arr) || arr.length === 0,
  );
}

function countRecords(data: RecordsData): number {
  return Object.values(data).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0,
  );
}

/** Deep-equal check that's insensitive to object key order. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((acc: Record<string, unknown>, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

export interface CloudConflict {
  cloudRecords: RecordsData;
  cloudNotes: StickyNote[];
  localRecordCount: number;
  cloudRecordCount: number;
  localNoteCount: number;
  cloudNoteCount: number;
  /** True when local was empty, so we can silently adopt the cloud data
   *  without bothering the user — there's nothing local to lose. */
  autoAdopt: boolean;
}

/**
 * Runs once per sign-in: fetches the user's cloud document and compares it
 * with whatever is currently stored locally. If both sides have data and
 * they differ, exposes a `conflict` for the caller to resolve (asking the
 * user once). Otherwise resolves automatically (empty cloud → just sync up;
 * empty local or identical data → nothing to ask).
 */
export function useCloudSync(
  uid: string | null,
  records: RecordsData,
  notes: StickyNote[],
  setSyncEnabled: (v: boolean) => void,
) {
  const [conflict, setConflict] = useState<CloudConflict | null>(null);
  const checkedUidRef = useRef<string | null>(null);

  const recordsRef = useRef(records);
  const notesRef = useRef(notes);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    if (!uid) {
      checkedUidRef.current = null;
      setSyncEnabled(false);
      setConflict(null);
      return;
    }
    if (checkedUidRef.current === uid) return;
    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        if (cancelled) return;

        const data = snap.data();
        const cloudRecords = (data?.records as RecordsData) || {};
        const cloudNotes = (data?.notes as StickyNote[]) || [];
        const localRecords = recordsRef.current;
        const localNotes = notesRef.current;

        const cloudEmpty =
          isEmptyRecords(cloudRecords) && cloudNotes.length === 0;
        const localEmpty =
          isEmptyRecords(localRecords) && localNotes.length === 0;
        const identical =
          deepEqual(cloudRecords, localRecords) &&
          deepEqual(cloudNotes, localNotes);

        if (cloudEmpty || identical) {
          checkedUidRef.current = uid;
          setSyncEnabled(true);
          return;
        }

        // Real difference (or local is empty and cloud has data) — surface it.
        setConflict({
          cloudRecords,
          cloudNotes,
          localRecordCount: countRecords(localRecords),
          cloudRecordCount: countRecords(cloudRecords),
          localNoteCount: localNotes.length,
          cloudNoteCount: cloudNotes.length,
          autoAdopt: localEmpty,
        });
      } catch (err) {
        console.error("Cloud sync check failed:", err);
        // Fail open rather than blocking the app — just start syncing from here.
        checkedUidRef.current = uid;
        setSyncEnabled(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  /** Call after the conflict has been handled (by the caller applying the
   *  chosen data via replaceAllRecords/mergeAllRecords) to resume syncing. */
  const markResolved = () => {
    checkedUidRef.current = uid;
    setConflict(null);
    setSyncEnabled(true);
  };

  return { conflict, markResolved };
}
