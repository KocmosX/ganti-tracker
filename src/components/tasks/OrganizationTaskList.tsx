
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
  getAllTasks 
} from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Search, 
  FilterX, 
  ArrowUpDown, 
  BarChart4 
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [orgTaskStats, setOrgTaskStats] = useState<OrgTaskStats[]>([]);
  const [sortedOrgStats, setSortedOrgStats] = useState<OrgTaskStats[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedOrgs, setExpandedOrgs] = useState<Record<number, boolean>>({});
  const [showOnlyWithTasks, setShowOnlyWithTasks] = useState(false);

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
  }, [orgTaskStats, sortKey, sortDirection, searchTerm, filterType, showOnlyWithTasks]);

  const loadTasks = async () => {
    try {
      const allTasks = await getAllTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const calculateOrgTaskStats = () => {
    const stats: OrgTaskStats[] = [];
    const today = new Date();

    // Создаем статистику для каждой организации
    organizations.forEach(org => {
      if (org.id === undefined) return;

      // Фильтруем задачи для данной организации
      const orgTasks = tasks.filter(task => task.moId === org.id);
      let tasksCompleted = 0;
      let tasksInProgress = 0;
      let tasksOverdue = 0;

      orgTasks.forEach(task => {
        if (task.completionPercentage === 100) {
          tasksCompleted++;
        } else {
          tasksInProgress++;
          
          const endDate = new Date(task.endDate);
          if (endDate < today) {
            tasksOverdue++;
          }
        }
      });

      // Рассчитываем процент завершения всех задач организации
      const completionPercent = orgTasks.length > 0
        ? Math.round(orgTasks.reduce((acc, task) => acc + task.completionPercentage, 0) / orgTasks.length)
        : 0;

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

    // Поиск по названию организации
    if (searchTerm) {
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Фильтрация по типу организации
    if (filterType !== 'all') {
      filtered = filtered.filter(org => {
        if (filterType === 'ВПО') return org.name.includes('ВПО');
        if (filterType === 'ДПО') return org.name.includes('ДПО');
        if (filterType === 'КС') return org.name.includes('КС');
        if (filterType === 'КДЦ') return org.name.includes('КДЦ');
        return false;
      });
    }

    // Показывать только организации с задачами
    if (showOnlyWithTasks) {
      filtered = filtered.filter(org => org.tasksTotal > 0);
    }

    // Сортировка
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
    setShowOnlyWithTasks(false);
  };

  const getStatusBadge = (task: Task) => {
    const daysLeft = differenceInDays(new Date(task.endDate), new Date());
    
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

  const toggleOrgExpanded = (orgId: number) => {
    setExpandedOrgs(prev => ({
      ...prev,
      [orgId]: !prev[orgId]
    }));
  };

  return (
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
        <div className="flex flex-col md:flex-row gap-4 mb-4">
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
          <div className="flex gap-2">
            <Select
              value={filterType}
              onValueChange={setFilterType}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Тип организации" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="ВПО">ВПО</SelectItem>
                <SelectItem value="ДПО">ДПО</SelectItem>
                <SelectItem value="КС">КС</SelectItem>
                <SelectItem value="КДЦ">КДЦ</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetFilters}>
              <FilterX className="mr-2 h-4 w-4" />
              Сбросить
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
                                  className="bg-card border rounded-md p-3 cursor-pointer hover:bg-muted/50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskEdit(task);
                                  }}
                                >
                                  <div className="flex justify-between mb-2">
                                    <h5 className="font-medium">{task.title}</h5>
                                    {getStatusBadge(task)}
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
      </CardContent>
    </Card>
  );
};

export default OrganizationTaskList;
