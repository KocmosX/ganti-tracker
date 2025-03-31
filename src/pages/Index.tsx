
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If logged in or guest, go to dashboard, otherwise to login
  if (user || isGuest) {
    return <Navigate to="/" replace />;
  } else {
    return <Navigate to="/login" replace />;
  }
};

export default Index;
