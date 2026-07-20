import { useState, useMemo, useEffect, type ChangeEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Cloud,
  CloudOff,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react";
import { getMonthData, formatDateKey, isSameDay } from "./lib/dateUtils";
import { useAuth } from "./hooks/useAuth";
import { useRecords } from "./hooks/useRecords";
import { useStickyNotes } from "./hooks/useStickyNotes";
import { useFridgeItems } from "./hooks/useFridgeItems";
import { useCloudSync } from "./hooks/useCloudSync";
import { Sidebar } from "./components/Sidebar";
import { AddEntryModal } from "./components/AddEntryModal";
import { TotalSpentModal } from "./components/TotalSpentModal";
import { StickyNotesPanel } from "./components/StickyNotesPanel";
import { FridgePanel } from "./components/FridgePanel";
import {
  CATEGORY_COLORS,
  CUSTOM_COLORS,
  RecordItem,
  RecordsData,
  StickyNote,
  FridgeItem,
} from "./types";

// ─── Import / Export helpers ──────────────────────────────────────────────────

function isValidRecordsData(data: unknown): data is RecordsData {
  if (typeof data !== "object" || data === null || Array.isArray(data))
    return false;
  return Object.entries(data).every(
    ([, val]) =>
      Array.isArray(val) &&
      val.every(
        (r) =>
          typeof r === "object" &&
          r !== null &&
          typeof (r as any).id === "string" &&
          typeof (r as any).description === "string" &&
          typeof (r as any).cost === "number",
      ),
  );
}

function isValidNotes(data: unknown): data is StickyNote[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (n) =>
      typeof n === "object" &&
      n !== null &&
      typeof (n as any).id === "string" &&
      typeof (n as any).content === "string",
  );
}

function isValidFridgeItems(data: unknown): data is FridgeItem[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (it) =>
      typeof it === "object" &&
      it !== null &&
      typeof (it as any).id === "string" &&
      typeof (it as any).name === "string" &&
      typeof (it as any).quantity === "number",
  );
}

/** Parses a JSON export file (v3, v2, or legacy). Returns parsed data or an error string. */
function parseExportFile(
  raw: unknown,
):
  | { records: RecordsData; notes: StickyNote[]; fridgeItems: FridgeItem[] }
  | { error: string } {
  if (typeof raw !== "object" || raw === null)
    return { error: "Invalid file format." };

  // v3 format: { version: 3, records: {...}, notes: [...], fridgeItems: [...] }
  if ("version" in raw && (raw as any).version === 3) {
    const { records, notes, fridgeItems } = raw as any;
    if (!isValidRecordsData(records)) return { error: "Invalid records data." };
    if (!isValidNotes(notes)) return { error: "Invalid notes data." };
    if (!isValidFridgeItems(fridgeItems))
      return { error: "Invalid fridge data." };
    return { records, notes, fridgeItems };
  }

  // v2 format: { version: 2, records: {...}, notes: [...] } — no fridge data yet
  if ("version" in raw && (raw as any).version === 2) {
    const { records, notes } = raw as any;
    if (!isValidRecordsData(records)) return { error: "Invalid records data." };
    if (!isValidNotes(notes)) return { error: "Invalid notes data." };
    return { records, notes, fridgeItems: [] };
  }

  // Legacy format: bare RecordsData object
  if (isValidRecordsData(raw)) {
    return { records: raw, notes: [], fridgeItems: [] };
  }

  return { error: "Unrecognized file format." };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { user, loading, error, signInWithGoogle, signOutUser } = useAuth();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTotalModalOpen, setIsTotalModalOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isFridgeOpen, setIsFridgeOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBackupMenuOpen, setIsBackupMenuOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(false);

  const {
    records,
    addRecord,
    removeRecord,
    updateRecord,
    replaceAllRecords,
    mergeAllRecords,
  } = useRecords(user?.uid ?? null, syncEnabled);
  const {
    notes,
    addNote,
    updateNote,
    removeNote,
    replaceAllNotes,
    mergeAllNotes,
  } = useStickyNotes(user?.uid ?? null, syncEnabled);
  const {
    items: fridgeItems,
    addItem: addFridgeItem,
    adjustQuantity: adjustFridgeQuantity,
    updateItem: updateFridgeItem,
    removeItem: removeFridgeItem,
    replaceAllItems: replaceAllFridgeItems,
    mergeAllItems: mergeAllFridgeItems,
  } = useFridgeItems(user?.uid ?? null, syncEnabled);

  const { conflict, markResolved } = useCloudSync(
    user?.uid ?? null,
    records,
    notes,
    fridgeItems,
    setSyncEnabled,
  );

  // Local was empty and cloud had data — silently adopt the cloud version,
  // nothing local would be lost, so there's nothing worth asking about.
  useEffect(() => {
    if (conflict?.autoAdopt) {
      replaceAllRecords(conflict.cloudRecords);
      replaceAllNotes(conflict.cloudNotes);
      replaceAllFridgeItems(conflict.cloudFridgeItems);
      markResolved();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conflict]);

  const resolveConflict = (choice: "local" | "cloud" | "merge") => {
    if (!conflict) return;
    if (choice === "cloud") {
      replaceAllRecords(conflict.cloudRecords);
      replaceAllNotes(conflict.cloudNotes);
      replaceAllFridgeItems(conflict.cloudFridgeItems);
    } else if (choice === "merge") {
      mergeAllRecords(conflict.cloudRecords);
      mergeAllNotes(conflict.cloudNotes);
      mergeAllFridgeItems(conflict.cloudFridgeItems);
    }
    // choice === "local": keep current local state as-is, just start syncing.
    markResolved();
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const payload = { version: 3, records, notes, fridgeItems };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense_records_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const result = parseExportFile(raw);

        if ("error" in result) {
          setImportStatus(`✗ ${result.error}`);
          setTimeout(() => setImportStatus(null), 3000);
          return;
        }

        const totalDays = Object.keys(result.records).length;
        const totalRecords = Object.values(result.records).flat().length;
        const notesCount = result.notes.length;
        const fridgeCount = result.fridgeItems.length;

        const replace = window.confirm(
          `Import ${totalRecords} record(s) across ${totalDays} day(s)` +
            (notesCount ? ` and ${notesCount} note(s)` : "") +
            (fridgeCount ? ` and ${fridgeCount} fridge item(s)` : "") +
            ".\n\nOK → Replace all existing data\nCancel → Merge (keep existing, add new)",
        );

        if (replace) {
          replaceAllRecords(result.records);
          replaceAllNotes(result.notes);
          replaceAllFridgeItems(result.fridgeItems);
        } else {
          mergeAllRecords(result.records);
          mergeAllNotes(result.notes);
          mergeAllFridgeItems(result.fridgeItems);
        }

        setImportStatus("✓ Imported");
      } catch {
        setImportStatus("✗ Could not parse JSON file.");
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.onerror = () => {
      setImportStatus("✗ Could not read file.");
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
  };

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const prevMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(now);
  };

  const monthDays = useMemo(
    () => getMonthData(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const monthTotal = useMemo(() => {
    const targetPrefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;
    return Object.entries(records).reduce((sum, [key, dayRecs]) => {
      if (key.startsWith(targetPrefix) && Array.isArray(dayRecs)) {
        return sum + dayRecs.reduce((daySum, r) => daySum + r.cost, 0);
      }
      return sum;
    }, 0);
  }, [viewDate, records]);

  const { lifetimeTotal, monthlyTotals } = useMemo(() => {
    let total = 0;
    const months: Record<string, number> = {};
    Object.entries(records).forEach(([dateKey, dayRecs]) => {
      if (!Array.isArray(dayRecs)) return;
      const monthKey = dateKey.substring(0, 7);
      const dayTotal = dayRecs.reduce((sum, r) => sum + r.cost, 0);
      total += dayTotal;
      months[monthKey] = (months[monthKey] || 0) + dayTotal;
    });
    const sortedMonths = Object.entries(months).sort((a, b) =>
      b[0].localeCompare(a[0]),
    );
    return { lifetimeTotal: total, monthlyTotals: sortedMonths };
  }, [records]);

  const frequentEntries = useMemo(() => {
    const counts = new Map<
      string,
      {
        entry: Omit<RecordItem, "id" | "createdAt">;
        count: number;
        lastUsed: number;
      }
    >();
    Object.values(records)
      .flat()
      .forEach((r: RecordItem) => {
        if (!r) return;
        const key = `${r.description}|${r.cost}|${r.category || "food"}|${r.customColor || ""}`;
        if (!counts.has(key)) {
          counts.set(key, {
            entry: {
              description: r.description,
              cost: r.cost,
              category: r.category || "food",
              customColor: r.customColor,
            },
            count: 0,
            lastUsed: 0,
          });
        }
        const stat = counts.get(key)!;
        stat.count++;
        if (r.createdAt > stat.lastUsed) stat.lastUsed = r.createdAt;
      });
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
      .slice(0, 8)
      .map(
        (x) => x.entry as { description: string; cost: number; category: any },
      );
  }, [records]);

  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDayRecords = records[selectedDateKey] || [];

  const handleDoubleDateClick = (date: Date) => {
    setSelectedDate(date);
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEditRecord = (date: Date, record: RecordItem) => {
    setSelectedDate(date);
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full min-h-dvh md:min-h-0 md:h-dvh bg-[#FAF9F6] text-[#1A1A1A] font-sans flex flex-col md:flex-row overflow-x-clip md:overflow-hidden relative">
      <main className="flex flex-col z-10 md:flex-1 min-h-0">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="relative z-20 min-h-24 px-4 sm:px-10 pt-4 sm:pt-6 pb-4 sm:pb-5 flex flex-wrap sm:flex-nowrap items-end justify-between gap-y-3 border-b border-[rgba(0,0,0,0.05)] shrink-0 bg-[#FAF9F6]/80 backdrop-blur-md">
          <input
            id="import-file-input"
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
            onClick={() => {
              setIsBackupMenuOpen(false);
              setIsMobileMenuOpen(false);
            }}
          />

          <div className="shrink-0 min-w-0">
            <h1 className="font-serif text-3xl sm:text-5xl tracking-tighter leading-[1.3] py-1 whitespace-nowrap">
              是啊，吃什么。
            </h1>
          </div>

          {/* Mobile: collapse Today/Sync/Notes/Fridge/Export/Import/Totals into one menu.
              Sits on the first row next to the title; the month nav wraps to a second row. */}
          <button
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            className="sm:hidden p-2 mb-1.5 shrink-0 rounded-full border border-black/20 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="More options"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <MoreHorizontal className="w-5 h-5" />
            )}
          </button>

          <div className="flex items-center gap-6 sm:gap-8 w-full sm:w-auto justify-center sm:justify-end">
            {/* Month navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-1 px-2 opacity-30 hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="text-center font-bold uppercase tracking-widest w-24">
                {String(viewDate.getMonth() + 1).padStart(2, "0")} /{" "}
                {viewDate.getFullYear()}
              </div>
              <button
                onClick={nextMonth}
                className="p-1 px-2 opacity-30 hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={goToday}
              className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 border border-black/20 px-3 py-1.5 rounded-full transition-all hidden sm:block"
            >
              Today
            </button>

            {loading ? (
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-30 border border-black/10 px-4 py-2 rounded-full hidden sm:flex items-center gap-1.5">
                <Cloud className="w-3 h-3 animate-pulse" />
                <span className="animate-pulse">···</span>
              </div>
            ) : user ? (
              <button
                onClick={signOutUser}
                title={`Synced as ${user.email ?? "Google account"} — click to sign out`}
                className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 border border-black/20 px-3 py-1.5 rounded-full transition-all hidden sm:flex items-center gap-1.5"
              >
                <Cloud className="w-3 h-3" />
                Synced
                <LogOut className="w-3 h-3 opacity-60" />
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                title="Optional: sign in with Google to back up and sync your data across devices"
                className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-4 py-2 rounded-full transition-all hidden sm:flex items-center gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <CloudOff className="w-3 h-3" />
                Sign in to sync
              </button>
            )}
            {error && (
              <span className="hidden sm:block text-[10px] text-red-500 max-w-[160px] truncate">
                {error}
              </span>
            )}

            {/* Utility buttons: Notes, Fridge, Export, Import */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Notes toggle */}
              <button
                onClick={() => setIsNotesOpen(true)}
                className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 border border-black/20 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
              >
                📌 Notes
                {notes.length > 0 && (
                  <span className="bg-black/10 rounded-full px-1.5 tabular-nums">
                    {notes.length}
                  </span>
                )}
              </button>

              {/* Fridge toggle */}
              <button
                onClick={() => setIsFridgeOpen(true)}
                className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 border border-black/20 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
              >
                🧊 Fridge
                {fridgeItems.length > 0 && (
                  <span className="bg-black/10 rounded-full px-1.5 tabular-nums">
                    {fridgeItems.length}
                  </span>
                )}
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsBackupMenuOpen((v) => !v)}
                  title="Export or import a JSON backup of all records, notes, and fridge items"
                  className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 border border-black/20 px-3 py-1.5 rounded-full transition-all flex items-center gap-1"
                >
                  Backup ▾
                </button>
                {isBackupMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsBackupMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 z-40 bg-[#FAF9F6] border border-black/10 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                      <button
                        onClick={() => {
                          handleExport();
                          setIsBackupMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-colors"
                      >
                        ↓ Export
                      </button>
                      <label
                        htmlFor="import-file-input"
                        className="block w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-colors border-t border-black/5 cursor-pointer"
                      >
                        ↑ Import
                      </label>
                    </div>
                  </>
                )}
              </div>

              {importStatus && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${
                    importStatus.startsWith("✓")
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {importStatus}
                </span>
              )}
            </div>

            {/* Totals */}
            <div className="flex items-center gap-6 hidden md:flex">
              <div
                className="text-right cursor-pointer group"
                onClick={() => setIsTotalModalOpen(true)}
              >
                <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold group-hover:opacity-100 transition-opacity">
                  Total Spent{" "}
                  <span className="opacity-0 group-hover:opacity-100">
                    &rarr;
                  </span>
                </p>
                <p className="font-serif text-2xl italic opacity-50 group-hover:opacity-100 transition-opacity">
                  ¥{lifetimeTotal.toFixed(2)}
                </p>
              </div>
              <div className="w-[1px] h-8 bg-black/10"></div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">
                  Monthly Spent
                </p>
                <p className="font-serif text-3xl italic">
                  ¥{monthTotal.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Mobile menu (Today / Sync / Notes / Fridge / Export / Import / Totals) ── */}
        {isMobileMenuOpen && (
          <div className="relative sm:hidden border-b border-[rgba(0,0,0,0.05)] bg-[#FAF9F6]/95 backdrop-blur-md px-5 py-4 flex flex-col gap-3 z-20">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">
                  Monthly Spent
                </p>
                <p className="font-serif text-xl italic">
                  ¥{monthTotal.toFixed(2)}
                </p>
              </div>
              <div className="w-[1px] h-8 bg-black/10"></div>
              <button
                className="text-left"
                onClick={() => {
                  setIsTotalModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
              >
                <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">
                  Total Spent &rarr;
                </p>
                <p className="font-serif text-xl italic opacity-70">
                  ¥{lifetimeTotal.toFixed(2)}
                </p>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => {
                  goToday();
                  setIsMobileMenuOpen(false);
                }}
                className="text-[10px] font-bold uppercase tracking-widest opacity-60 border border-black/20 px-3 py-1.5 rounded-full"
              >
                Today
              </button>

              {loading ? (
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-30 border border-black/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Cloud className="w-3 h-3 animate-pulse" />
                  <span className="animate-pulse">···</span>
                </div>
              ) : user ? (
                <button
                  onClick={signOutUser}
                  className="text-[10px] font-bold uppercase tracking-widest opacity-60 border border-black/20 px-3 py-1.5 rounded-full flex items-center gap-1.5"
                >
                  <Cloud className="w-3 h-3" />
                  Synced
                  <LogOut className="w-3 h-3 opacity-60" />
                </button>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-3 py-1.5 rounded-full flex items-center gap-1.5"
                >
                  <CloudOff className="w-3 h-3" />
                  Sign in to sync
                </button>
              )}

              <button
                onClick={() => {
                  setIsNotesOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="text-[10px] font-bold uppercase tracking-widest opacity-60 border border-black/20 px-3 py-1.5 rounded-full flex items-center gap-1.5"
              >
                📌 Notes
                {notes.length > 0 && (
                  <span className="bg-black/10 rounded-full px-1.5 tabular-nums">
                    {notes.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setIsFridgeOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="text-[10px] font-bold uppercase tracking-widest opacity-60 border border-black/20 px-3 py-1.5 rounded-full flex items-center gap-1.5"
              >
                🧊 Fridge
                {fridgeItems.length > 0 && (
                  <span className="bg-black/10 rounded-full px-1.5 tabular-nums">
                    {fridgeItems.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  handleExport();
                  setIsMobileMenuOpen(false);
                }}
                className="text-[10px] font-bold uppercase tracking-widest opacity-60 border border-black/20 px-3 py-1.5 rounded-full"
              >
                ↓ Export
              </button>

              <label
                htmlFor="import-file-input"
                className="text-[10px] font-bold uppercase tracking-widest opacity-60 border border-black/20 px-3 py-1.5 rounded-full cursor-pointer"
              >
                ↑ Import
              </label>
            </div>

            {error && <span className="text-[10px] text-red-500">{error}</span>}
            {importStatus && (
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  importStatus.startsWith("✓")
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {importStatus}
              </span>
            )}
          </div>
        )}

        {/* ── Calendar ───────────────────────────────────────────────────── */}
        <section className="md:flex-1 flex flex-col md:h-full md:overflow-hidden p-2 sm:p-8 lg:p-12 relative z-10">
          <div className="flex-1 flex flex-col bg-[#FAF9F6]/60 backdrop-blur-md border border-[rgba(0,0,0,0.08)] rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-[rgba(0,0,0,0.08)] bg-[#FAF9F6]/80 shrink-0">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div
                  key={d}
                  className="py-3 text-center text-[10px] font-bold uppercase tracking-widest opacity-40"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-7 auto-rows-[minmax(76px,auto)] md:auto-rows-fr md:overflow-y-auto min-h-0 bg-transparent">
              {monthDays.map((day, idx) => {
                const key = formatDateKey(day.date);
                const isToday = isSameDay(day.date, new Date());
                const isSelected = isSameDay(day.date, selectedDate);
                const dailyRecords = records[key] || [];

                const colorRecords = dailyRecords.filter(
                  (r) =>
                    !r.description &&
                    (!r.cost || r.cost === 0) &&
                    r.customColor,
                );
                const dayBgClass =
                  colorRecords.length > 0
                    ? CUSTOM_COLORS[
                        colorRecords[colorRecords.length - 1].customColor!
                      ].split(" ")[0]
                    : null;
                const displayRecords = dailyRecords.filter(
                  (r) =>
                    r.description || (r.cost && r.cost > 0) || !r.customColor,
                );

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(day.date)}
                    onDoubleClick={() => handleDoubleDateClick(day.date)}
                    className={`border-r border-b border-[rgba(0,0,0,0.08)] p-1.5 sm:p-3 transition-colors cursor-pointer flex flex-col relative select-none touch-manipulation
                      ${(idx + 1) % 7 === 0 ? "border-r-0" : ""}
                      ${idx >= monthDays.length - 7 ? "border-b-0" : ""}
                      ${
                        dayBgClass
                          ? day.isCurrentMonth
                            ? dayBgClass
                            : `${dayBgClass} opacity-40`
                          : day.isCurrentMonth
                            ? "bg-white/60"
                            : "bg-transparent opacity-40"
                      }
                      ${isSelected ? "ring-2 ring-black ring-inset z-10" : "hover:brightness-95"}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <span
                        className={`font-bold text-sm ${day.isCurrentMonth ? "" : "italic opacity-60"} ${
                          isToday
                            ? "bg-black text-white w-6 h-6 flex items-center justify-center rounded-full text-xs"
                            : ""
                        }`}
                      >
                        {isToday
                          ? day.date.getDate()
                          : String(day.date.getDate()).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 overflow-hidden md:overflow-y-auto scrollbar-none flex-1 min-h-0 z-10 w-full relative">
                      {displayRecords.map((r) => {
                        const c =
                          (r.customColor && CUSTOM_COLORS[r.customColor]) ||
                          CATEGORY_COLORS[r.category || "food"] ||
                          CATEGORY_COLORS.food;
                        return (
                          <div
                            key={r.id}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleEditRecord(day.date, r);
                            }}
                            className={`text-[10px] sm:text-xs ${c} px-1.5 py-[3px] min-h-[22px] rounded flex items-center justify-between gap-1 w-full cursor-pointer hover:opacity-80 transition-opacity`}
                            title={
                              r.cost > 0
                                ? `${r.description} ¥${r.cost}`
                                : r.description
                            }
                          >
                            <span className="whitespace-nowrap overflow-hidden text-ellipsis font-medium flex-1 text-left">
                              {r.description || "\u00A0"}
                            </span>
                            {r.cost > 0 && (
                              <span className="shrink-0 font-bold">
                                ¥{r.cost}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {dailyRecords.length > 0 && (
                      <div className="absolute bottom-2 right-2 flex gap-1 z-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-black block opacity-30"></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ── Right sidebar ─────────────────────────────────────────────────── */}
      <Sidebar
        selectedDate={selectedDate}
        dailyRecords={selectedDayRecords}
        onRemove={removeRecord}
        onOpenAdd={() => {
          setEditingRecord(null);
          setIsModalOpen(true);
        }}
        onEditRecord={(record) => handleEditRecord(selectedDate, record)}
      />

      {/* ── Mobile floating "add entry" button ────────────────────────────
          On phones the sidebar's Add Entry button sits below the calendar,
          so give thumbs a fixed shortcut that's always reachable. */}
      <button
        onClick={() => {
          setEditingRecord(null);
          setIsModalOpen(true);
        }}
        aria-label="Add entry"
        className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-5 z-40 w-14 h-14 rounded-full bg-[#1A1A1A] text-[#FAF9F6] shadow-lg shadow-black/20 flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ── Modals & Panels ───────────────────────────────────────────────── */}
      <AddEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        onAdd={addRecord}
        onUpdate={updateRecord}
        onRemove={removeRecord}
        editRecord={editingRecord}
        frequentEntries={frequentEntries}
      />

      <TotalSpentModal
        isOpen={isTotalModalOpen}
        onClose={() => setIsTotalModalOpen(false)}
        lifetimeTotal={lifetimeTotal}
        monthlyTotals={monthlyTotals}
      />

      <StickyNotesPanel
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        notes={notes}
        onAdd={addNote}
        onUpdate={updateNote}
        onRemove={removeNote}
      />

      <FridgePanel
        isOpen={isFridgeOpen}
        onClose={() => setIsFridgeOpen(false)}
        items={fridgeItems}
        onAdd={addFridgeItem}
        onAdjust={adjustFridgeQuantity}
        onUpdate={updateFridgeItem}
        onRemove={removeFridgeItem}
      />

      {/* ── Cloud sync conflict ─────────────────────────────────────────── */}
      {conflict && !conflict.autoAdopt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-[#FAF9F6] w-full max-w-sm p-8 border border-[rgba(0,0,0,0.1)] shadow-2xl">
            <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">
              Cloud Sync
            </h2>
            <p className="font-serif text-xl font-bold italic border-b border-black/10 pb-4 mb-4">
              本地和云端数据不一样
            </p>
            <p className="text-sm opacity-70 mb-6 leading-relaxed">
              本地有 {conflict.localRecordCount} 条记录
              {conflict.localNoteCount > 0 &&
                ` / ${conflict.localNoteCount} 条便签`}
              {conflict.localFridgeCount > 0 &&
                ` / ${conflict.localFridgeCount} 件冰箱物品`}
              ，云端有 {conflict.cloudRecordCount} 条记录
              {conflict.cloudNoteCount > 0 &&
                ` / ${conflict.cloudNoteCount} 条便签`}
              {conflict.cloudFridgeCount > 0 &&
                ` / ${conflict.cloudFridgeCount} 件冰箱物品`}
              。选择要如何处理：
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => resolveConflict("merge")}
                className="w-full h-11 bg-[#1A1A1A] text-[#FAF9F6] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-colors"
              >
                两边合并（推荐）
              </button>
              <button
                onClick={() => resolveConflict("local")}
                className="w-full h-11 border border-black/20 rounded-full text-xs font-bold uppercase tracking-widest opacity-70 hover:opacity-100 transition-all"
              >
                只保留本地
              </button>
              <button
                onClick={() => resolveConflict("cloud")}
                className="w-full h-11 border border-black/20 rounded-full text-xs font-bold uppercase tracking-widest opacity-70 hover:opacity-100 transition-all"
              >
                只使用云端
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decorative circles */}
      <div className="absolute -bottom-16 -left-16 w-64 h-64 border border-black rounded-full opacity-5 pointer-events-none"></div>
      <div className="absolute top-1/2 -right-32 w-80 h-80 border border-black rounded-full opacity-5 pointer-events-none"></div>
    </div>
  );
}
