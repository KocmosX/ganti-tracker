
import React from 'react';
import Header from './Header';
import { useAuth } from '@/lib/auth-context';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, requireAuth = false }) => {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto py-6 px-4">
        {children}
      </main>
      <footer className="bg-muted py-4 px-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Система мониторинга задач
      </footer>
    </div>
  );
};

export default MainLayout;
