import React from 'react';

const badgeVariants = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-blue-50 text-blue-700 border-blue-200',
  secondary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  destructive: 'bg-rose-50 text-rose-700 border-rose-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  outline: 'bg-white text-slate-700 border-slate-200 shadow-xs',
};

export const Badge = ({
  variant = 'default',
  className = '',
  dot = false,
  dotColor = 'bg-emerald-500',
  children,
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        badgeVariants[variant] || badgeVariants.default
      } ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {children}
    </span>
  );
};

export default Badge;
