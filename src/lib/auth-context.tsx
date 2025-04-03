
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './db';
import { authenticateUserSQLite } from './sqlite-db';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: Omit<User, 'password'> | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isGuest: boolean;
  loginAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedIsGuest = localStorage.getItem('isGuest');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else if (storedIsGuest === 'true') {
      setIsGuest(true);
    }
    
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Используем SQLite для авторизации
      const authenticatedUser = await authenticateUserSQLite(username, password);
      
      if (authenticatedUser) {
        setUser(authenticatedUser);
        setIsGuest(false);
        localStorage.setItem('user', JSON.stringify(authenticatedUser));
        localStorage.removeItem('isGuest');
        toast({
          title: "Успешный вход",
          description: `Добро пожаловать, ${username}!`,
        });
      } else {
        setError('Неверное имя пользователя или пароль');
        toast({
          title: "Ошибка входа",
          description: "Неверное имя пользователя или пароль",
          variant: "destructive",
        });
      }
    } catch (err) {
      setError('Ошибка при аутентификации');
      console.error('Auth error:', err);
      toast({
        title: "Ошибка входа",
        description: "Произошла ошибка при аутентификации",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('user');
    localStorage.removeItem('isGuest');
    toast({
      title: "Выход из системы",
      description: "Вы успешно вышли из системы",
    });
  };

  const loginAsGuest = () => {
    setUser(null);
    setIsGuest(true);
    localStorage.setItem('isGuest', 'true');
    localStorage.removeItem('user');
    toast({
      title: "Гостевой вход",
      description: "Вы вошли как гость",
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, isGuest, loginAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
