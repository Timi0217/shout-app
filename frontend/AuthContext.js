import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);

  useEffect(() => {
    // Restore user from Supabase session on app launch/refresh
    const restoreSession = async () => {
      // For Supabase JS v2, use getUser
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      if (supaUser) {
        setUserState(supaUser);
        await SecureStore.setItemAsync('user', JSON.stringify(supaUser));
      } else {
        setUserState(null);
        await SecureStore.deleteItemAsync('user');
      }
    };
    restoreSession();
  }, []);

  const setUser = async (userObj) => {
    setUserState(userObj);
    if (userObj) {
      await SecureStore.setItemAsync('user', JSON.stringify(userObj));
    } else {
      await SecureStore.deleteItemAsync('user');
    }
  };

  // Add logout function
  const logout = async () => {
    setUserState(null);
    await SecureStore.deleteItemAsync('user');
    await supabase.auth.signOut(); // Also sign out from Supabase
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 