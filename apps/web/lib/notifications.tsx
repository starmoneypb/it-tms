'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth } from './auth';

// Derive same-origin WS URL in prod; keep localhost override for dev-on-8000
const resolveWsUrl = () => {
  if (typeof window === 'undefined') {
    // SSR fallback; client will re-evaluate on mount
    return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
  }
  // Local docker: proxy through 8000
  if (window.location.hostname === 'localhost' && window.location.port === '8000') {
    return 'ws://localhost:8000/ws';
  }
  // Same-origin in prod: https://host -> wss://host/ws
  const wsOrigin = window.location.origin.replace(/^http/, 'ws');
  return `${wsOrigin}/ws`;
};
const WS_URL = resolveWsUrl();

export interface Notification {
  type: 'ticket_created' | 'ticket_assigned' | 'ticket_unassigned';
  ticketId: string;
  ticket?: {
    id: string;
    code: number;
    title: string;
    initialType: string;
    priority: string;
    status: string;
    createdAt: string;
  };
  message: string;
  timestamp: string;
  assignedUserId?: string;
  unassignedUserId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: () => void;
  clearNotifications: () => void;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const isManualClose = useRef(false);

  const connect = () => {
    // Prevent multiple simultaneous connections
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket connection already in progress, skipping');
      return;
    }

    // Clean up any existing connection
    if (wsRef.current) {
      console.log('Closing existing WebSocket connection');
      isManualClose.current = true;
      wsRef.current.close();
      wsRef.current = null;
      isManualClose.current = false;
      
      // Wait a bit for the connection to fully close
      setTimeout(() => {
        if (wsRef.current === null) {
          console.log('Previous connection closed, proceeding with new connection');
        }
      }, 100);
    }

    try {
      // Add user ID as query parameter if user is authenticated
      const wsUrl = user?.id 
        ? `${resolveWsUrl()}?userId=${encodeURIComponent(user.id)}`
        : resolveWsUrl();

      console.log('Attempting WebSocket connection to:', wsUrl);
      console.log('User ID:', user?.id);
      console.log('Current location:', typeof window !== 'undefined' ? window.location.href : 'server-side');
      setConnectionStatus('connecting');
      
      // NOTE: do NOT forcibly close a socket that's still CONNECTING.
      // Premature client-side close causes 1006 and prevents successful handshakes behind TLS/proxy.

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Add a small delay to ensure the connection is properly established
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket still connecting, waiting...');
        }
      }, 50);

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          console.log('Received notification:', notification);
          
          setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
          setUnreadCount(prev => prev + 1);

          // Show browser notification for important types
          if (notification.type === 'ticket_created' && notification.ticket?.initialType === 'ISSUE_REPORT') {
            showBrowserNotification(
              '🚨 New Issue Report',
              `${notification.ticket.title} - Priority: ${notification.ticket.priority}`,
              notification.ticketId
            );
          } else if (notification.type === 'ticket_created') {
            showBrowserNotification(
              '📋 New Ticket',
              `${notification.ticket?.title} - Priority: ${notification.ticket?.priority}`,
              notification.ticketId
            );
          } else if (notification.type === 'ticket_assigned') {
            showBrowserNotification(
              '✅ Ticket Assigned',
              `You have been assigned to: ${notification.ticket?.title}`,
              notification.ticketId
            );
          } else if (notification.type === 'ticket_unassigned') {
            showBrowserNotification(
              '❌ Ticket Unassigned',
              `You have been unassigned from: ${notification.ticket?.title}`,
              notification.ticketId
            );
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason, 'wasClean:', event.wasClean);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Reconnect on all abnormal closures, including 1006 (common behind proxies)
        if (!isManualClose.current && event.code !== 1000 && event.code !== 1001) {
          // Reconnect with exponential backoff, max 10 attempts
          if (reconnectAttempts.current < 10) {
            const baseDelay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000); // Max 30 seconds
            const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
            const delay = baseDelay + jitter;
            
            console.log(`Reconnecting in ${Math.round(delay)}ms... (attempt ${reconnectAttempts.current + 1})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              // Only reconnect if we're still in a disconnected state
              if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
                reconnectAttempts.current++;
                connect();
              }
            }, delay);
          } else {
            console.log('Max reconnection attempts reached. Stopping reconnection.');
            setConnectionStatus('error');
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket readyState:', wsRef.current?.readyState);
        console.error('WebSocket URL:', wsUrl);
        setIsConnected(false);
        setConnectionStatus('error');
        
        // Don't explicitly close here - let onclose handle reconnection
        // Explicit close() can cause 1006 errors during handshake
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
      setConnectionStatus('error');
    }
  };


  const disconnect = () => {
    isManualClose.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  const showBrowserNotification = (title: string, body: string, ticketId: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag: `ticket-${ticketId}`, // Prevent duplicate notifications
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = `/tickets/${ticketId}`;
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Connect/disconnect based on user authentication
  useEffect(() => {
    console.log('User changed, reconnecting WebSocket:', user?.id || 'anonymous');
    
    // Add a small delay to prevent race conditions
    const timeoutId = setTimeout(() => {
      connect();
    }, 100);

    return () => {
      console.log('Cleaning up WebSocket connection');
      clearTimeout(timeoutId);
      disconnect();
    };
  }, [user?.id]); // Reconnect when user changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications,
    isConnected,
    connectionStatus,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
