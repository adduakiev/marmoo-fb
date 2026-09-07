import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

export interface DropdownOption<T> {
  id: T;
  label: string;
  badge?: string;
}

export interface CustomDropdownProps<T> {
  value: T;
  onChange: (val: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  className?: string;
}

export function CustomDropdown<T extends string | number | null>({
  value,
  onChange,
  options,
  placeholder = "Обрати...",
  className = "",
}: CustomDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => String(o.id) === String(value)) || options[0];

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#4c061c]/90 px-4 py-3.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-[#5a0823] outline-none"
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronRight size={16} className={`text-white/40 transition-transform duration-200 ${open ? "-rotate-90" : "rotate-90"}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[180px] overflow-hidden rounded-2xl border border-white/15 bg-[#3a0414]/95 p-1.5 text-sm text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {options.map((opt) => {
            const active = String(opt.id) === String(value);
            return (
              <button
                key={String(opt.id)}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
                  active ? "bg-[#cfeeed] text-[#531027] font-black" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{opt.label}</span>
                {opt.badge && (
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-[#531027]/20 text-[#531027]" : "bg-white/10 text-white/60"}`}>
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
