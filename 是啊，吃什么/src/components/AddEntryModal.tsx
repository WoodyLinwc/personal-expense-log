import React, { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import {
  RecordItem,
  Category,
  CATEGORIES,
  CustomColor,
  CUSTOM_COLORS,
} from "../types";
import { formatDateKey } from "../lib/dateUtils";

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (dateKey: string, record: Omit<RecordItem, "id">) => void;
  onUpdate?: (
    dateKey: string,
    id: string,
    record: Omit<RecordItem, "id" | "createdAt">,
  ) => void;
  onRemove?: (dateKey: string, id: string) => void;
  selectedDate: Date;
  editRecord?: RecordItem | null;
  frequentEntries?: {
    description: string;
    cost: number;
    category: Category;
    customColor?: CustomColor;
  }[];
}

export function AddEntryModal({
  isOpen,
  onClose,
  onAdd,
  onUpdate,
  onRemove,
  selectedDate,
  editRecord,
  frequentEntries,
}: AddEntryModalProps) {
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState<Category>("food");
  const [customColor, setCustomColor] = useState<CustomColor | "">("");

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setDescription(editRecord.description);
        setCost(editRecord.cost > 0 ? editRecord.cost.toString() : "");
        setCategory(editRecord.category || "food");
        setCustomColor(editRecord.customColor || "");
      } else {
        setDescription("");
        setCost("");
        setCategory("food");
        setCustomColor("");
      }
    }
  }, [isOpen, editRecord]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const costValue = cost === "" ? 0 : parseFloat(cost);
    if (isNaN(costValue) || costValue < 0) return;
    if (!description.trim() && costValue === 0 && customColor === "") return;

    const finalColor =
      customColor === "" ? undefined : (customColor as CustomColor);

    if (editRecord && onUpdate) {
      onUpdate(formatDateKey(selectedDate), editRecord.id, {
        description: description.trim(),
        cost: costValue,
        category,
        customColor: finalColor,
      });
    } else {
      onAdd(formatDateKey(selectedDate), {
        description: description.trim(),
        cost: costValue,
        category,
        customColor: finalColor,
        createdAt: Date.now(),
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (editRecord && onRemove) {
      onRemove(formatDateKey(selectedDate), editRecord.id);
      onClose();
    }
  };

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const formattedDate = `${String(selectedDate.getDate()).padStart(2, "0")} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm transition-opacity">
      <div className="bg-[#FAF9F6] w-full max-w-md p-8 border border-[rgba(0,0,0,0.1)] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 active:bg-black/10 active:scale-95 rounded-full transition-all touch-manipulation"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">
          {editRecord ? "Edit Entry" : "New Entry"}
        </h2>
        <p className="font-serif text-2xl font-bold italic border-b border-black/10 pb-4 mb-6">
          {formattedDate}
        </p>

        {!editRecord && frequentEntries && frequentEntries.length > 0 && (
          <div className="mb-6">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3 block">
              Quick Pick
            </label>
            <div className="flex flex-wrap gap-2">
              {frequentEntries.map((fe, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setDescription(fe.description);
                    setCost(fe.cost > 0 ? fe.cost.toString() : "");
                    setCategory(fe.category);
                    setCustomColor(fe.customColor || "");
                  }}
                  className="py-1.5 px-3 text-xs bg-black/5 hover:bg-black/10 rounded-full font-medium transition-colors border border-black/5 flex items-center"
                >
                  {fe.description}{" "}
                  {fe.cost > 0 && (
                    <span className="font-serif italic ml-1 opacity-60">
                      ¥{fe.cost}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3 block">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`h-10 px-2 text-xs font-semibold rounded transition-all flex items-center justify-center text-center border ${
                    category === c.id
                      ? "bg-black text-white border-black shadow-md"
                      : "bg-white border-black/10 text-black/60 hover:border-black/30 hover:bg-black/5"
                  }`}
                >
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3 block">
              Entry Color
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCustomColor("")}
                className={`w-8 h-8 rounded-full border transition-all ${customColor === "" ? "border-black ring-2 ring-black/20 transform scale-110" : "border-black/10 hover:border-black/50"}`}
                title="Default (from Category)"
              >
                <span className="w-full h-full block rounded-full bg-[#FAF9F6] opacity-50 relative">
                  <div className="absolute inset-0 m-auto w-4 h-[1px] bg-black rotate-45"></div>
                </span>
              </button>
              {(Object.keys(CUSTOM_COLORS) as CustomColor[]).map((colorKey) => {
                const colorClass = CUSTOM_COLORS[colorKey];
                const bgOnlyClass = colorClass.split(" ")[0]; // extract background color e.g., bg-orange-100
                return (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => setCustomColor(colorKey)}
                    className={`w-8 h-8 rounded-full border transition-all ${bgOnlyClass} ${
                      customColor === colorKey
                        ? "border-black ring-2 ring-black/20 transform scale-110 shadow-md"
                        : "border-black/10 hover:border-black/50 hover:scale-105"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1 block">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you spend on?"
              className="w-full bg-transparent border-b border-black/20 py-2 focus:outline-none focus:border-black transition-colors text-sm font-semibold placeholder:font-normal placeholder:opacity-50"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1 block">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 font-serif font-bold italic opacity-60">
                ¥
              </span>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full bg-transparent border-b border-black/20 py-2 pl-5 focus:outline-none focus:border-black transition-colors font-serif italic font-bold text-lg placeholder:font-normal placeholder:text-sm placeholder:opacity-50"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {editRecord && (
              <button
                type="button"
                onClick={handleDelete}
                className="mt-2 w-12 h-12 shrink-0 border border-red-200 text-red-500 rounded-full hover:bg-red-50 hover:border-red-500 transition-colors flex items-center justify-center transition-all bg-white"
                title="Delete Entry"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              className="mt-2 w-full h-12 bg-[#1A1A1A] text-[#FAF9F6] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
