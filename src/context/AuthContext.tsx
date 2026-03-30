import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Session } from '@supabase/supabase-js';

export type Role = 'Owner' | 'Manager' | 'Sotuvchi' | 'Omborchi';

interface UserData {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  store_id?: string | null;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
  activeStore: string | 'ALL';
  setActiveStore: (id: string | 'ALL') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStore, setActiveStoreState] = useState<string | 'ALL'>(localStorage.getItem('activeStore') || 'ALL');

  const setActiveStore = (id: string | 'ALL') => {
    setActiveStoreState(id);
    localStorage.setItem('activeStore', id);
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch user profile to get their role
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      setUser({
        id: session.user.id,
        email: session.user.email || '',
        role: (data?.role as Role) || 'Manager',
        fullName: data?.full_name || 'Foydalanuvchi',
        store_id: data?.store_id || null
      });

      if (data?.role !== 'Owner' && data?.store_id) {
        setActiveStore(data.store_id);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, activeStore, setActiveStore }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
