
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, User } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { user, login, loading, error, isGuest, loginAsGuest } = useAuth();

  if (user || isGuest) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

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
                <div className="text-destructive text-sm">{error}</div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={loginAsGuest}
            >
              <User className="mr-2 h-4 w-4" />
              Войти как гость
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Login;
