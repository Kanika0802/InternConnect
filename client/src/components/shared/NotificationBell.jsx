import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export default function NotificationBell() {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState([]);
  const [unread, setUnread]   = useState(0);
  const ref = useRef();

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifs(res.data.notifications);
      setUnread(res.data.unreadCount);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setUnread(0);
    setNotifs(n => n.map(x => ({ ...x, isRead: true })));
  };

  const typeColors = {
    new_opportunity: 'bg-blue-100 text-blue-600',
    status_update: 'bg-green-100 text-green-600',
    announcement: 'bg-purple-100 text-purple-600',
    eligibility_alert: 'bg-amber-100 text-amber-600',
    account: 'bg-gray-100 text-gray-600'
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-900">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No notifications yet</div>
            ) : notifs.map(n => (
              <div key={n._id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs flex-shrink-0 mt-0.5 ${typeColors[n.type] || 'bg-gray-100 text-gray-600'}`}>
                    {n.type === 'new_opportunity' ? '💼' : n.type === 'status_update' ? '📋' : n.type === 'announcement' ? '📢' : '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 leading-tight">{n.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
