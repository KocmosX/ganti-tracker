
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, eachDayOfInterval, isWithinInterval, differenceInDays, isBefore } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task, MedicalOrganization } from '@/lib/db';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GanttChartProps {
  tasks: Task[];
  organizations: MedicalOrganization[];
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, organizations }) => {
  const [selectedMo, setSelectedMo] = useState<string>('');
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [dateRange, setDateRange] = useState<Date[]>([]);
  const [organizationNames, setOrganizationNames] = useState<Record<number, string>>({});

  // Get all unique dates from tasks to create chart timeline
  useEffect(() => {
    if (tasks.length === 0) return;

    // Create a mapping of organization IDs to names
    const orgMap: Record<number, string> = {};
    organizations.forEach(org => {
      orgMap[org.id] = org.name;
    });
    setOrganizationNames(orgMap);

    // Filter tasks based on selected organization
    let filtered = [...tasks];
    if (selectedMo) {
      filtered = filtered.filter(task => task.moId === parseInt(selectedMo));
    }
    setFilteredTasks(filtered);

    // Find the min and max dates
    let minDate = new Date();
    let maxDate = new Date();

    if (filtered.length > 0) {
      minDate = filtered.reduce((min, task) => {
        const taskStart = new Date(task.startDate);
        return taskStart < min ? taskStart : min;
      }, new Date(filtered[0].startDate));

      maxDate = filtered.reduce((max, task) => {
        const taskEnd = new Date(task.endDate);
        return taskEnd > max ? taskEnd : max;
      }, new Date(filtered[0].endDate));
    }

    // Generate all dates in range
    const allDates = eachDayOfInterval({ start: minDate, end: maxDate });
    setDateRange(allDates);
  }, [tasks, selectedMo, organizations]);

  const calculateTaskPosition = (task: Task, index: number) => {
    if (dateRange.length === 0) return { left: 0, width: 0 };

    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    const today = new Date();
    
    // Find position as percentage of chart width
    const chartStartDate = dateRange[0];
    const chartEndDate = dateRange[dateRange.length - 1];
    const totalDays = differenceInDays(chartEndDate, chartStartDate) + 1;
    
    const startOffset = Math.max(0, differenceInDays(taskStart, chartStartDate));
    const taskDuration = differenceInDays(taskEnd, taskStart) + 1;
    
    const left = (startOffset / totalDays) * 100;
    const width = (taskDuration / totalDays) * 100;

    // Determine task status for coloring
    let statusClass = 'gantt-task-ontime';
    
    if (task.completionPercentage === 100) {
      statusClass = 'gantt-task-ontime';
    } else if (isBefore(taskEnd, today)) {
      statusClass = 'gantt-task-overdue';
    } else if (differenceInDays(taskEnd, today) <= 3) {
      statusClass = 'gantt-task-delayed';
    }

    return { left, width, statusClass };
  };

  const getOverdueLabel = (task: Task) => {
    const today = new Date();
    const endDate = new Date(task.endDate);
    
    if (task.completionPercentage < 100 && isBefore(endDate, today)) {
      const overdueDays = Math.abs(differenceInDays(today, endDate));
      return `Просрочено на ${overdueDays} ${overdueDays === 1 ? 'день' : overdueDays < 5 ? 'дня' : 'дней'}`;
    }
    return null;
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Диаграмма Ганта</CardTitle>
        <div className="w-64">
          <Select
            value={selectedMo}
            onValueChange={setSelectedMo}
          >
            <SelectTrigger>
              <SelectValue placeholder="Фильтр по организации" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все организации</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {dateRange.length === 0 || filteredTasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Нет данных для отображения
          </div>
        ) : (
          <div className="gantt-container">
            <div className="grid grid-cols-[200px_1fr] border rounded-md">
              <div className="border-r bg-muted/30 p-2 font-medium">Задачи</div>
              <ScrollArea className="h-10 overflow-x-auto">
                <div className="flex min-w-full">
                  {dateRange.map((date, i) => (
                    <div 
                      key={i} 
                      className="flex-1 min-w-16 p-2 text-center text-xs border-r last:border-r-0"
                    >
                      {format(date, 'dd.MM', { locale: ru })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {filteredTasks.map((task, index) => {
                const { left, width, statusClass } = calculateTaskPosition(task, index);
                const overdueLabel = getOverdueLabel(task);
                
                return (
                  <React.Fragment key={task.id}>
                    <div className="border-t border-r p-2 truncate" title={task.title}>
                      {task.title}
                    </div>
                    <div className="border-t relative h-10">
                      <ScrollArea className="h-full overflow-x-auto">
                        <div className="flex min-w-full h-full relative">
                          <div 
                            className={`gantt-task ${statusClass} absolute`}
                            style={{ 
                              left: `${left}%`, 
                              width: `${width}%`,
                              maxWidth: '100%'
                            }}
                            title={`${task.title} (${format(new Date(task.startDate), 'dd.MM.yyyy', { locale: ru })} - ${format(new Date(task.endDate), 'dd.MM.yyyy', { locale: ru })})`}
                          >
                            {task.completionPercentage}%
                            {overdueLabel && (
                              <div className="absolute -bottom-5 left-0 text-xs text-status-overdue whitespace-nowrap">
                                {overdueLabel}
                              </div>
                            )}
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            
            <div className="mt-4 flex items-center space-x-4 justify-end">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-status-ontime rounded-full"></div>
                <span className="text-xs">В срок</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-status-delayed rounded-full"></div>
                <span className="text-xs">Приближается срок</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-status-overdue rounded-full"></div>
                <span className="text-xs">Просрочено</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GanttChart;
