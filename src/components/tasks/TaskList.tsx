
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Pencil, 
  Trash, 
  Plus, 
  Search, 
  FilterX, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Check as CheckIcon, 
  X as XIcon,
  Filter,
  Calendar 
} from 'lucide-react';
import { format, differenceInDays, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task, MedicalOrganization, getAllTasks, getMedicalOrganizationById, deleteTask, updateTaskMoStatus, updateTask } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import TaskDetailsModal from './TaskDetailsModal';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TASK_ASSIGNERS, DATE_FORMAT_OPTIONS } from '@/lib/constants';

interface TaskListProps {
  organizations: MedicalOrganization[];
  onTaskCreate: () => void;
  onTaskEdit: (task: Task) => void;
  refreshTasks: boolean;
  showCompleted?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ 
  organizations, 
  onTaskCreate, 
  onTaskEdit,
  refreshTasks,
  showCompleted = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMo, setSelectedMo] = useState<string>('all');
  const [selectedAssigner, setSelectedAssigner] = useState<string>('all');
  const [organizationNames, setOrganizationNames] = useState<Record<number, string>>({});
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [editingMoId, setEditingMoId] = useState<number | null>(null);
  const [editingPercentage, setEditingPercentage] = useState<string>('');
  const [editingComment, setEditingComment] = useState<string>('');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskPercentage, setEditingTaskPercentage] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
  }, [searchTerm, selectedMo, selectedAssigner, tasks, showCompleted, startDateFilter, endDateFilter, priorityFilter]);

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
    
    // Filter by completion status
    if (showCompleted) {
      filtered = filtered.filter(task => task.completionPercentage === 100);
    } else {
      filtered = filtered.filter(task => task.completionPercentage < 100);
    }

    // Filter by organization
    if (selectedMo && selectedMo !== 'all') {
      filtered = filtered.filter(task => {
        // Проверяем основную МО
        if (task.moId === parseInt(selectedMo)) return true;
        
        // Или проверяем МО в статусах
        if (task.moStatuses) {
          return task.moStatuses.some(status => status.moId === parseInt(selectedMo));
        }
        
        return false;
      });
    }

    // Filter by assigner
    if (selectedAssigner && selectedAssigner !== 'all') {
      filtered = filtered.filter(task => task.assignedBy === selectedAssigner);
    }

    // Filter by date range
    if (startDateFilter || endDateFilter) {
      filtered = filtered.filter(task => {
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.endDate);
        
        if (startDateFilter && !endDateFilter) {
          return taskStart >= new Date(startDateFilter) || 
                taskEnd >= new Date(startDateFilter);
        } 
        
        if (!startDateFilter && endDateFilter) {
          return taskStart <= new Date(endDateFilter) ||
                taskEnd <= new Date(endDateFilter);
        }
        
        if (startDateFilter && endDateFilter) {
          const filterStart = new Date(startDateFilter);
          const filterEnd = new Date(endDateFilter);
          
          // Check if the task overlaps with the filter date range
          return (
            (taskStart >= filterStart && taskStart <= filterEnd) || // Task starts within range
            (taskEnd >= filterStart && taskEnd <= filterEnd) ||     // Task ends within range
            (taskStart <= filterStart && taskEnd >= filterEnd)      // Task spans the entire range
          );
        }
        
        return true;
      });
    }

    // Filter by search term (title, description, etc.)
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(lowerSearchTerm) ||
        task.description.toLowerCase().includes(lowerSearchTerm) ||
        task.assignedBy?.toLowerCase().includes(lowerSearchTerm) ||
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
    setSelectedAssigner('all');
    setStartDateFilter('');
    setEndDateFilter('');
    setPriorityFilter('all');
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

  const handleViewTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsModalOpen(true);
  };

  const handleTaskUpdated = () => {
    loadTasks();
  };

  const toggleTaskExpanded = (taskId: number | undefined) => {
    if (!taskId) return;
    
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const resetEditingState = () => {
    setEditingMoId(null);
    setEditingPercentage('');
    setEditingComment('');
    setEditingTaskId(null);
    setEditingTaskPercentage('');
  };

  const handleEdit = (taskId: number | undefined, moId: number, percentage: number, comment: string = '') => {
    if (!taskId) return;
    
    setEditingMoId(moId);
    setEditingPercentage(percentage.toString());
    setEditingComment(comment);
  };

  const handleEditTask = (task: Task) => {
    if (!task.id) return;
    
    setEditingTaskId(task.id);
    setEditingTaskPercentage(task.completionPercentage.toString());
  };

  const handleSave = async (taskId: number | undefined) => {
    if (!taskId || editingMoId === null) return;

    try {
      const percentage = parseInt(editingPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast({
          title: "Ошибка",
          description: "Процент выполнения должен быть числом от 0 до 100",
          variant: "destructive",
        });
        return;
      }

      await updateTaskMoStatus(taskId, editingMoId, {
        completionPercentage: percentage,
        comment: editingComment,
        lastUpdated: new Date().toISOString()
      });

      toast({
        title: "Статус обновлен",
        description: "Статус выполнения задачи успешно обновлен",
      });

      loadTasks();
      resetEditingState();
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус выполнения",
        variant: "destructive",
      });
    }
  };

  const handleSaveTaskStatus = async (task: Task) => {
    if (!task.id || !editingTaskId) return;

    try {
      const percentage = parseInt(editingTaskPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast({
          title: "Ошибка",
          description: "Процент выполнения должен быть числом от 0 до 100",
          variant: "destructive",
        });
        return;
      }

      await updateTask(task.id, {
        ...task,
        completionPercentage: percentage
      });

      toast({
        title: "Статус обновлен",
        description: "Статус выполнения задачи успешно обновлен",
      });

      loadTasks();
      resetEditingState();
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус выполнения",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{showCompleted ? "Завершённые задачи" : "Активные задачи"}</CardTitle>
          <Button onClick={onTaskCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Новая задача
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-4">
            {/* Основные фильтры */}
            <div className="flex flex-col md:flex-row gap-4">
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
              
              <div className="flex gap-2">
                <Button 
                  variant={showAdvancedFilters ? "secondary" : "outline"} 
                  size="sm" 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {showAdvancedFilters ? "Скрыть фильтры" : "Расширенный фильтр"}
                </Button>
                
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <FilterX className="mr-2 h-4 w-4" />
                  Сбросить
                </Button>
              </div>
            </div>
            
            {/* Дополнительные фильтры */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-md">
                <div>
                  <label className="block text-sm mb-1">Организация</label>
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
                        <SelectItem 
                          key={org.id} 
                          value={org.id?.toString() || 'unknown'}
                        >
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm mb-1">Постановщик</label>
                  <Select
                    value={selectedAssigner}
                    onValueChange={setSelectedAssigner}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Фильтр по постановщику" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все постановщики</SelectItem>
                      {TASK_ASSIGNERS.map((assigner) => (
                        <SelectItem 
                          key={assigner} 
                          value={assigner}
                        >
                          {assigner}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col space-y-4">
                  <div>
                    <label className="block text-sm mb-1">Период с:</label>
                    <Input
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Период по:</label>
                    <Input
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Задача</TableHead>
                  <TableHead>Организация</TableHead>
                  <TableHead>Дата начала</TableHead>
                  <TableHead>Дата окончания</TableHead>
                  <TableHead>Прогресс</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Постановщик</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                      Задачи не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task) => {
                    const daysLeft = calculateDaysLeft(task.endDate);
                    const hasMultipleOrgs = task.moStatuses && task.moStatuses.length > 1;
                    const isExpanded = task.id && expandedTasks[task.id] || false;
                    const isEditing = task.id === editingTaskId;
                    
                    return (
                      <React.Fragment key={task.id}>
                        <TableRow 
                          className={`hover:bg-muted/50 ${task.moStatuses && task.moStatuses.length > 0 ? 'cursor-pointer' : ''}`}
                          onClick={() => task.moStatuses && task.moStatuses.length > 0 ? toggleTaskExpanded(task.id) : null}
                        >
                          <TableCell>
                            {task.moStatuses && task.moStatuses.length > 0 && (
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            {hasMultipleOrgs ? (
                              <Badge variant="outline" className="cursor-help" title="Несколько организаций">
                                {task.moStatuses!.length} МО
                              </Badge>
                            ) : (
                              organizationNames[task.moId] || 'Неизвестно'
                            )}
                          </TableCell>
                          <TableCell>{format(new Date(task.startDate), DATE_FORMAT_OPTIONS.SHORT_DATE, { locale: ru })}</TableCell>
                          <TableCell>{format(new Date(task.endDate), DATE_FORMAT_OPTIONS.SHORT_DATE, { locale: ru })}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editingTaskPercentage}
                                  onChange={(e) => setEditingTaskPercentage(e.target.value)}
                                  className="w-20"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => handleSaveTaskStatus(task)}
                                  className="h-8 w-8"
                                >
                                  <CheckIcon size={16} />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={resetEditingState}
                                  className="h-8 w-8"
                                >
                                  <XIcon size={16} />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Progress value={task.completionPercentage} className="h-2" />
                                <span className="text-xs font-medium">{task.completionPercentage}%</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTask(task);
                                  }}
                                  className="h-6 w-6 ml-1"
                                >
                                  <Pencil size={12} />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(task)}</TableCell>
                          <TableCell>{task.assignedBy}</TableCell>
                          <TableCell className="space-x-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTaskDetails(task);
                              }}
                              title="Просмотреть детали"
                            >
                              <Eye size={16} />
                            </Button>
                            
                            {user?.isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskEdit(task);
                                  }}
                                  title="Редактировать"
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
                                  title="Удалить"
                                >
                                  <Trash size={16} />
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                        
                        {isExpanded && task.moStatuses && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0 border-t-0">
                              <div className="pl-6 pr-4 py-2 bg-muted/20">
                                <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-sm font-semibold">Статусы по организациям</h4>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onTaskEdit(task);
                                    }}
                                  >
                                    <Pencil size={14} className="mr-1" />
                                    Редактировать задачу
                                  </Button>
                                </div>
                                <div className="rounded-md border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Организация</TableHead>
                                        <TableHead>Процент выполнения</TableHead>
                                        <TableHead>Статус</TableHead>
                                        <TableHead>Комментарий</TableHead>
                                        <TableHead>Действия</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {task.moStatuses.map((moStatus) => (
                                        <TableRow key={moStatus.moId}>
                                          <TableCell className="font-medium">
                                            {organizationNames[moStatus.moId] || `МО #${moStatus.moId}`}
                                          </TableCell>
                                          <TableCell>
                                            {editingMoId === moStatus.moId ? (
                                              <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={editingPercentage}
                                                onChange={(e) => setEditingPercentage(e.target.value)}
                                                className="w-20"
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                            ) : (
                                              <div className="flex items-center space-x-2">
                                                <Progress value={moStatus.completionPercentage} className="h-2 w-20" />
                                                <span className="text-xs font-medium">{moStatus.completionPercentage}%</span>
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {moStatus.completionPercentage === 100 ? (
                                              <Badge className="bg-status-ontime">Выполнено</Badge>
                                            ) : moStatus.completionPercentage > 0 ? (
                                              <Badge className="bg-status-delayed">В процессе</Badge>
                                            ) : (
                                              <Badge variant="outline">Не начато</Badge>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {editingMoId === moStatus.moId ? (
                                              <Textarea
                                                value={editingComment}
                                                onChange={(e) => setEditingComment(e.target.value)}
                                                placeholder="Добавьте комментарий..."
                                                className="min-h-[80px]"
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                            ) : (
                                              <div className="max-w-[200px] overflow-hidden text-ellipsis">
                                                {moStatus.comment || "—"}
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell onClick={(e) => e.stopPropagation()}>
                                            {editingMoId === moStatus.moId ? (
                                              <div className="flex space-x-1">
                                                <Button 
                                                  variant="outline" 
                                                  size="icon"
                                                  onClick={() => handleSave(task.id)}
                                                >
                                                  <CheckIcon size={16} />
                                                </Button>
                                                <Button 
                                                  variant="outline" 
                                                  size="icon"
                                                  onClick={resetEditingState}
                                                >
                                                  <XIcon size={16} />
                                                </Button>
                                              </div>
                                            ) : (
                                              <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleEdit(task.id, moStatus.moId, moStatus.completionPercentage, moStatus.comment)}
                                              >
                                                <Edit size={14} className="mr-1" />
                                                Редактировать
                                              </Button>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
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

      <TaskDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        task={selectedTask}
        organizations={organizations}
        onTaskUpdated={handleTaskUpdated}
      />
    </>
  );
};

export default TaskList;
