
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash, Plus, Search, FilterX } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task, MedicalOrganization, getAllTasks, getMedicalOrganizationById, deleteTask } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';

interface TaskListProps {
  organizations: MedicalOrganization[];
  onTaskCreate: () => void;
  onTaskEdit: (task: Task) => void;
  refreshTasks: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ 
  organizations, 
  onTaskCreate, 
  onTaskEdit,
  refreshTasks
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMo, setSelectedMo] = useState<string>('all');
  const [organizationNames, setOrganizationNames] = useState<Record<number, string>>({});
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTasks]);

  useEffect(() => {
    // Create a mapping of organization IDs to names for quicker lookup
    const orgMap: Record<number, string> = {};
    organizations.forEach(org => {
      if (org.id !== undefined) {
        orgMap[org.id] = org.name;
      }
    });
    setOrganizationNames(orgMap);
  }, [organizations]);

  useEffect(() => {
    filterTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedMo, tasks]);

  const loadTasks = async () => {
    try {
      const allTasks = await getAllTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить задачи",
        variant: "destructive",
      });
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    if (selectedMo && selectedMo !== 'all') {
      filtered = filtered.filter(task => task.moId === parseInt(selectedMo));
    }

    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(lowerSearchTerm) ||
        task.description.toLowerCase().includes(lowerSearchTerm) ||
        organizationNames[task.moId]?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    setFilteredTasks(filtered);
  };

  const handleDeleteTask = async () => {
    if (taskToDelete === null) return;

    try {
      await deleteTask(taskToDelete);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDelete));
      toast({
        title: "Задача удалена",
        description: "Задача успешно удалена",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить задачу",
        variant: "destructive",
      });
    } finally {
      setTaskToDelete(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedMo('all');
  };

  const calculateDaysLeft = (endDateStr: string) => {
    const endDate = new Date(endDateStr);
    const today = new Date();
    return differenceInDays(endDate, today);
  };

  const getStatusBadge = (task: Task) => {
    const daysLeft = calculateDaysLeft(task.endDate);
    
    if (task.completionPercentage === 100) {
      return <Badge className="bg-status-ontime">Завершена</Badge>;
    } else if (daysLeft < 0) {
      return <Badge className="bg-status-overdue">Просрочена</Badge>;
    } else if (daysLeft <= 3) {
      return <Badge className="bg-status-delayed">Скоро дедлайн</Badge>;
    } else {
      return <Badge variant="outline">В процессе</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Список задач</CardTitle>
          {user?.isAdmin && (
            <Button onClick={onTaskCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Новая задача
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 flex items-center space-x-2">
              <Input
                placeholder="Поиск задач..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => setSearchTerm('')}>
                <Search size={16} />
              </Button>
            </div>
            <div className="w-full md:w-64">
              <Select
                value={selectedMo}
                onValueChange={setSelectedMo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Фильтр по организации" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все организации</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id?.toString() || 'unknown'}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={resetFilters}>
              <FilterX className="mr-2 h-4 w-4" />
              Сбросить фильтры
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Задача</TableHead>
                  <TableHead>Организация</TableHead>
                  <TableHead>Дата начала</TableHead>
                  <TableHead>Дата окончания</TableHead>
                  <TableHead>Прогресс</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Постановщик</TableHead>
                  {user?.isAdmin && <TableHead>Действия</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.isAdmin ? 8 : 7} className="text-center py-6 text-muted-foreground">
                      Задачи не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task) => {
                    const daysLeft = calculateDaysLeft(task.endDate);
                    return (
                      <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onTaskEdit(task)}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{organizationNames[task.moId] || 'Неизвестно'}</TableCell>
                        <TableCell>{format(new Date(task.startDate), 'dd.MM.yyyy', { locale: ru })}</TableCell>
                        <TableCell>{format(new Date(task.endDate), 'dd.MM.yyyy', { locale: ru })}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={task.completionPercentage} className="h-2" />
                            <span className="text-xs font-medium">{task.completionPercentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(task)}</TableCell>
                        <TableCell>{task.assignedBy}</TableCell>
                        {user?.isAdmin && (
                          <TableCell className="space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaskEdit(task);
                              }}
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToDelete(task.id || null);
                              }}
                            >
                              <Trash size={16} />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={taskToDelete !== null} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Задача будет безвозвратно удалена из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskList;
