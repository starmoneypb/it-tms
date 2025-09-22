'use client';

import { useEffect, useState } from 'react';
import { useNotifications, Notification } from '../lib/notifications';
import { useLocale } from 'next-intl';
import { X, AlertTriangle, Ticket, UserCheck, UserX } from 'lucide-react';

export function NotificationToast() {
  const { notifications } = useNotifications();
  const locale = useLocale();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Show only the latest notification for a few seconds
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (!visibleNotifications.find(n => n.timestamp === latest.timestamp)) {
        setVisibleNotifications(prev => [latest, ...prev.slice(0, 2)]); // Keep max 3 visible
        
        // Auto-remove after 5 seconds (8 seconds for ISSUE_REPORT)
        const timeout = latest.type === 'ticket_created' && latest.ticket?.initialType === 'ISSUE_REPORT' 
          ? 8000 
          : 5000;
          
        setTimeout(() => {
          setVisibleNotifications(prev => prev.filter(n => n.timestamp !== latest.timestamp));
        }, timeout);
      }
    }
  }, [notifications]);

  const removeNotification = (timestamp: string) => {
    setVisibleNotifications(prev => prev.filter(n => n.timestamp !== timestamp));
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'ticket_created':
        return notification.ticket?.initialType === 'ISSUE_REPORT' 
          ? <AlertTriangle className="h-5 w-5 text-red-400" />
          : <Ticket className="h-5 w-5 text-blue-400" />;
      case 'ticket_assigned':
        return <UserCheck className="h-5 w-5 text-green-400" />;
      case 'ticket_unassigned':
        return <UserX className="h-5 w-5 text-orange-400" />;
      default:
        return <Ticket className="h-5 w-5 text-blue-400" />;
    }
  };

  const getNotificationTitle = (notification: Notification) => {
    switch (notification.type) {
      case 'ticket_created':
        return notification.ticket?.initialType === 'ISSUE_REPORT' 
          ? '🚨 New Issue Report'
          : '📋 New Ticket';
      case 'ticket_assigned':
        return '✅ Ticket Assigned';
      case 'ticket_unassigned':
        return '❌ Ticket Unassigned';
      default:
        return 'Notification';
    }
  };

  const getNotificationStyle = (notification: Notification) => {
    const baseStyle = "glass border rounded-xl p-4 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105";
    
    if (notification.type === 'ticket_created' && notification.ticket?.initialType === 'ISSUE_REPORT') {
      return `${baseStyle} border-red-500/50 bg-red-500/10 shadow-red-500/20`;
    } else if (notification.type === 'ticket_assigned') {
      return `${baseStyle} border-green-500/50 bg-green-500/10 shadow-green-500/20`;
    } else if (notification.type === 'ticket_unassigned') {
      return `${baseStyle} border-orange-500/50 bg-orange-500/10 shadow-orange-500/20`;
    }
    
    return `${baseStyle} border-blue-500/50 bg-blue-500/10 shadow-blue-500/20`;
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-md">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.timestamp}
          className={getNotificationStyle(notification)}
        >
          <div className="flex items-start gap-3">
            {getNotificationIcon(notification)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-semibold text-white">
                  {getNotificationTitle(notification)}
                </h4>
                <button
                  onClick={() => removeNotification(notification.timestamp)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {notification.ticket && (
                <div className="space-y-1">
                  <p className="text-sm text-white/90 font-medium">
                    #{notification.ticket.code} — {notification.ticket.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <span className={`px-2 py-1 rounded-full ${
                      notification.ticket.priority === 'P0' ? 'bg-red-500/20 text-red-300' :
                      notification.ticket.priority === 'P1' ? 'bg-orange-500/20 text-orange-300' :
                      notification.ticket.priority === 'P2' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {notification.ticket.priority}
                    </span>
                    <span>•</span>
                    <span>{notification.ticket.status}</span>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-white/60 mt-2">
                {notification.message}
              </p>
            </div>
          </div>
          
          {notification.ticket && (
            <div className="mt-3">
              <a
                href={`/${locale}/tickets/${notification.ticketId}`}
                className="inline-flex items-center text-xs text-white/80 hover:text-white transition-colors"
                onClick={() => removeNotification(notification.timestamp)}
              >
                View Ticket →
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
