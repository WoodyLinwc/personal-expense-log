import React from "react";
import { Trash2, Plus } from "lucide-react";
import { RecordItem, CATEGORIES } from "../types";
import { formatDateKey } from "../lib/dateUtils";

interface SidebarProps {
  selectedDate: Date;
  dailyRecords: RecordItem[];
  onRemove: (dateKey: string, id: string) => void;
  onOpenAdd: () => void;
  onEditRecord: (record: RecordItem) => void;
}

export function Sidebar({
  selectedDate,
  dailyRecords,
  onRemove,
  onOpenAdd,
  onEditRecord,
}: SidebarProps) {
  const dateKey = formatDateKey(selectedDate);
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

  const totalCost = dailyRecords.reduce((sum, r) => sum + r.cost, 0);

  const getCategoryLabel = (cat?: string) => {
    const c = CATEGORIES.find((x) => x.id === (cat || "food"));
    return c ? c.label : "🍔 餐饮 Food";
  };

  return (
    <aside className="w-full md:w-[320px] border-t md:border-t-0 md:border-l border-[rgba(0,0,0,0.05)] bg-white/40 backdrop-blur-xl p-5 sm:p-8 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-8 flex flex-col shrink-0 z-20 md:h-full">
      {/* Target Date Summary */}
      <div className="mb-6 md:mb-10">
        <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">
          Track Diet
        </h3>
        <p className="font-serif text-2xl sm:text-3xl font-bold italic border-b border-black/10 pb-4">
          {formattedDate}
        </p>
      </div>

      {/* List of records */}
      <div className="md:flex-1 md:overflow-y-auto md:min-h-0 mb-6 pr-0 md:pr-2 scrollbar-none">
        <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4 tracking-wider">
          Entries
        </h3>

        {dailyRecords.length === 0 ? (
          <p className="font-serif text-sm opacity-30 italic">
            No entries for this day.
          </p>
        ) : (
          <ul className="space-y-4">
            {dailyRecords.map((record) => {
              const isColorOnly =
                !record.description &&
                (!record.cost || record.cost === 0) &&
                record.customColor;
              return (
                <li
                  key={record.id}
                  onDoubleClick={() => onEditRecord(record)}
                  className="group flex justify-between items-start border-b border-black/5 pb-2 cursor-pointer hover:bg-black/5 p-2 -mx-2 rounded transition-colors select-none"
                  title="Double click to edit"
                >
                  <div className="flex flex-col">
                    {isColorOnly ? (
                      <span className="font-semibold text-sm capitalize">
                        {record.customColor} Background
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold text-sm">
                          {record.description ? record.description : "\u00A0"}
                        </span>
                        <span className="text-[10px] opacity-40 font-bold uppercase mt-1">
                          {getCategoryLabel(record.category)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {record.cost > 0 && (
                      <span className="font-serif font-bold italic">
                        ¥{record.cost}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(dateKey, record.id);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                      }}
                      className="opacity-60 md:opacity-0 md:group-hover:opacity-100 hover:text-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add Form / Button */}
      <div className="mt-2 md:mt-auto pt-4">
        <button
          onClick={onOpenAdd}
          className="w-full h-12 bg-[#1A1A1A] text-[#FAF9F6] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>
    </aside>
  );
}
