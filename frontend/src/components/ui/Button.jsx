import React from 'react';

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs focus:ring-blue-500/30 border border-blue-600',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-transparent focus:ring-slate-400/20',
  outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs hover:border-slate-300 focus:ring-slate-300/30',
  ghost: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent',
  destructive: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500/30 border border-rose-600',
  dark: 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs border border-slate-900 focus:ring-slate-800/30',
};

const sizes = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
  icon: 'p-2 rounded-xl',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  children,
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-hidden focus:ring-3 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
        variants[variant] || variants.primary
      } ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
