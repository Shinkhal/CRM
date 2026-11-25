import React from 'react';

export const Card = ({ className = '', children, hover = false, ...props }) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs transition-all duration-200 ${
        hover ? 'hover:border-slate-300 hover:shadow-md' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-6 pb-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ className = '', children, ...props }) => {
  return (
    <h3 className={`text-base font-bold text-slate-900 leading-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription = ({ className = '', children, ...props }) => {
  return (
    <p className={`text-xs text-slate-500 mt-1 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-6 pt-4 border-t border-slate-100 flex items-center ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
