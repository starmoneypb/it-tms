'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth } from './auth';

// Derive same-origin WebSocket URL in prod; keep localhost override for dev-on-8000
const resolveWebSocketUrl = () => {
  if (typeof window === 'undefined') {
    // SSR fallback; client will re-evaluate on mount
    return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080';
  }
  // Local docker: proxy through 8000
  if (window.location.hostname === 'localhost' && window.location.port === '8000') {
    return 'ws://localhost:8000/ws';
  }
  // Same-origin in prod: https://host -> wss://host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};
const WS_URL = resolveWebSocketUrl();

export interface Notification {
  type: 'ticket_created' | 'ticket_assigned' | 'ticket_unassigned' | 'comment_added';
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
  // For comment notifications
  commentAuthorId?: string;
  commentBody?: string;
  isSystemComment?: boolean;
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
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const isManualClose = useRef(false);

  const connect = () => {
    // Prevent multiple simultaneous connections
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket connection already established, skipping');
      return;
    }

    // Clean up any existing connection
    if (socketRef.current) {
      console.log('Closing existing WebSocket connection');
      isManualClose.current = true;
      socketRef.current.close();
      socketRef.current = null;
      isManualClose.current = false;
    }

    try {
      console.log('Attempting WebSocket connection to:', WS_URL);
      console.log('User ID:', user?.id);
      console.log('Current location:', typeof window !== 'undefined' ? window.location.href : 'server-side');
      setConnectionStatus('connecting');
      
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        
        // Join user-specific room if authenticated
        if (user?.id) {
          socket.send(JSON.stringify({
            type: 'join',
            userId: user.id
          }));
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'notification') {
            const notification: Notification = message.data;
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
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, 'Data:', event.data);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        socketRef.current = null;

        // Reconnect on all disconnections except manual close
        if (!isManualClose.current && event.code !== 1000) {
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

      socket.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
        setConnectionStatus('error');
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
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
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