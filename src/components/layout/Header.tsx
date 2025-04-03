
import { Button } from "../ui/button";
import { useAuth } from "../../lib/auth-context";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Link, useLocation } from "react-router-dom";
import { Database, LogOut } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-background shadow">
      <div className="container flex h-16 items-center justify-between space-x-4 sm:space-x-0">
        <div className="flex items-center space-x-4">
          <span className="text-lg font-bold">Система управления задачами</span>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <Tabs defaultValue={location.pathname} className="hidden md:block">
              <TabsList>
                <TabsTrigger value="/" asChild>
                  <Link to="/">Главная</Link>
                </TabsTrigger>
                {user.isAdmin && (
                  <TabsTrigger value="/database" asChild>
                    <Link to="/database">
                      <Database className="mr-2 h-4 w-4" />
                      База данных
                    </Link>
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          )}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-sm hidden sm:block">
                {user.username} ({user.isAdmin ? "Администратор" : "Пользователь"})
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Выйти">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
