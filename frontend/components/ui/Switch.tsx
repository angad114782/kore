import React from 'react';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange, disabled, className = "" }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent 
        transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'bg-indigo-600' : 'bg-slate-200'}
        ${className}
      `}
    >
      <span
        aria-hidden="true"
        className={`
          pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 
          transition-transform 
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  );
};

export default Switch;
