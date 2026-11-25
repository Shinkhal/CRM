import React from 'react';

export const Input = React.forwardRef(
  ({ className = '', error, label, helperText, icon: Icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-white border rounded-xl text-sm text-slate-900 placeholder-slate-400 py-2.5 transition-all duration-150 focus:outline-hidden focus:ring-3 ${
              Icon ? 'pl-10 pr-3.5' : 'px-3.5'
            } ${
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900'
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-400 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
