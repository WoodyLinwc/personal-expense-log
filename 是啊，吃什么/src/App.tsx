import { useState, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthData, formatDateKey, isSameDay } from "./lib/dateUtils";
import { useRecords } from "./hooks/useRecords";
import { Sidebar } from "./components/Sidebar";
import { AddEntryModal } from "./components/AddEntryModal";
import { TotalSpentModal } from "./components/TotalSpentModal";
import { CATEGORY_COLORS, CUSTOM_COLORS, RecordItem } from "./types";

export default function App() {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTotalModalOpen, setIsTotalModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    records,
    addRecord,
    removeRecord,
    updateRecord,
    exportRecords,
    parseAndImport,
  } = useRecords();

  const prevMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(now);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-imported if needed
    const result = await parseAndImport(file);
    if (result.success) {
      setImportStatus("✓ Imported");
    } else {
      setImportStatus(`✗ ${result.error ?? "Import failed"}`);
    }
    setTimeout(() => setImportStatus(null), 3000);
  };

  const monthDays = useMemo(
    () => getMonthData(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const monthTotal = useMemo(() => {
    const targetPrefix = `${viewDate.getFullYear()}-${String(
      viewDate.getMonth() + 1,
    ).padStart(2, "0")}`;
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
      .forEach((r) => {
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
    <div className="w-full h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans flex overflow-hidden relative">
      <main className="flex-1 flex flex-col z-10">
        <header className="h-24 px-10 flex items-center justify-between border-b border-[rgba(0,0,0,0.05)] shrink-0 bg-[#FAF9F6]/80 backdrop-blur-md">
          <div className="flex items-baseline gap-4">
            <h1 className="font-serif text-3xl sm:text-5xl tracking-tighter">
              是啊，吃什么
            </h1>
            <span className="text-[10px] sm:text-sm font-semibold uppercase tracking-widest opacity-40 hidden sm:inline-block">
              Life Expense Log
            </span>
          </div>
          <div className="flex items-center gap-6 sm:gap-8">
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

            {/* Import / Export */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={exportRecords}
                title="Download a JSON backup of all your records"
                className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 border border-black/20 px-3 py-1.5 rounded-full transition-all"
              >
                ↓ Export
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Import records from a JSON backup"
                className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 border border-black/20 px-3 py-1.5 rounded-full transition-all"
              >
                ↑ Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              {importStatus && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${importStatus.startsWith("✓") ? "text-green-600" : "text-red-500"}`}
                >
                  {importStatus}
                </span>
              )}
            </div>

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

        <section className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-8 lg:p-12 relative z-10">
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
            <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto min-h-0 bg-transparent">
              {monthDays.map((day, idx) => {
                const key = formatDateKey(day.date);
                const isToday = isSameDay(day.date, new Date());
                const isSelected = isSameDay(day.date, selectedDate);
                const dailyRecords = records[key] || [];
                const dailyTotal = dailyRecords.reduce(
                  (sum, r) => sum + r.cost,
                  0,
                );

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
                    className={`border-r border-b border-[rgba(0,0,0,0.08)] p-3 transition-colors cursor-pointer flex flex-col relative select-none
                      ${(idx + 1) % 7 === 0 ? "border-r-0" : ""}
                      ${idx >= monthDays.length - 7 ? "border-b-0" : ""}
                      ${dayBgClass ? (day.isCurrentMonth ? dayBgClass : `${dayBgClass} opacity-40`) : day.isCurrentMonth ? "bg-white/60" : "bg-transparent opacity-40"}
                      ${isSelected ? "ring-2 ring-black ring-inset z-10" : "hover:brightness-95"}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <span
                        className={`font-bold text-sm ${day.isCurrentMonth ? "" : "italic opacity-60"} ${isToday ? "bg-black text-white w-6 h-6 flex items-center justify-center rounded-full text-xs" : ""}`}
                      >
                        {isToday
                          ? day.date.getDate()
                          : String(day.date.getDate()).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 overflow-y-auto scrollbar-none flex-1 min-h-0 z-10 w-full relative">
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

      <div className="absolute -bottom-16 -left-16 w-64 h-64 border border-black rounded-full opacity-5 pointer-events-none"></div>
      <div className="absolute top-1/2 -right-32 w-80 h-80 border border-black rounded-full opacity-5 pointer-events-none"></div>
    </div>
  );
}
