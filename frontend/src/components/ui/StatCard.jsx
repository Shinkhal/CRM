import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  sub,
  icon: Icon,
  color = 'text-blue-600',
  bgLight = 'bg-blue-50',
  borderLight = 'border-blue-100',
  link,
  loading = false,
  className = '',
}) => {
  const content = (
    <div
      className={`p-6 rounded-2xl bg-white border ${borderLight} shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${bgLight} ${color} group-hover:scale-105 transition-transform`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div>
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {loading ? '...' : value}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 line-clamp-1">{sub}</span>
          {link && (
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          )}
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
};

export default StatCard;
