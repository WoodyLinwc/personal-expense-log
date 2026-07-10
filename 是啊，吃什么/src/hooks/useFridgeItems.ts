import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { FridgeItem } from "../types";

const FRIDGE_STORAGE_KEY = "yeah_what_to_eat_fridge_items";

/**
 * Firestore rejects any field with a literal `undefined` value by throwing
 * synchronously. Round-tripping through JSON strips those keys entirely,
 * keeping writes safe regardless of the data shape.
 */
function stripUndefined<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/** Merges two item lists, deduplicating by id, keeping the more recently updated version. */
function mergeFridgeData(a: FridgeItem[], b: FridgeItem[]): FridgeItem[] {
  const byId = new Map(a.map((it) => [it.id, it]));
  b.forEach((it) => {
    const existing = byId.get(it.id);
    if (!existing || it.updatedAt > existing.updatedAt) {
      byId.set(it.id, it);
    }
  });
  return Array.from(byId.values());
}

/**
 * Local-first fridge inventory storage. Mirrors the same externally-controlled
 * sync pattern as useRecords / useStickyNotes: localStorage is the default and
 * always works offline; once `syncEnabled` is true, changes are also pushed
 * to Firestore.
 */
export function useFridgeItems(uid: string | null, syncEnabled: boolean) {
  const [items, setItems] = useState<FridgeItem[]>(() => {
    const saved = localStorage.getItem(FRIDGE_STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(FRIDGE_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!uid || !syncEnabled) return;
    const ref = doc(db, "users", uid);
    try {
      setDoc(
        ref,
        { fridgeItems: stripUndefined(items) },
        { merge: true },
      ).catch((err) => console.error("Cloud sync (fridge) failed:", err));
    } catch (err) {
      console.error("Cloud sync (fridge) failed:", err);
    }
  }, [items, uid, syncEnabled]);

  const addItem = (
    name: string,
    quantity = 1,
    unit?: string,
    lowStockAt = 1,
  ): string => {
    const id = crypto.randomUUID();
    const now = Date.now();
    setItems((prev) => [
      { id, name, quantity, unit, lowStockAt, updatedAt: now },
      ...prev,
    ]);
    return id;
  };

  const updateItem = (id: string, patch: Partial<Omit<FridgeItem, "id">>) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, ...patch, updatedAt: Date.now() } : it,
      ),
    );
  };

  /** Bumps quantity by delta (used by +/- buttons), clamped at 0. */
  const adjustQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              quantity: Math.max(0, it.quantity + delta),
              updatedAt: Date.now(),
            }
          : it,
      ),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  /** Overwrites all items (used by import → replace, and cloud-sync resolution). */
  const replaceAllItems = (incoming: FridgeItem[]) => {
    setItems(incoming);
  };

  /** Merges imported/cloud items, deduplicating by id. */
  const mergeAllItems = (incoming: FridgeItem[]) => {
    setItems((prev) => mergeFridgeData(prev, incoming));
  };

  return {
    items,
    addItem,
    updateItem,
    adjustQuantity,
    removeItem,
    replaceAllItems,
    mergeAllItems,
  };
}
