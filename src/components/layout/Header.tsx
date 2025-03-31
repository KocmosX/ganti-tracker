
import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout, isGuest } = useAuth();

  return (
    <header className="bg-medical py-4 px-6 flex justify-between items-center text-white">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold">Система мониторинга задач</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {(user || isGuest) && (
          <>
            <div className="flex items-center space-x-2">
              <User size={18} />
              <span>{user ? user.username : 'Гость'}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-white border-white hover:bg-medical-dark"
              onClick={logout}
            >
              <LogOut size={16} className="mr-2" />
              Выйти
            </Button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
