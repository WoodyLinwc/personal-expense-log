import { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { StickyNote, StickyNoteColor, STICKY_NOTE_COLORS } from "../types";

const NOTE_COLOR_KEYS: StickyNoteColor[] = [
  "yellow",
  "pink",
  "blue",
  "green",
  "purple",
];

// ─── Individual Note Card ─────────────────────────────────────────────────────

interface NoteCardProps {
  note: StickyNote;
  autoFocus?: boolean;
  onUpdate: (id: string, content: string, color?: StickyNoteColor) => void;
  onRemove: (id: string) => void;
}

function NoteCard({ note, autoFocus, onUpdate, onRemove }: NoteCardProps) {
  const [content, setContent] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { bg, border, text, dot } = STICKY_NOTE_COLORS[note.color];

  // Sync if note is updated externally (e.g. after import)
  useEffect(() => {
    setContent(note.content);
  }, [note.content]);

  // Auto-focus newly created notes
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [content]);

  const handleBlur = () => {
    if (content !== note.content) {
      onUpdate(note.id, content);
    }
  };

  return (
    <div
      className={`${bg} border ${border} rounded-xl p-4 relative group flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Delete button — appears on hover */}
      <button
        onClick={() => onRemove(note.id)}
        aria-label="Delete note"
        className={`absolute top-3 right-3 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity ${text}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Editable content */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder="Write a note…"
        rows={1}
        className={`w-full bg-transparent resize-none outline-none text-sm leading-relaxed ${text} placeholder:opacity-40 font-medium pr-6 min-h-[52px]`}
        style={{ overflow: "hidden" }}
      />

      {/* Color picker dots */}
      <div className="flex items-center gap-2">
        {NOTE_COLOR_KEYS.map((c) => (
          <button
            key={c}
            onClick={() => onUpdate(note.id, content, c)}
            aria-label={`Color: ${c}`}
            className={`w-3 h-3 rounded-full ${STICKY_NOTE_COLORS[c].dot} transition-transform
              ${
                note.color === c
                  ? "scale-125 ring-2 ring-offset-1 ring-black/20"
                  : "opacity-50 hover:opacity-100 hover:scale-110"
              }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface StickyNotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notes: StickyNote[];
  onAdd: (content?: string, color?: StickyNoteColor) => string;
  onUpdate: (id: string, content: string, color?: StickyNoteColor) => void;
  onRemove: (id: string) => void;
}

export function StickyNotesPanel({
  isOpen,
  onClose,
  notes,
  onAdd,
  onUpdate,
  onRemove,
}: StickyNotesPanelProps) {
  const [focusId, setFocusId] = useState<string | null>(null);

  const handleAdd = () => {
    const id = onAdd("", "yellow");
    setFocusId(id);
  };

  // Clear focus id shortly after use — the card only needs it on first render
  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => setFocusId(null), 600);
    return () => clearTimeout(t);
  }, [focusId]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/10 backdrop-blur-[2px] transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed right-0 top-0 h-dvh w-full sm:w-80 bg-[#FAF9F6] border-l border-[rgba(0,0,0,0.08)]
          z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header — matches app header height */}
        <div className="h-24 px-6 flex items-center justify-between border-b border-[rgba(0,0,0,0.05)] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-base select-none">📌</span>
            <h2 className="font-serif text-2xl tracking-tight">Notes</h2>
            {notes.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-30 mt-0.5 tabular-nums">
                {notes.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAdd}
              aria-label="Add note"
              className="opacity-40 hover:opacity-100 transition-opacity"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close notes"
              className="opacity-40 hover:opacity-100 transition-opacity"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex flex-col gap-3">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20 opacity-30 select-none pointer-events-none">
              <span className="text-4xl">📝</span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-center leading-relaxed">
                No notes yet.
                <br />
                Click + to add one.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                autoFocus={note.id === focusId}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
