'use client';

import { useEffect, useState } from 'react';
import { useNotifications, Notification } from '../lib/notifications';
import { useLocale } from 'next-intl';
import { X, AlertTriangle, Ticket, UserCheck, UserX, Sparkles, Zap, MessageSquare, Clock, Edit } from 'lucide-react';
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
      case 'comment_added':
        return <MessageSquare className="h-5 w-5 text-purple-400" />;
      case 'ticket_updated':
        return <Edit className="h-5 w-5 text-blue-400" />;
      case 'knowledge_liked':
        return <Sparkles className="h-5 w-5 text-green-400" />;
      case 'knowledge_unliked':
        return <Zap className="h-5 w-5 text-orange-400" />;
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
      case 'comment_added':
        return notification.isSystemComment 
          ? '🤖 System Update'
          : '💬 New Comment';
      case 'ticket_updated':
        return '✏️ Ticket Updated';
      case 'knowledge_liked':
        return '👍 Knowledge Liked';
      case 'knowledge_unliked':
        return '👎 Knowledge Unliked';
      default:
        return 'Notification';
    }
  };

  const getNotificationStyle = (notification: Notification) => {
    const baseStyle = "relative overflow-hidden border rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl group";
    
    if (notification.type === 'ticket_created' && notification.ticket?.initialType === 'ISSUE_REPORT') {
      return `${baseStyle} border-red-500/20 bg-gradient-to-br from-red-500/8 via-red-600/6 to-red-700/4 shadow-red-500/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-red-500/5 before:to-transparent before:opacity-0 before:group-hover:opacity-100 before:transition-opacity before:duration-300`;
    } else if (notification.type === 'ticket_assigned') {
      return `${baseStyle} border-green-500/20 bg-gradient-to-br from-green-500/8 via-green-600/6 to-green-700/4 shadow-green-500/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-green-500/5 before:to-transparent before:opacity-0 before:group-hover:opacity-100 before:transition-opacity before:duration-300`;
    } else if (notification.type === 'ticket_unassigned') {
      return `${baseStyle} border-orange-500/20 bg-gradient-to-br from-orange-500/8 via-orange-600/6 to-orange-700/4 shadow-orange-500/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-orange-500/5 before:to-transparent before:opacity-0 before:group-hover:opacity-100 before:transition-opacity before:duration-300`;
    } else if (notification.type === 'comment_added') {
      return `${baseStyle} border-purple-500/20 bg-gradient-to-br from-purple-500/8 via-purple-600/6 to-purple-700/4 shadow-purple-500/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-purple-500/5 before:to-transparent before:opacity-0 before:group-hover:opacity-100 before:transition-opacity before:duration-300`;
    } else if (notification.type === 'ticket_updated') {
      return `${baseStyle} border-blue-500/20 bg-gradient-to-br from-blue-500/8 via-blue-600/6 to-blue-700/4 shadow-blue-500/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/5 before:to-transparent before:opacity-0 before:group-hover:opacity-100 before:transition-opacity before:duration-300`;
    } else if (notification.type === 'knowledge_liked') {
      return `${baseStyle} border-green-500/20 bg-gradient-to-br from-green-500/8 via-green-600/6 to-green-700/4 shadow-green-500/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-green-500/5 before:to-transparent before:opacity-0 before:group-hover:opacity-100 before:transition-opacity before:duration-300`;
    } else if (notification.type === 'knowledge_unliked') {
      return `${baseStyle} border-orange-500/20 bg-gradient-to-br from-orange-500/8 via-orange-600/6 to-orange-700/4 shadow-orange-500/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-orange-500/5 before:to-transparent before:opacity-0 before:group-hover:opacity-100 before:transition-opacity before:duration-300`;
    }
    
    return `${baseStyle} border-blue-500/20 bg-gradient-to-br from-blue-500/8 via-blue-600/6 to-blue-700/4 shadow-blue-500/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/5 before:to-transparent before:opacity-0 before:group-hover:opacity-100 before:transition-opacity before:duration-300`;
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
      
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 sm:top-6 sm:right-4 sm:left-auto sm:transform-none z-50 space-y-2 sm:space-y-3 w-full max-w-sm sm:max-w-md px-2 sm:px-0">
        <AnimatePresence mode="popLayout">
          {visibleNotifications.map((notification, index) => (
            <motion.div
              key={notification.timestamp}
              layout
              initial={{ 
                opacity: 0, 
                x: 400, 
                scale: 0.8,
                rotateY: -15,
                filter: "blur(4px)"
              }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1,
                rotateY: 0,
                filter: "blur(0px)"
              }}
              exit={{ 
                opacity: 0, 
                x: 400, 
                scale: 0.8,
                rotateY: 15,
                filter: "blur(4px)"
              }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 25,
                delay: index * 0.08,
                filter: { duration: 0.3 }
              }}
              className={getNotificationStyle(notification)}
            >
              {/* Enhanced animated background gradient */}
              <motion.div
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="absolute inset-0 bg-gradient-to-r from-white/4 via-white/2 to-transparent"
              />
              
              {/* Subtle border glow effect */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/5 via-transparent to-white/3 opacity-30"
              />
              
              {/* Sparkle effects for issue reports */}
              {notification.type === 'ticket_created' && notification.ticket?.initialType === 'ISSUE_REPORT' && (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <motion.div
                      key={`sparkle-${i}`}
                      initial={{ 
                        opacity: 0, 
                        scale: 0,
                        x: Math.random() * 120 - 20,
                        y: Math.random() * 80 - 20
                      }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        scale: [0, 1.2, 0],
                        rotate: [0, 180, 360]
                      }}
                      transition={{ 
                        duration: 2.5,
                        delay: i * 0.4,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                      className="absolute pointer-events-none"
                      style={{
                        top: `${20 + (i * 15)}%`,
                        right: `${10 + (i * 20)}%`
                      }}
                    >
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-red-400 drop-shadow-lg" />
                    </motion.div>
                  ))}
                </>
              )}

              <div className="relative flex items-start gap-3 sm:gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 25,
                    delay: 0.3
                  }}
                  className="flex-shrink-0 p-2 rounded-full bg-white/5 backdrop-blur-sm"
                >
                  {getNotificationIcon(notification)}
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-start justify-between gap-2 mb-2"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-wide leading-tight">
                        {getNotificationTitle(notification)}
                      </h4>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center gap-1 mt-1"
                      >
                        <Clock className="h-3 w-3 text-white/50" />
                        <span className="text-xs text-white/60">
                          {new Date(notification.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </motion.div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeNotification(notification.timestamp)}
                      className="text-white/60 hover:text-white transition-all duration-200 p-1.5 rounded-full hover:bg-white/10 flex-shrink-0"
                      aria-label="Close notification"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </motion.div>
                  
                  {notification.ticket && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-3"
                    >
                      <div className="p-3 rounded-xl bg-white/3 backdrop-blur-sm border border-white/5">
                        <p className="text-sm sm:text-base text-white/95 font-semibold leading-tight mb-2">
                          #{notification.ticket.code} — {notification.ticket.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <motion.span 
                            whileHover={{ scale: 1.05 }}
                            className={`px-2.5 py-1.5 rounded-full font-medium text-xs ${
                              notification.ticket.priority === 'P0' ? 'bg-red-500/30 text-red-100 border border-red-400/40 shadow-red-500/20' :
                              notification.ticket.priority === 'P1' ? 'bg-orange-500/30 text-orange-100 border border-orange-400/40 shadow-orange-500/20' :
                              notification.ticket.priority === 'P2' ? 'bg-yellow-500/30 text-yellow-100 border border-yellow-400/40 shadow-yellow-500/20' :
                              'bg-green-500/30 text-green-100 border border-green-400/40 shadow-green-500/20'
                            }`}
                          >
                            {notification.ticket.priority}
                          </motion.span>
                          <span className="text-white/40">•</span>
                          <span className="text-white/80 font-medium px-2 py-1 rounded-md bg-white/3">
                            {notification.ticket.status}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {notification.document && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-3"
                    >
                      <div className="p-3 rounded-xl bg-white/3 backdrop-blur-sm border border-white/5">
                        <p className="text-sm sm:text-base text-white/95 font-semibold leading-tight mb-2">
                          {notification.document.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <motion.span 
                            whileHover={{ scale: 1.05 }}
                            className="px-2.5 py-1.5 rounded-full font-medium text-xs bg-blue-500/30 text-blue-100 border border-blue-400/40 shadow-blue-500/20"
                          >
                            {notification.document.likeCount} likes
                          </motion.span>
                          <span className="text-white/40">•</span>
                          <span className="text-white/80 font-medium px-2 py-1 rounded-md bg-white/3">
                            {notification.document.viewCount} views
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-xs sm:text-sm text-white/80 mt-3 leading-relaxed"
                  >
                    {notification.message}
                  </motion.p>
                  
                  {notification.type === 'comment_added' && notification.commentBody && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="mt-3 p-3 bg-white/3 rounded-xl border border-white/5 backdrop-blur-sm"
                    >
                      <p className="text-xs sm:text-sm text-white/80 leading-relaxed italic">
                        "{notification.commentBody.length > 120 
                          ? `${notification.commentBody.substring(0, 120)}...` 
                          : notification.commentBody}"
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
              
              {(notification.ticket || notification.document) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mt-4 pt-3 border-t border-white/5"
                >
                  <motion.a
                    whileHover={{ x: 5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href={
                      notification.type === 'knowledge_liked' || notification.type === 'knowledge_unliked'
                        ? `/${locale}/knowledge-sharing/${notification.documentId}`
                        : `/${locale}/tickets/${notification.ticketId}`
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm text-white/80 hover:text-white transition-all duration-200 font-medium group bg-white/3 hover:bg-white/5 rounded-lg border border-white/5 hover:border-white/10"
                    onClick={() => removeNotification(notification.timestamp)}
                  >
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4 group-hover:animate-pulse" />
                    <span>
                      {notification.type === 'knowledge_liked' || notification.type === 'knowledge_unliked'
                        ? 'View Document'
                        : 'View Ticket'
                      }
                    </span>
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="text-lg"
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
