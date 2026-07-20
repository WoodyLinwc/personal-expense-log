import React from 'react';
import { X } from 'lucide-react';

interface TotalSpentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lifetimeTotal: number;
  monthlyTotals: [string, number][];
}

export function TotalSpentModal({ isOpen, onClose, lifetimeTotal, monthlyTotals }: TotalSpentModalProps) {
  if (!isOpen) return null;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm transition-opacity overflow-y-auto overscroll-contain">
      <div className="bg-[#FAF9F6] w-full max-w-sm p-8 border border-[rgba(0,0,0,0.1)] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90dvh] overflow-y-auto rounded-2xl sm:rounded-none">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 opacity-50 hover:opacity-100 hover:bg-black/5 rounded-full transition-all">
           <X className="w-6 h-6" />
        </button>
        <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Overall Total Spent</h2>
        <p className="font-serif text-3xl font-bold italic border-b border-black/10 pb-4 mb-6">¥{lifetimeTotal.toFixed(2)}</p>

        <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">Monthly Breakdown</h3>
        <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4 scrollbar-none">
           {monthlyTotals.length === 0 ? (
             <p className="text-sm opacity-50 italic font-serif">No records found.</p>
           ) : (
             monthlyTotals.map(([monthKey, total]) => {
               const [year, month] = monthKey.split('-');
               const date = new Date(parseInt(year), parseInt(month) - 1);
               const monthName = `${monthNames[date.getMonth()]} ${year}`;
               return (
                 <div key={monthKey} className="flex justify-between items-center border-b border-black/5 pb-2">
                   <span className="font-semibold text-sm">{monthName}</span>
                   <span className="font-serif font-bold italic">¥{total.toFixed(2)}</span>
                 </div>
               );
             })
           )}
        </div>
      </div>
    </div>
  );
}
