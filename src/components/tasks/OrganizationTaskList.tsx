import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  MedicalOrganization, 
  Task, 
  getAllTasks,
  updateTaskMoStatus 
} from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Search, 
  FilterX, 
  ArrowUpDown, 
  BarChart4,
  Eye,
  Pencil,
  Filter,
  Check,
  X,
  CalendarIcon,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import TaskDetailsModal from './TaskDetailsModal';
import { useToast } from '@/hooks/use-toast';
import { FILTER_TYPES, PRIORITY_LABELS, TASK_ASSIGNERS } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { 
  getAllMedicalOrganizationsSQLite, 
  getAllTasksSQLite, 
  updateTaskMoStatusSQLite 
} from '@/lib/sqlite-db';

interface OrganizationTaskListProps {
  organizations: MedicalOrganization[];
  onTaskEdit: (task: Task) => void;
  refreshTasks: boolean;
}

type SortKey = 'name' | 'tasksTotal' | 'tasksCompleted' | 'tasksInProgress' | 'tasksOverdue';
type SortDirection = 'asc' | 'desc';

interface OrgTaskStats {
  id: number;
  name: string;
  tasks: Task[];
  tasksTotal: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOverdue: number;
  completionPercent: number;
}

const OrganizationTaskList: React.FC<OrganizationTaskListProps> = ({
  organizations,
  onTaskEdit,
  refreshTasks
}) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [orgTaskStats, setOrgTaskStats] = useState<OrgTaskStats[]>([]);
  const [sortedOrgStats, setSortedOrgStats] = useState<OrgTaskStats[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedOrgs, setExpandedOrgs] = useState<Record<number, boolean>>({});
  const [showOnlyWithTasks, setShowOnlyWithTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [assignerFilter, setAssignerFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingMoId, setEditingMoId] = useState<number | null>(null);
  const [editingPercentage, setEditingPercentage] = useState<string>('');
  const [editingComment, setEditingComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [refreshTasks]);

  useEffect(() => {
    if (tasks.length && organizations.length) {
      calculateOrgTaskStats();
    }
  }, [tasks, organizations]);

  useEffect(() => {
    applySorting();
  }, [orgTaskStats, sortKey, sortDirection, searchTerm, filterType, showOnlyWithTasks, assignerFilter, startDateFilter, endDateFilter, priorityFilter]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      let allTasks: Task[] = [];
      try {
        allTasks = await getAllTasksSQLite();
        console.log('Tasks loaded from SQLite:', allTasks.length);
      } catch (sqliteError) {
        console.warn('Failed to load from SQLite, falling back to IndexedDB:', sqliteError);
        allTasks = await getAllTasks();
      }
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить задачи. Пожалуйста, попробуйте позже.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOrgTaskStats = () => {
    const stats: OrgTaskStats[] = [];
    const today = new Date();

    organizations.forEach(org => {
      if (org.id === undefined) return;

      const orgTasks = tasks.filter(task => {
        const isForThisOrg = task.moId === org.id || 
                           (task.moStatuses && task.moStatuses.some(status => status.moId === org.id));
        
        return isForThisOrg;
      });

      let tasksCompleted = 0;
      let tasksInProgress = 0;
      let tasksOverdue = 0;

      orgTasks.forEach(task => {
        const moStatus = task.moStatuses?.find(status => status.moId === org.id);
        const completionPercentage = moStatus ? moStatus.completionPercentage : task.completionPercentage;
        
        if (completionPercentage === 100) {
          tasksCompleted++;
        } else {
          tasksInProgress++;
          
          const endDate = new Date(task.endDate);
          if (endDate < today) {
            tasksOverdue++;
          }
        }
      });

      let completionPercent = 0;
      if (orgTasks.length > 0) {
        let totalPercent = 0;
        orgTasks.forEach(task => {
          const moStatus = task.moStatuses?.find(status => status.moId === org.id);
          totalPercent += moStatus ? moStatus.completionPercentage : task.completionPercentage;
        });
        completionPercent = Math.round(totalPercent / orgTasks.length);
      }

      stats.push({
        id: org.id,
        name: org.name,
        tasks: orgTasks,
        tasksTotal: orgTasks.length,
        tasksCompleted,
        tasksInProgress,
        tasksOverdue,
        completionPercent
      });
    });

    setOrgTaskStats(stats);
  };

  const applySorting = () => {
    let filtered = [...orgTaskStats];
    const today = new Date(); // Add this line to define 'today'

    if (searchTerm) {
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(org => {
        if (filterType === 'ВПО') return org.name.includes('ВПО');
        if (filterType === 'ДПО') return org.name.includes('ДПО');
        if (filterType === 'КС') return org.name.includes('КС');
        if (filterType === 'КДЦ') return org.name.includes('КДЦ');
        return false;
      });
    }

    if (showOnlyWithTasks) {
      filtered = filtered.filter(org => org.tasksTotal > 0);
    }

    filtered = filtered.map(org => {
      const newOrg = { ...org };
      
      newOrg.tasks = org.tasks.filter(task => {
        if (assignerFilter !== 'all' && task.assignedBy !== assignerFilter) {
          return false;
        }
        
        if (startDateFilter) {
          const taskStartDate = new Date(task.startDate);
          startDateFilter.setHours(0, 0, 0, 0);
          if (taskStartDate < startDateFilter) {
            return false;
          }
        }
        
        if (endDateFilter) {
          const taskEndDate = new Date(task.endDate);
          endDateFilter.setHours(23, 59, 59, 999);
          if (taskEndDate > endDateFilter) {
            return false;
          }
        }
        
        if (priorityFilter !== 'all' && task.priority && priorityFilter === task.priority) {
          return true;
        } else if (priorityFilter !== 'all') {
          return false;
        }
        
        return true;
      });
      
      let tasksCompleted = 0;
      let tasksInProgress = 0;
      let tasksOverdue = 0;
      
      newOrg.tasks.forEach(task => {
        const moStatus = task.moStatuses?.find(status => status.moId === org.id);
        const completionPercentage = moStatus ? moStatus.completionPercentage : task.completionPercentage;
        
        if (completionPercentage === 100) {
          tasksCompleted++;
        } else {
          tasksInProgress++;
          
          const endDate = new Date(task.endDate);
          if (endDate < today) {
            tasksOverdue++;
          }
        }
      });
      
      newOrg.tasksTotal = newOrg.tasks.length;
      newOrg.tasksCompleted = tasksCompleted;
      newOrg.tasksInProgress = tasksInProgress;
      newOrg.tasksOverdue = tasksOverdue;
      
      return newOrg;
    });
    
    if (showOnlyWithTasks) {
      filtered = filtered.filter(org => org.tasksTotal > 0);
    }

    filtered.sort((a, b) => {
      if (sortKey === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        const valA = a[sortKey];
        const valB = b[sortKey];
        return sortDirection === 'asc' 
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

    setSortedOrgStats(filtered);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setAssignerFilter('all');
    setPriorityFilter('all');
    setShowOnlyWithTasks(false);
    setStartDateFilter(undefined);
    setEndDateFilter(undefined);
  };

  const getStatusBadge = (task: Task, moId: number) => {
    const moStatus = task.moStatuses?.find(status => status.moId === moId);
    const completionPercentage = moStatus ? moStatus.completionPercentage : task.completionPercentage;
    const daysLeft = differenceInDays(new Date(task.endDate), new Date());
    
    if (completionPercentage === 100) {
      return <Badge className="bg-status-ontime">Завершена</Badge>;
    } else if (daysLeft < 0) {
      return <Badge className="bg-status-overdue">Просрочена</Badge>;
    } else if (daysLeft <= 3) {
      return <Badge className="bg-status-delayed">Скоро дедлайн</Badge>;
    } else {
      return <Badge variant="outline">В процессе</Badge>;
    }
  };

  const toggleOrgExpanded = (orgId: number) => {
    setExpandedOrgs(prev => ({
      ...prev,
      [orgId]: !prev[orgId]
    }));
  };

  const handleViewTaskDetails = (task: Task, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedTask(task);
    setIsDetailsModalOpen(true);
  };

  const handleTaskUpdated = () => {
    loadTasks();
  };

  const handleEditTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    onTaskEdit(task);
  };
  
  const handleEditStatus = (taskId: number, moId: number, percentage: number, comment: string = '') => {
    setEditingTaskId(taskId);
    setEditingMoId(moId);
    setEditingPercentage(percentage.toString());
    setEditingComment(comment || '');
  };
  
  const handleSaveStatus = async () => {
    if (!editingTaskId || !editingMoId) return;
    
    try {
      const percentage = parseInt(editingPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast({
          title: "Ошибка",
          description: "Процент выполнения должен быть числом от 0 до 100",
          variant: "destructive"
        });
        return;
      }
      
      setIsLoading(true);
      
      try {
        await updateTaskMoStatusSQLite(editingTaskId, editingMoId, {
          completionPercentage: percentage,
          comment: editingComment,
          lastUpdated: new Date().toISOString()
        });
        console.log('Task status updated in SQLite');
      } catch (sqliteError) {
        console.warn('Failed to update in SQLite, falling back to IndexedDB:', sqliteError);
        await updateTaskMoStatus(editingTaskId, editingMoId, {
          completionPercentage: percentage,
          comment: editingComment,
          lastUpdated: new Date().toISOString()
        });
      }
      
      toast({
        title: "Статус обновлен",
        description: "Статус выполнения задачи успешно обновлен"
      });
      
      resetEditingState();
      loadTasks();
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус задачи",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetEditingState = () => {
    setEditingTaskId(null);
    setEditingMoId(null);
    setEditingPercentage('');
    setEditingComment('');
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return format(date, 'dd.MM.yyyy');
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Задачи по организациям</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <BarChart4 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center space-x-2">
                <Input
                  placeholder="Поиск организаций..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => setSearchTerm('')}>
                  <Search size={16} />
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select
                  value={filterType}
                  onValueChange={setFilterType}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Тип организации" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    {Object.values(FILTER_TYPES).filter(type => type !== 'all').map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={assignerFilter}
                  onValueChange={setAssignerFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Постановщик задачи" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все постановщики</SelectItem>
                    {TASK_ASSIGNERS.map(assigner => (
                      <SelectItem key={assigner} value={assigner}>
                        {assigner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Приоритет" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все приоритеты</SelectItem>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex flex-col md:flex-row gap-4">
                <div>
                  <p className="text-sm mb-1">Дата начала (от)</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full md:w-auto justify-start text-left font-normal",
                          !startDateFilter && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDateFilter ? formatDate(startDateFilter) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDateFilter}
                        onSelect={setStartDateFilter}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <p className="text-sm mb-1">Дата окончания (до)</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full md:w-auto justify-start text-left font-normal",
                          !endDateFilter && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDateFilter ? formatDate(endDateFilter) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDateFilter}
                        onSelect={setEndDateFilter}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <Button variant="outline" onClick={resetFilters} className="whitespace-nowrap">
                <FilterX className="mr-2 h-4 w-4" />
                Сбросить фильтры
              </Button>
            </div>
          </div>

          <div className="flex items-center mb-4">
            <Checkbox 
              id="showWithTasks" 
              checked={showOnlyWithTasks} 
              onCheckedChange={(checked) => setShowOnlyWithTasks(checked as boolean)} 
            />
            <label 
              htmlFor="showWithTasks" 
              className="ml-2 text-sm font-medium cursor-pointer"
            >
              Показать только организации с задачами
            </label>
          </div>

          {isLoading ? (
            <div className="text-center py-6">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-muted-foreground">Загрузка данных...</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center">
                        Организация
                        {sortKey === 'name' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer text-center" 
                      onClick={() => toggleSort('tasksTotal')}
                    >
                      <div className="flex items-center justify-center">
                        Всего задач
                        {sortKey === 'tasksTotal' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer text-center" 
                      onClick={() => toggleSort('tasksCompleted')}
                    >
                      <div className="flex items-center justify-center">
                        Завершено
                        {sortKey === 'tasksCompleted' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer text-center" 
                      onClick={() => toggleSort('tasksInProgress')}
                    >
                      <div className="flex items-center justify-center">
                        В работе
                        {sortKey === 'tasksInProgress' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer text-center" 
                      onClick={() => toggleSort('tasksOverdue')}
                    >
                      <div className="flex items-center justify-center">
                        Просрочено
                        {sortKey === 'tasksOverdue' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Прогресс</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrgStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Организации не найдены
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedOrgStats.map((org) => (
                      <React.Fragment key={org.id}>
                        <TableRow 
                          className={`hover:bg-muted/50 ${org.tasksTotal > 0 ? 'cursor-pointer' : ''}`}
                          onClick={() => org.tasksTotal > 0 && toggleOrgExpanded(org.id)}
                        >
                          <TableCell className="font-medium">
                            {org.name}
                          </TableCell>
                          <TableCell className="text-center">{org.tasksTotal}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-status-ontime">{org.tasksCompleted}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-status-delayed">{org.tasksInProgress}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-status-overdue">{org.tasksOverdue}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={org.completionPercent} className="h-2" />
                              <span className="text-xs font-medium">{org.completionPercent}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {org.tasksTotal > 0 && expandedOrgs[org.id] && (
                          <TableRow>
                            <TableCell colSpan={6} className="p-0 border-t-0">
                              <div className="pl-6 pr-4 py-2 bg-muted/20">
                                <h4 className="text-sm font-semibold mb-2">Список задач</h4>
                                <div className="space-y-3">
                                  {org.tasks.map(task => (
                                    <div 
                                      key={task.id} 
                                      className="bg-card border rounded-md p-3 relative hover:bg-muted/30 transition-colors"
                                    >
                                      <div className="flex justify-between mb-2">
                                        <h5 className="font-medium">{task.title}</h5>
                                        <div className="flex items-center space-x-2">
                                          {getStatusBadge(task, org.id)}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => handleViewTaskDetails(task, e)}
                                            title="Просмотреть детали"
                                          >
                                            <Eye size={14} />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => handleEditTask(task, e)}
                                            title="Редактировать задачу"
                                          >
                                            <Pencil size={14} />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground mb-2">
                                        {task.description.length > 100 
                                          ? `${task.description.substring(0, 100)}...` 
                                          : task.description}
                                      </div>
                                      <div className="flex justify-between text-xs">
                                        <div>
                                          Срок: {format(new Date(task.startDate), 'dd.MM.yyyy', { locale: ru })} - 
                                          {format(new Date(task.endDate), 'dd.MM.yyyy', { locale: ru })}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Progress value={task.completionPercentage} className="h-1.5 w-20" />
                                          <span>{task.completionPercentage}%</span>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-2">
                                        Постановщик: {task.assignedBy || "Не указан"}
                                      </div>
                                      
                                      <div className="mt-4 pt-2 border-t">
                                        <div className="flex justify-between items-center">
                                          <h6 className="text-xs font-semibold">Статус выполнения в организации:</h6>
                                          {editingTaskId === task.id && editingMoId === org.id ? (
                                            <div className="flex space-x-1">
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-5 w-5" 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleSaveStatus();
                                                }}
                                                disabled={isLoading}
                                              >
                                                <Check size={12} />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-5 w-5"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  resetEditingState();
                                                }}
                                                disabled={isLoading}
                                              >
                                                <X size={12} />
                                              </Button>
                                            </div>
                                          ) : (
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              className="h-6 px-2 text-xs"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const moStatus = task.moStatuses?.find(status => status.moId === org.id);
                                                if (task.id) {
                                                  handleEditStatus(
                                                    task.id, 
                                                    org.id, 
                                                    moStatus ? moStatus.completionPercentage : task.completionPercentage,
                                                    moStatus?.comment || ''
                                                  );
                                                }
                                              }}
                                              disabled={isLoading}
                                            >
                                              Изменить
                                            </Button>
                                          )}
                                        </div>
                                        
                                        {editingTaskId === task.id && editingMoId === org.id ? (
                                          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center space-x-2">
                                              <span className="text-xs w-24">Процент выполнения:</span>
                                              <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={editingPercentage}
                                                onChange={(e) => setEditingPercentage(e.target.value)}
                                                className="h-7 text-xs py-0"
                                              />
                                            </div>
                                            <div>
                                              <span className="text-xs">Комментарий:</span>
                                              <Input
                                                value={editingComment}
                                                onChange={(e) => setEditingComment(e.target.value)}
                                                className="mt-1 text-xs"
                                                placeholder="Комментарий к статусу"
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            {task.moStatuses && task.moStatuses
                                              .filter(status => status.moId === org.id)
                                              .map(status => (
                                                <div key={`${task.id}-${status.moId}`} className="mt-1">
                                                  <div className="flex items-center space-x-2">
                                                    <Progress value={status.completionPercentage} className="h-1.5 w-20" />
                                                    <span className="text-xs">{status.completionPercentage}%</span>
                                                  </div>
                                                  {status.comment && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                      {status.comment}
                                                    </div>
                                                  )}
                                                  {status.lastUpdated && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                      Обновлено: {format(
                                                        parseISO(status.lastUpdated), 
                                                        'dd.MM.yyyy HH:mm', 
                                                        { locale: ru }
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            {(!task.moStatuses || !task.moStatuses.some(status => status.moId === org.id)) && (
                                              <div className="mt-1">
                                                <div className="flex items-center space-x-2">
                                                  <Progress value={task.completionPercentage} className="h-1.5 w-20" />
                                                  <span className="text-xs">{task.completionPercentage}%</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  Используется общий процент выполнения задачи
                                                </div>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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

export default OrganizationTaskList;
