import React from 'react';
import { Star } from 'lucide-react';

export function Button({ children, onClick, disabled, variant = 'primary', className = '' }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}) {
  const base = "px-8 py-4 rounded-[14px] font-semibold text-base transition-all duration-200 active:scale-[0.98] flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-brand text-white border-none min-w-[160px]",
    secondary: "bg-transparent text-muted hover:text-ink",
    outline: "bg-transparent border border-border-line text-ink hover:border-brand"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Pill({ 
  label, 
  selected, 
  onClick 
}: { 
  key?: React.Key;
  label: string; 
  selected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 rounded-full text-[15px] transition-all duration-200 border
        ${selected 
          ? 'bg-brand border-brand text-white' 
          : 'bg-transparent border-border-line text-ink hover:border-brand hover:bg-brand-soft/20'
        }`}
    >
      {label}
    </button>
  );
}

export function StarRating({ 
  value, 
  onChange 
}: { 
  value: number | null; 
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex gap-3 items-center w-full max-w-sm">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className="p-1 transition-transform hover:scale-110 active:scale-95 touch-manipulation focus:outline-none"
        >
          <Star 
            size={40} 
            className={`transition-colors ${value && value >= star ? 'fill-brand text-brand' : 'text-border-line fill-transparent'}`} 
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

export function ScaleRating({ 
  value, 
  onChange,
  start = 1,
  end = 10,
  minLabel,
  maxLabel
}: { 
  value: number | null; 
  onChange: (val: number) => void;
  start?: number;
  end?: number;
  minLabel: string;
  maxLabel: string;
}) {
  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  
  return (
    <div className="w-full">
      <div className="flex gap-3 justify-between w-full mt-2 overflow-x-auto pb-2 hide-scrollbar">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={`flex-1 h-14 min-w-[40px] flex items-center justify-center border rounded-xl text-xl transition-colors
              ${value === num 
                ? 'bg-brand-soft border-brand text-brand font-bold' 
                : 'bg-transparent border-border-line text-ink hover:border-brand hover:bg-brand-soft/20'
              }`}
          >
            {num}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-sm text-muted mt-2">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

export function TextInput({ 
  value, 
  onChange, 
  placeholder, 
  multiline = false 
}: { 
  value: string; 
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const baseClass = "w-full p-4 rounded-xl bg-transparent border border-border-line font-sans text-base text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all mt-2";
  
  return multiline ? (
    <textarea 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder}
      className={`${baseClass} min-h-[120px] resize-y`}
    />
  ) : (
    <input 
      type="text" 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder}
      className={baseClass}
    />
  );
}

export function QuestionLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[18px] font-medium text-ink mb-4 block">
      {children}
      {required && <span className="text-brand ml-1">*</span>}
    </label>
  );
}
