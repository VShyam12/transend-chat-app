import { useEffect, useState } from 'react';
import { clearStoredAuth, getStoredAuth, setStoredAuth, type StoredAuth } from '../store/authStore';

export const useAuth = () => {
  const [auth, setAuth] = useState<StoredAuth | null>(() => getStoredAuth());

  useEffect(() => {
    const handleStorageChange = () => {
      setAuth(getStoredAuth());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateAuth = (authData: any) => {
    const storedAuth = setStoredAuth(authData);
    setAuth(storedAuth);
    return storedAuth;
  };

  const clearAuth = () => {
    clearStoredAuth();
    setAuth(null);
  };

  return {
    auth,
    user: auth?.user ?? null,
    token: auth?.token ?? null,
    setAuth: updateAuth,
    clearAuth,
  };
};