import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

export interface NotificationOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationContextType {
  notifications: NotificationOrder[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeStore } = useAuth();
  const [notifications, setNotifications] = useState<NotificationOrder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const channel = supabase
        .channel('global_notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            console.log('New order received via Realtime:', payload.new);
            const newOrder = payload.new as any;
            const notification: NotificationOrder = {
              id: newOrder.id,
              order_number: newOrder.order_number,
              customer_name: newOrder.customer_name,
              total_amount: newOrder.total_amount,
              created_at: newOrder.created_at,
              is_read: false,
            };
            
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            playNotificationSound();

            // Dispatch custom event to notify other components (like Fulfillment)
            console.log('Dispatching orders-updated event...');
            window.dispatchEvent(new CustomEvent('orders-updated', { detail: payload }));
          }
        )
        .subscribe((status) => {
          console.log('Notification Realtime status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, activeStore]);

  useEffect(() => {
    const handleSalaryChange = () => {
      if (user?.role === 'Admin' || user?.role === 'Owner') {
        fetchNotifications();
      }
    };
    window.addEventListener('salary-date-changed', handleSalaryChange);
    return () => window.removeEventListener('salary-date-changed', handleSalaryChange);
  }, [user]);

  const fetchNotifications = async () => {
    console.log('Fetching notifications...');
    let query = supabase
      .from('orders')
      .select('id, order_number, customer_name, total_amount, created_at, is_read')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;

    if (error) {
      console.error('Notification fetch error:', error);
    }
    
    if (data) {
      console.log('Fetched notifications count:', data.length);
      const formatted = data.map(o => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name,
        total_amount: o.total_amount,
        created_at: o.created_at,
        is_read: !!o.is_read
      }));
      
      // Inject salary payout notification for Admins/Owners
      if (user?.role === 'Owner' || user?.role === 'Admin') {
        const { data: dateData } = await supabase.from('app_settings').select('value').eq('key', 'salary_payout_date').single();
        if (dateData && dateData.value) {
          const today = new Date();
          const currentDayStr = today.getDate().toString();
          if (dateData.value === currentDayStr) {
            const currentMonthYear = `${today.getFullYear()}_${today.getMonth()}`;
            const localStorageKey = `salary_notif_read_${currentMonthYear}`;
            const isLocalRead = localStorage.getItem(localStorageKey) === 'true';
            
            const salaryNotif: NotificationOrder = {
              id: 'local-salary-notif',
              order_number: 'MAOSH KUNI',
              customer_name: 'Xodimlarga maosh tarqatish vaqti keldi',
              total_amount: '0',
              created_at: new Date().toISOString(),
              is_read: isLocalRead
            };
            
            // Only add if it's not already read OR if we want to show it. Actually, if it's read, do we still put it in the list? Yes, but it won't increment unreadCount.
            // Also ensure we don't duplicate it if formatted already contains it (though formatted is fresh from DB here)
            formatted.unshift(salaryNotif);
          }
        }
      }

      setNotifications(formatted);
      setUnreadCount(formatted.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    if (id === 'local-salary-notif') {
      const today = new Date();
      const currentMonthYear = `${today.getFullYear()}_${today.getMonth()}`;
      localStorage.setItem(`salary_notif_read_${currentMonthYear}`, 'true');
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    let unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    if (unreadIds.includes('local-salary-notif')) {
      const today = new Date();
      const currentMonthYear = `${today.getFullYear()}_${today.getMonth()}`;
      localStorage.setItem(`salary_notif_read_${currentMonthYear}`, 'true');
      unreadIds = unreadIds.filter(id => id !== 'local-salary-notif');
    }

    if (unreadIds.length > 0) {
      const { error } = await supabase
        .from('orders')
        .update({ is_read: true })
        .in('id', unreadIds);
      if (error) return; // Prevent state update if DB fails
    }

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(_e => console.log('Sound play blocked by browser'));
    } catch (_e) {
      console.log('Audio error:', _e);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead,
      isHistoryOpen,
      setIsHistoryOpen
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
