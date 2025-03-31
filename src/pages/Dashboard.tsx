
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import TaskList from '@/components/tasks/TaskList';
import TaskForm from '@/components/tasks/TaskForm';
import BulkTaskForm from '@/components/tasks/BulkTaskForm';
import GanttChart from '@/components/tasks/GanttChart';
import OrganizationTaskList from '@/components/tasks/OrganizationTaskList';
import { MedicalOrganization, Task, getAllMedicalOrganizations, getAllTasks } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertTriangle, ListTodo, Plus, UserPlus } from 'lucide-react';
import { differenceInDays, isBefore } from 'date-fns';
import { useAuth } from '@/lib/auth-context';

const Dashboard: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<MedicalOrganization[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isBulkTaskFormOpen, setIsBulkTaskFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0
  });

  useEffect(() => {
    loadOrganizations();
    loadTasks();
  }, []);

  useEffect(() => {
    calculateTaskStats();
  }, [tasks]);

  const loadOrganizations = async () => {
    try {
      const orgs = await getAllMedicalOrganizations();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список организаций",
        variant: "destructive",
      });
    }
  };

  const loadTasks = async () => {
    try {
      const loadedTasks = await getAllTasks();
      setTasks(loadedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить задачи",
        variant: "destructive",
      });
    }
  };

  const calculateTaskStats = () => {
    if (!tasks.length) return;

    const today = new Date();
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;

    tasks.forEach(task => {
      if (task.completionPercentage === 100) {
        completed++;
      } else {
        inProgress++;
        
        const endDate = new Date(task.endDate);
        if (isBefore(endDate, today)) {
          overdue++;
        }
      }
    });

    setTaskStats({
      total: tasks.length,
      completed,
      inProgress,
      overdue
    });
  };

  const handleCreateTask = () => {
    setTaskToEdit(undefined);
    setIsTaskFormOpen(true);
  };

  const handleCreateBulkTasks = () => {
    setIsBulkTaskFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskFormOpen(true);
  };

  const handleTaskUpdated = () => {
    loadTasks();
    setRefreshTrigger(prev => !prev);
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Система мониторинга задач</h1>
        {user?.isAdmin && (
          <div className="flex space-x-2">
            <Button onClick={handleCreateTask}>
              <Plus className="mr-2 h-4 w-4" />
              Новая задача
            </Button>
            <Button variant="outline" onClick={handleCreateBulkTasks}>
              <UserPlus className="mr-2 h-4 w-4" />
              Массовое создание
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего задач</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Завершенные задачи</CardTitle>
            <CheckCircle className="h-4 w-4 text-status-ontime" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {taskStats.total ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}% от общего числа
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В работе</CardTitle>
            <Clock className="h-4 w-4 text-status-delayed" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              {taskStats.total ? Math.round((taskStats.inProgress / taskStats.total) * 100) : 0}% от общего числа
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Просроченные</CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-overdue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              {taskStats.inProgress ? Math.round((taskStats.overdue / taskStats.inProgress) * 100) : 0}% от задач в работе
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">По организациям</TabsTrigger>
          <TabsTrigger value="list">Список задач</TabsTrigger>
          <TabsTrigger value="gantt">Диаграмма Ганта</TabsTrigger>
        </TabsList>
        <TabsContent value="organizations" className="space-y-4">
          <OrganizationTaskList 
            organizations={organizations}
            onTaskEdit={handleEditTask}
            refreshTasks={refreshTrigger}
          />
        </TabsContent>
        <TabsContent value="list" className="space-y-4">
          <TaskList 
            organizations={organizations}
            onTaskCreate={handleCreateTask}
            onTaskEdit={handleEditTask}
            refreshTasks={refreshTrigger}
          />
        </TabsContent>
        <TabsContent value="gantt">
          <GanttChart tasks={tasks} organizations={organizations} />
        </TabsContent>
      </Tabs>

      {isTaskFormOpen && (
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          organizations={organizations}
          taskToEdit={taskToEdit}
          onTaskAdded={handleTaskUpdated}
        />
      )}

      {isBulkTaskFormOpen && (
        <BulkTaskForm
          isOpen={isBulkTaskFormOpen}
          onClose={() => setIsBulkTaskFormOpen(false)}
          organizations={organizations}
          onTasksAdded={handleTaskUpdated}
        />
      )}
    </MainLayout>
  );
};

export default Dashboard;
