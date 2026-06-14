export type AuthUser = {
  id: string;
  name: string;
  email: string;
  language: string;
  status: 'online' | 'offline';
  avatar?: string;
  preferredLanguage?: string;
};

export type StoredAuth = {
  user: AuthUser;
  token: string;
};

const STORAGE_KEY = 'transend_auth';

const readStorage = (): StoredAuth | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredAuth;
  } catch {
    return null;
  }
};

const normalizeUser = (authData: any): AuthUser => ({
  id: String(authData?._id ?? authData?.id ?? ''),
  name: authData?.name ?? '',
  email: authData?.email ?? '',
  language: authData?.preferredLanguage ?? authData?.language ?? 'en',
  preferredLanguage: authData?.preferredLanguage ?? authData?.language ?? 'en',
  status: authData?.status ?? 'online',
  avatar: authData?.avatar,
});

export const getStoredAuth = (): StoredAuth | null => readStorage();

export const getStoredToken = (): string | null => getStoredAuth()?.token ?? null;

export const getStoredUser = (): AuthUser | null => getStoredAuth()?.user ?? null;

export const setStoredAuth = (authData: any): StoredAuth | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = authData?.token;
  const user = normalizeUser(authData);

  if (!token || !user.id) {
    return null;
  }

  const storedAuth: StoredAuth = {
    token,
    user,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedAuth));
  return storedAuth;
};

export const clearStoredAuth = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
};

export const updateStoredUserLanguage = (preferredLanguage: string) => {
  if (typeof window === 'undefined' || !preferredLanguage) {
    return null;
  }

  const existing = getStoredAuth();
  if (!existing) {
    return null;
  }

  const updatedAuth: StoredAuth = {
    ...existing,
    user: {
      ...existing.user,
      language: preferredLanguage,
      preferredLanguage,
    },
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAuth));
  return updatedAuth;
};

export const logout = () => {
  clearStoredAuth();
}