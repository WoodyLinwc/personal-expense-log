import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { StickyNote, StickyNoteColor } from "../types";

const NOTES_STORAGE_KEY = "yeah_what_to_eat_notes";

/**
 * Firestore rejects any field with a literal `undefined` value by throwing
 * synchronously. Round-tripping through JSON strips those keys entirely,
 * keeping writes safe regardless of the data shape.
 */
function stripUndefined<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/** Merges two note lists, deduplicating by id. */
function mergeNotesData(a: StickyNote[], b: StickyNote[]): StickyNote[] {
  const existingIds = new Set(a.map((n) => n.id));
  const toAdd = b.filter((n) => !existingIds.has(n.id));
  return [...a, ...toAdd];
}

/**
 * Local-first sticky notes storage. Mirrors the same externally-controlled
 * sync pattern as useRecords: localStorage is the default and always works
 * offline; once `syncEnabled` is true, changes are also pushed to Firestore.
 */
export function useStickyNotes(uid: string | null, syncEnabled: boolean) {
  const [notes, setNotes] = useState<StickyNote[]>(() => {
    const saved = localStorage.getItem(NOTES_STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (!uid || !syncEnabled) return;
    const ref = doc(db, "users", uid);
    try {
      setDoc(ref, { notes: stripUndefined(notes) }, { merge: true }).catch(
        (err) => console.error("Cloud sync (notes) failed:", err),
      );
    } catch (err) {
      console.error("Cloud sync (notes) failed:", err);
    }
  }, [notes, uid, syncEnabled]);

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

  /** Overwrites all notes (used by import → replace, and cloud-sync resolution). */
  const replaceAllNotes = (incoming: StickyNote[]) => {
    setNotes(incoming);
  };

  /** Merges imported/cloud notes, deduplicating by id. */
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
