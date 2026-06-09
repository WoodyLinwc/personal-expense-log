import { useState, useEffect } from "react";
import { StickyNote, StickyNoteColor } from "../types";

const NOTES_STORAGE_KEY = "yeah_what_to_eat_notes";

export function useStickyNotes() {
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
    setNotes((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const toAdd = incoming.filter((n) => !existingIds.has(n.id));
      return [...prev, ...toAdd];
    });
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
