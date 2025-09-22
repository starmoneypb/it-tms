'use client';

import { useEffect, useState } from 'react';
import { useNotifications, Notification } from '../lib/notifications';
import { useLocale } from 'next-intl';
import { X, AlertTriangle, Ticket, UserCheck, UserX, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RedScreenEffect from './RedScreenEffect';

export function NotificationToast() {
  const { notifications } = useNotifications();
  const locale = useLocale();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);
  const [showRedScreen, setShowRedScreen] = useState(false);

  useEffect(() => {
    // Show only the latest notification for a few seconds
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (!visibleNotifications.find(n => n.timestamp === latest.timestamp)) {
        setVisibleNotifications(prev => [latest, ...prev.slice(0, 2)]); // Keep max 3 visible
        
        // Trigger red screen effect for issue reports
        if (latest.type === 'ticket_created' && latest.ticket?.initialType === 'ISSUE_REPORT') {
          setShowRedScreen(true);
        }
        
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
    const baseStyle = "relative overflow-hidden border rounded-2xl p-5 shadow-xl backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl";
    
    if (notification.type === 'ticket_created' && notification.ticket?.initialType === 'ISSUE_REPORT') {
      return `${baseStyle} border-red-500/60 bg-gradient-to-br from-red-500/15 via-red-600/10 to-red-700/5 shadow-red-500/30`;
    } else if (notification.type === 'ticket_assigned') {
      return `${baseStyle} border-green-500/60 bg-gradient-to-br from-green-500/15 via-green-600/10 to-green-700/5 shadow-green-500/30`;
    } else if (notification.type === 'ticket_unassigned') {
      return `${baseStyle} border-orange-500/60 bg-gradient-to-br from-orange-500/15 via-orange-600/10 to-orange-700/5 shadow-orange-500/30`;
    }
    
    return `${baseStyle} border-blue-500/60 bg-gradient-to-br from-blue-500/15 via-blue-600/10 to-blue-700/5 shadow-blue-500/30`;
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <>
      <RedScreenEffect 
        isVisible={showRedScreen} 
        onComplete={() => setShowRedScreen(false)} 
      />
      
      <div className="fixed top-20 right-4 z-50 space-y-3 max-w-md">
        <AnimatePresence mode="popLayout">
          {visibleNotifications.map((notification, index) => (
            <motion.div
              key={notification.timestamp}
              layout
              initial={{ 
                opacity: 0, 
                x: 400, 
                scale: 0.8,
                rotateY: -15
              }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1,
                rotateY: 0
              }}
              exit={{ 
                opacity: 0, 
                x: 400, 
                scale: 0.8,
                rotateY: 15
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                delay: index * 0.1
              }}
              className={getNotificationStyle(notification)}
            >
              {/* Animated background gradient */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"
              />
              
              {/* Sparkle effects for issue reports */}
              {notification.type === 'ticket_created' && notification.ticket?.initialType === 'ISSUE_REPORT' && (
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                      key={`sparkle-${i}`}
                      initial={{ 
                        opacity: 0, 
                        scale: 0,
                        x: Math.random() * 100,
                        y: Math.random() * 100
                      }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                        rotate: [0, 180, 360]
                      }}
                      transition={{ 
                        duration: 2,
                        delay: i * 0.3,
                        repeat: Infinity,
                        repeatDelay: 2
                      }}
                      className="absolute top-2 right-2"
                    >
                      <Sparkles className="h-4 w-4 text-red-400" />
                    </motion.div>
                  ))}
                </>
              )}

              <div className="relative flex items-start gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 20,
                    delay: 0.3
                  }}
                  className="flex-shrink-0"
                >
                  {getNotificationIcon(notification)}
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-between gap-2 mb-2"
                  >
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {getNotificationTitle(notification)}
                    </h4>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeNotification(notification.timestamp)}
                      className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </motion.div>
                  
                  {notification.ticket && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-2"
                    >
                      <p className="text-sm text-white/95 font-semibold leading-tight">
                        #{notification.ticket.code} — {notification.ticket.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <motion.span 
                          whileHover={{ scale: 1.05 }}
                          className={`px-3 py-1.5 rounded-full font-medium ${
                            notification.ticket.priority === 'P0' ? 'bg-red-500/25 text-red-200 border border-red-400/30' :
                            notification.ticket.priority === 'P1' ? 'bg-orange-500/25 text-orange-200 border border-orange-400/30' :
                            notification.ticket.priority === 'P2' ? 'bg-yellow-500/25 text-yellow-200 border border-yellow-400/30' :
                            'bg-green-500/25 text-green-200 border border-green-400/30'
                          }`}
                        >
                          {notification.ticket.priority}
                        </motion.span>
                        <span className="text-white/60">•</span>
                        <span className="text-white/80 font-medium">{notification.ticket.status}</span>
                      </div>
                    </motion.div>
                  )}
                  
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-xs text-white/70 mt-3 leading-relaxed"
                  >
                    {notification.message}
                  </motion.p>
                </div>
              </div>
              
              {notification.ticket && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mt-4 pt-3 border-t border-white/10"
                >
                  <motion.a
                    whileHover={{ x: 5 }}
                    href={`/${locale}/tickets/${notification.ticketId}`}
                    className="inline-flex items-center text-xs text-white/80 hover:text-white transition-colors font-medium group"
                    onClick={() => removeNotification(notification.timestamp)}
                  >
                    <Zap className="h-3 w-3 mr-1 group-hover:animate-pulse" />
                    View Ticket
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      →
                    </motion.span>
                  </motion.a>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
