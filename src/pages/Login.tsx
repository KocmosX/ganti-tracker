
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, User, Loader2 } from 'lucide-react';
import { initSqliteDb } from '@/lib/sqlite-db';
import MainLayout from '@/components/layout/MainLayout';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [initializingDb, setInitializingDb] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const { user, login, loading, error, isGuest, loginAsGuest } = useAuth();

  useEffect(() => {
    const initDb = async () => {
      try {
        await initSqliteDb();
        setInitializingDb(false);
        console.log('База данных успешно инициализирована');
      } catch (err) {
        console.error('Ошибка при инициализации базы данных:', err);
        setInitError('Ошибка при инициализации базы данных. Попробуйте обновить страницу.');
        setInitializingDb(false);
      }
    };
    
    // Установка небольшой задержки, чтобы сначала отрисовался UI
    const timer = setTimeout(() => {
      initDb();
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  if (user || isGuest) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  const handleQuickAdminLogin = () => {
    setUsername('admin');
    setPassword('admin');
    login('admin', 'admin');
  };

  if (initializingDb) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg">Инициализация базы данных...</p>
        </div>
      </MainLayout>
    );
  }

  if (initError) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{initError}</AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()}>Обновить страницу</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-[350px]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Вход в систему</CardTitle>
            <CardDescription>
              Для работы с системой мониторинга задач
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Имя пользователя</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Вход...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <LogIn className="mr-2 h-4 w-4" />
                    Войти
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex-col space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={loginAsGuest}
            >
              <User className="mr-2 h-4 w-4" />
              Войти как гость
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleQuickAdminLogin}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Войти как Admin
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Login;
