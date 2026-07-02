import { useEffect, useRef, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { StickyNote, StickyNoteColor } from "../types";

const NOTES_STORAGE_KEY = "yeah_what_to_eat_notes";

/** Merges two note lists, deduplicating by id. */
function mergeNotesData(a: StickyNote[], b: StickyNote[]): StickyNote[] {
  const existingIds = new Set(a.map((n) => n.id));
  const toAdd = b.filter((n) => !existingIds.has(n.id));
  return [...a, ...toAdd];
}

/**
 * Local-first sticky notes storage. Mirrors the same optional-sync pattern
 * as useRecords: localStorage is the default and always works offline;
 * signing in additionally merges with and then syncs to Firestore.
 */
export function useStickyNotes(uid: string | null) {
  const [notes, setNotes] = useState<StickyNote[]>(() => {
    const saved = localStorage.getItem(NOTES_STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const syncedUidRef = useRef<string | null>(null);

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
        const cloudNotes = (snap.data()?.notes as StickyNote[]) || [];
        const merged = mergeNotesData(notesRef.current, cloudNotes);
        setNotes(merged);
        syncedUidRef.current = uid;
        await setDoc(ref, { notes: merged }, { merge: true });
      } catch (err) {
        console.error("Cloud sync (notes) failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || syncedUidRef.current !== uid) return;
    const ref = doc(db, "users", uid);
    setDoc(ref, { notes }, { merge: true }).catch((err) =>
      console.error("Cloud sync (notes) failed:", err),
    );
  }, [notes, uid]);

  /** Creates a new note and returns its id so the caller can auto-focus it. */
  const addNote = (content = "", color: StickyNoteColor = "yellow"): string => {
    const id = crypto.randomUUID();
    const now = Date.now();
    setNotes((prev) => [
      { id, content, color, createdAt: now, updatedAt: now },
      ...prev,
    ]);
    return id;
  };

  const updateNote = (id: string, content: string, color?: StickyNoteColor) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, content, color: color ?? n.color, updatedAt: Date.now() }
          : n,
      ),
    );
  };

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const replaceAllNotes = (incoming: StickyNote[]) => {
    setNotes(incoming);
  };

  const mergeAllNotes = (incoming: StickyNote[]) => {
    setNotes((prev) => mergeNotesData(prev, incoming));
  };

  return {
    notes,
    addNote,
    updateNote,
    removeNote,
    replaceAllNotes,
    mergeAllNotes,
  };
}
