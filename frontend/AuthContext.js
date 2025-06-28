import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);

  useEffect(() => {
    // Restore user on app launch
    SecureStore.getItemAsync('user').then(storedUser => {
      if (storedUser) setUserState(JSON.parse(storedUser));
    });
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