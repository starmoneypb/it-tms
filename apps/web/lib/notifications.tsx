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
      return;
    }

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // Add user ID as query parameter if user is authenticated
      const wsUrl = user?.id 
        ? `${WS_URL}?userId=${encodeURIComponent(user.id)}`
        : WS_URL;

      console.log('Attempting WebSocket connection to:', wsUrl);
      console.log('User ID:', user?.id);
      console.log('Current location:', typeof window !== 'undefined' ? window.location.href : 'server-side');
      setConnectionStatus('connecting');
      
      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
          console.error('WebSocket connection timeout');
          wsRef.current.close();
          setConnectionStatus('error');
        }
      }, 10000); // 10 second timeout
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        clearTimeout(connectionTimeout);
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
        console.log('WebSocket disconnected:', event.code, event.reason);
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Only reconnect if it's not a manual close and not a normal closure
        // Also avoid reconnecting on 1006 (abnormal closure) to prevent infinite loops
        if (!isManualClose.current && event.code !== 1000 && event.code !== 1001 && event.code !== 1006) {
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
        } else if (event.code === 1006) {
          // For 1006 errors, wait longer before attempting reconnection
          console.log('Abnormal closure detected, waiting before reconnection...');
          setConnectionStatus('error');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket readyState:', wsRef.current?.readyState);
        console.error('WebSocket URL:', wsUrl);
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        setConnectionStatus('error');
        
        // Close the connection on error to trigger reconnection logic
        if (wsRef.current) {
          wsRef.current.close();
        }
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
