'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth } from './auth';

// Use relative URLs for production-like environment behind reverse proxy
const WS_URL = typeof window !== 'undefined' && window.location.port === '8000'
  ? 'ws://localhost:8000/ws' // Use direct connection when accessed through port 8000 (production-like)
  : (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws");

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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Add user ID as query parameter if user is authenticated
      const wsUrl = user?.id 
        ? `${WS_URL}?userId=${encodeURIComponent(user.id)}`
        : WS_URL;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
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
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Reconnect with exponential backoff
        if (reconnectAttempts.current < 5) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
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
    connect();

    return () => {
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
