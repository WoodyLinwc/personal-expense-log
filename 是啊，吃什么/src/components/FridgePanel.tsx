import { useState, useEffect, useRef, type ReactNode } from "react";
import { X, Plus, Minus, Trash2, ShoppingCart, Snowflake } from "lucide-react";
import { FridgeItem } from "../types";

const DEFAULT_LOW_STOCK = 1;

// ─── Individual Item Jar ───────────────────────────────────────────────────────

interface ItemJarProps {
  item: FridgeItem;
  autoFocus?: boolean;
  onUpdate: (id: string, patch: Partial<Omit<FridgeItem, "id">>) => void;
  onAdjust: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

function ItemJar({
  item,
  autoFocus,
  onUpdate,
  onAdjust,
  onRemove,
}: ItemJarProps) {
  const [name, setName] = useState(item.name);
  const nameRef = useRef<HTMLInputElement>(null);
  const lowStock = item.quantity <= (item.lowStockAt ?? DEFAULT_LOW_STOCK);

  useEffect(() => {
    setName(item.name);
  }, [item.name]);

  useEffect(() => {
    if (autoFocus && nameRef.current) nameRef.current.focus();
  }, [autoFocus]);

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== item.name) onUpdate(item.id, { name: trimmed });
    else setName(item.name);
  };

  return (
    <div
      className={`relative group rounded-2xl p-3.5 flex flex-col gap-2.5 border transition-all
        ${
          lowStock
            ? "bg-red-50/90 border-red-200 shadow-[0_2px_10px_rgba(220,38,38,0.08)]"
            : "bg-white/90 border-sky-100 shadow-[0_2px_10px_rgba(30,64,120,0.06)]"
        }`}
    >
      {/* "Jar lid" accent */}
      <div
        className={`absolute -top-1.5 left-4 right-4 h-2 rounded-full ${
          lowStock ? "bg-red-200" : "bg-sky-100"
        }`}
      />

      <button
        onClick={() => onRemove(item.id)}
        aria-label="Delete item"
        className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 sm:opacity-0 hover:!opacity-100 active:opacity-100 hover:bg-black/5 transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5 opacity-50" />
      </button>

      <input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleNameBlur}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="w-full bg-transparent outline-none text-sm font-bold truncate pr-6"
      />

      {lowStock && (
        <span className="text-[9px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1 -mt-1.5">
          <ShoppingCart className="w-3 h-3" />
          该补货了
        </span>
      )}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAdjust(item.id, -1)}
            aria-label="Decrease quantity"
            className="w-8 h-8 flex items-center justify-center rounded-full border border-black/10 bg-white hover:bg-black/5 active:scale-95 transition-all touch-manipulation"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-7 text-center text-base font-serif italic font-bold tabular-nums">
            {item.quantity}
          </span>
          <button
            onClick={() => onAdjust(item.id, 1)}
            aria-label="Increase quantity"
            className="w-8 h-8 flex items-center justify-center rounded-full border border-black/10 bg-white hover:bg-black/5 active:scale-95 transition-all touch-manipulation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {item.unit && (
          <span className="text-[10px] opacity-40 font-medium max-w-[48px] truncate">
            {item.unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Shelf (section of items with a glass-shelf divider under it) ─────────────

function Shelf({
  title,
  icon,
  tone,
  items,
  autoFocusId,
  onUpdate,
  onAdjust,
  onRemove,
}: {
  title: string;
  icon: ReactNode;
  tone: "warn" | "neutral";
  items: FridgeItem[];
  autoFocusId: string | null;
  onUpdate: ItemJarProps["onUpdate"];
  onAdjust: ItemJarProps["onAdjust"];
  onRemove: ItemJarProps["onRemove"];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2">
      <div
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-3 px-1
          ${tone === "warn" ? "text-red-500" : "opacity-40"}`}
      >
        {icon}
        {title}
        <span className="tabular-nums opacity-60">({items.length})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <ItemJar
            key={item.id}
            item={item}
            autoFocus={item.id === autoFocusId}
            onUpdate={onUpdate}
            onAdjust={onAdjust}
            onRemove={onRemove}
          />
        ))}
      </div>
      {/* Glass shelf edge */}
      <div className="h-2.5 mt-5 mx-1 rounded-full bg-gradient-to-b from-white/90 to-sky-50/40 shadow-[0_5px_8px_-2px_rgba(30,64,120,0.15)] border-t border-white/60" />
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface FridgePanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: FridgeItem[];
  onAdd: (
    name: string,
    quantity?: number,
    unit?: string,
    lowStockAt?: number,
  ) => void;
  onAdjust: (id: string, delta: number) => void;
  onUpdate: (id: string, patch: Partial<Omit<FridgeItem, "id">>) => void;
  onRemove: (id: string) => void;
}

export function FridgePanel({
  isOpen,
  onClose,
  items,
  onAdd,
  onAdjust,
  onUpdate,
  onRemove,
}: FridgePanelProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the add-form and give it focus each time the fridge opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setUnit("");
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => setFocusId(null), 600);
    return () => clearTimeout(t);
  }, [focusId]);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, 1, unit.trim() || undefined, DEFAULT_LOW_STOCK);
    setName("");
    setUnit("");
    inputRef.current?.focus();
  };

  const lowStock = items.filter(
    (it) => it.quantity <= (it.lowStockAt ?? DEFAULT_LOW_STOCK),
  );
  const stocked = items.filter(
    (it) => it.quantity > (it.lowStockAt ?? DEFAULT_LOW_STOCK),
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#eef6fb] via-[#eaf3f9] to-[#e3eef6]
        transition-all duration-300 ease-out
        ${isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-[1.02] pointer-events-none"}`}
      role="dialog"
      aria-modal="true"
      aria-label="Fridge inventory"
    >
      {/* Frosty top texture */}
      <div
        className="absolute top-0 left-0 right-0 h-6 opacity-60 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(255,255,255,0.9) 0px, rgba(255,255,255,0.9) 2px, transparent 2px, transparent 14px)",
        }}
      />

      {/* ── Header: brushed-steel door bar ─────────────────────────────── */}
      <div className="relative shrink-0 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-white/80 to-white/40 backdrop-blur-md border-b border-white/60 shadow-[0_2px_12px_rgba(30,64,120,0.06)]">
        <div className="flex items-center justify-between px-4 sm:px-8 h-16 sm:h-20">
          <div className="flex items-center gap-2 min-w-0">
            <Snowflake className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 shrink-0" />
            <h2 className="font-serif text-xl sm:text-3xl tracking-tight truncate">
              冰箱库存
            </h2>
            {items.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 tabular-nums shrink-0 mt-0.5">
                {items.length}
              </span>
            )}
            {lowStock.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-red-400 rounded-full px-2 py-0.5 tabular-nums shrink-0">
                {lowStock.length} 待补
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close fridge"
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-95 transition-all touch-manipulation"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* ── Shelves (scrollable interior) ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-5 pb-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30 select-none pointer-events-none">
            <Snowflake className="w-12 h-12" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-center leading-relaxed">
              冰箱是空的
              <br />
              在下面加第一件物品吧
            </p>
          </div>
        ) : (
          <>
            <Shelf
              title="该补货了"
              icon={<ShoppingCart className="w-3 h-3" />}
              tone="warn"
              items={lowStock}
              autoFocusId={focusId}
              onUpdate={onUpdate}
              onAdjust={onAdjust}
              onRemove={onRemove}
            />
            <Shelf
              title="库存充足"
              icon={<Snowflake className="w-3 h-3" />}
              tone="neutral"
              items={stocked}
              autoFocusId={focusId}
              onUpdate={onUpdate}
              onAdjust={onAdjust}
              onRemove={onRemove}
            />
          </>
        )}
      </div>

      {/* ── Sticky add-item bar (thumb-reachable on mobile) ────────────── */}
      <div className="shrink-0 px-4 sm:px-8 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 bg-gradient-to-t from-white/90 to-white/0 backdrop-blur-sm">
        <div className="flex gap-2 max-w-xl mx-auto">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="加一件物品，比如 鸡蛋"
            className="flex-1 min-w-0 h-12 px-4 rounded-full border border-black/10 bg-white shadow-sm text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all"
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="单位"
            className="w-20 h-12 px-3 rounded-full border border-black/10 bg-white shadow-sm text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            aria-label="Add item"
            className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-black text-white disabled:opacity-30 active:scale-95 transition-all touch-manipulation shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
