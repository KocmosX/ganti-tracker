
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { exportDatabaseToFile, importDatabaseFromFile, createNewEmptyDatabase } from '../../lib/sqlite-db';
import { AlertCircle, Database, Download, Upload, FilePlus } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const DatabaseManager: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleExportDatabase = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await exportDatabaseToFile();
      toast({
        title: 'Успех',
        description: 'База данных успешно экспортирована',
      });
    } catch (error) {
      setError(`Ошибка при экспорте базы данных: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      await importDatabaseFromFile(file);
      toast({
        title: 'Успех',
        description: 'База данных успешно импортирована',
      });
      // Сбрасываем input file, чтобы можно было загрузить тот же файл снова
      event.target.value = '';
    } catch (error) {
      setError(`Ошибка при импорте базы данных: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewDatabase = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await createNewEmptyDatabase();
      toast({
        title: 'Успех',
        description: 'Новая база данных создана и экспортирована',
      });
    } catch (error) {
      setError(`Ошибка при создании новой базы данных: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Управление базой данных SQLite
        </CardTitle>
        <CardDescription>
          Экспорт, импорт и создание файлов базы данных SQLite
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Экспорт базы данных</h3>
          <p className="text-sm text-muted-foreground">
            Экспортируйте текущую базу данных в файл SQLite для резервного копирования или переноса на другой компьютер.
          </p>
          <Button 
            onClick={handleExportDatabase} 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Экспортировать базу данных
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Импорт базы данных</h3>
          <p className="text-sm text-muted-foreground">
            Импортируйте существующую базу данных из файла SQLite.
          </p>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => document.getElementById('file-upload')?.click()} 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              Импортировать базу данных
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".sqlite,.db"
              onChange={handleImportDatabase}
              className="hidden"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Создать новую базу данных</h3>
          <p className="text-sm text-muted-foreground">
            Создайте новую пустую базу данных с необходимой структурой таблиц.
          </p>
          <Button 
            onClick={handleCreateNewDatabase} 
            disabled={isLoading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <FilePlus className="mr-2 h-4 w-4" />
            Создать новую базу данных
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between flex-wrap">
        <p className="text-xs text-muted-foreground">
          Примечание: При импорте новой базы данных текущие данные будут заменены.
        </p>
      </CardFooter>
    </Card>
  );
};

export default DatabaseManager;
