import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { Bell, Check, CheckCheck, X } from 'lucide-react';

const relativeTime = (value) => {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
};

/**
 * The in-app notification inbox. Workflows write here, so this is where a
 * rep sees "a deal you care about needs a task".
 */
const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/notifications', { params: { limit: 15 } });
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch {
      // A failing poll must not break the header.
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markAsRead = async (notification) => {
    if (!notification.read) {
      try {
        await axios.patch(`/notifications/${notification._id}/read`);
      } catch {
        // Ignore: the next poll will reconcile the state.
      }
    }
    setNotifications((prev) =>
      prev.map((entry) => (entry._id === notification._id ? { ...entry, read: true } : entry))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post('/notifications/read-all');
    } catch {
      // Ignore: the next poll will reconcile the state.
    }
    setNotifications((prev) => prev.map((entry) => ({ ...entry, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="p-10 text-center">
                <Bell className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Nothing needs your attention.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  onClick={() => markAsRead(notification)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                    notification.read ? '' : 'bg-indigo-50/40'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      notification.read ? 'bg-transparent' : 'bg-indigo-500'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-gray-900">
                      {notification.title}
                    </span>
                    {notification.message && (
                      <span className="block text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </span>
                    )}
                    <span className="block text-[10px] text-gray-400 mt-1">
                      {relativeTime(notification.createdAt)}
                    </span>
                  </span>
                  {notification.read ? (
                    <Check className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
