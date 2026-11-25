import React from 'react';

const avatarSizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

export const Avatar = ({
  name = '',
  src = '',
  size = 'md',
  className = '',
  status = null,
}) => {
  const initials = (name || 'U').charAt(0).toUpperCase();

  return (
    <div className="relative inline-flex shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${avatarSizes[size] || avatarSizes.md} rounded-xl object-cover border border-slate-200 shadow-xs ${className}`}
        />
      ) : (
        <div
          className={`${
            avatarSizes[size] || avatarSizes.md
          } rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-xs ${className}`}
        >
          {initials}
        </div>
      )}
      {status === 'online' && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-200" />
      )}
    </div>
  );
};

export default Avatar;
