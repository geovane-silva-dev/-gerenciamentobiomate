import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string } | null;
  login: (username: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check local storage (remember me active) or session storage
    const localUser = localStorage.getItem('biomate_auth_user');
    const sessionUser = sessionStorage.getItem('biomate_auth_user');

    if (localUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(localUser));
    } else if (sessionUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(sessionUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean): Promise<{ success: boolean; error?: string }> => {
    // Return a promise with a 1000ms delay to simulate loading
    return new Promise((resolve) => {
      setTimeout(() => {
        if (username === 'bioadmin' && password === 'biomate123') {
          const authUser = { username };
          if (rememberMe) {
            localStorage.setItem('biomate_auth_user', JSON.stringify(authUser));
          } else {
            sessionStorage.setItem('biomate_auth_user', JSON.stringify(authUser));
          }
          setIsAuthenticated(true);
          setUser(authUser);
          resolve({ success: true });
        } else {
          resolve({ success: false, error: 'Usuário ou senha incorretos' });
        }
      }, 1000);
    });
  };

  const logout = () => {
    localStorage.removeItem('biomate_auth_user');
    sessionStorage.removeItem('biomate_auth_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
