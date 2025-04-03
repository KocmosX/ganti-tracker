
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Database } from 'lucide-react';
import DatabaseManager from '../components/admin/DatabaseManager';

const DatabaseManagement: React.FC = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6" />
            <CardTitle>Управление базой данных</CardTitle>
          </div>
          <CardDescription>
            Экспорт, импорт и управление файлами базы данных SQLite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="database-manager">
            <TabsList className="mb-4">
              <TabsTrigger value="database-manager">Файл базы данных</TabsTrigger>
              {/* Можно добавить дополнительные вкладки в будущем */}
            </TabsList>
            <TabsContent value="database-manager">
              <DatabaseManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseManagement;
