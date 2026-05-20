import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import API from '../api/axios';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

const getSocketUrl = () => {
  const base = API.defaults.baseURL || window.location.origin;
  const url = base.replace(/\/api$/, '');
  console.log('⚙️ Notification socket URL:', url);
  return url;
};

export const NotificationProvider = ({ children, userId }) => {
  const [notifications, setNotifications] = useState([]);

  // Load existing notifications via HTTP REST endpoint
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const response = await API.get('/notifications');
        setNotifications(response.data);
      } catch (e) {
        console.error('Failed to load notifications', e);
      }
    };
    fetchNotifications();
  }, [userId]);

  // Subscribe to new notifications using Socket.io
  useEffect(() => {
    if (!userId) return;

    const socketUrl = getSocketUrl();
    console.log(`🔌 Connecting notifications socket to: ${socketUrl}`);
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log(`🔔 Notifications socket connected: ${socket.id}`);
      socket.emit('join-user', { userId });
    });

    socket.on('notification', (newNotif) => {
      console.log('📬 Received real-time notification:', newNotif);
      setNotifications(prev => {
        // Prevent duplicate real-time notifications
        if (prev.some(n => n.notificationId === newNotif.notificationId)) {
          return prev;
        }
        return [newNotif, ...prev];
      });
      // Show elegant toast alert
      toast.info(newNotif.message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "dark"
      });
    });

    socket.on('disconnect', () => {
      console.log('📴 Notifications socket disconnected');
    });

    return () => {
      console.log('🔌 Disconnecting notifications socket...');
      socket.disconnect();
    };
  }, [userId]);

  const markRead = async (notificationId) => {
    try {
      await API.post(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => (n.notificationId === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const clearAll = async () => {
    try {
      await API.delete('/notifications');
      setNotifications([]);
    } catch (e) {
      console.error('Failed to clear notifications', e);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};
