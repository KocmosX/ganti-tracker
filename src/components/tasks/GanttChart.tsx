
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, differenceInDays, addDays, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task, MedicalOrganization } from '@/lib/db';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FilterX } from 'lucide-react';
import { TooltipProps } from 'recharts';

interface GanttChartProps {
  tasks: Task[];
  organizations: MedicalOrganization[];
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, organizations }) => {
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedMo, setSelectedMo] = useState<string>('all');
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    filterTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMo, tasks]);

  useEffect(() => {
    prepareChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTasks]);

  const filterTasks = () => {
    let filtered = [...tasks];

    if (selectedMo && selectedMo !== 'all') {
      filtered = filtered.filter(task => task.moId === parseInt(selectedMo));
    }

    setFilteredTasks(filtered);
  };

  const prepareChartData = () => {
    const data: any[] = [];
    
    filteredTasks.forEach(task => {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      
      // Проверяем валидность дат
      if (!isValid(startDate) || !isValid(endDate)) {
        console.error('Invalid date for task:', task);
        return; // Пропускаем задачу с некорректными датами
      }
      
      const duration = differenceInDays(endDate, startDate) + 1; // Include both start and end days
      
      // Get organization name
      const orgName = organizations.find(org => org.id === task.moId)?.name || 'Неизвестная организация';
      
      data.push({
        name: task.title,
        organization: orgName,
        start: startDate,
        end: endDate,
        duration,
        completed: task.completionPercentage,
        // Добавляем строковые представления дат для безопасного использования в тултипе
        startString: task.startDate,
        endString: task.endDate
      });
    });
    
    // Sort by start date
    data.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    setChartData(data);
  };

  const resetFilters = () => {
    setSelectedMo('all');
  };

  const getMinMaxDates = () => {
    if (chartData.length === 0) return { min: new Date(), max: addDays(new Date(), 30) };
    
    const minDate = chartData.reduce((min, item) => 
      item.start < min ? item.start : min, chartData[0].start);
      
    const maxDate = chartData.reduce((max, item) => 
      item.end > max ? item.end : max, chartData[0].end);
      
    return { min: minDate, max: maxDate };
  };

  const { min: minDate, max: maxDate } = getMinMaxDates();
  const totalDays = differenceInDays(maxDate, minDate) + 1;

  // Format date for x-axis
  const formatXAxis = (date: string) => {
    const parsedDate = new Date(date);
    return isValid(parsedDate) ? format(parsedDate, 'dd.MM', { locale: ru }) : '';
  };

  // Custom tooltip
  const CustomTooltip: React.FC<TooltipProps<any, any>> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // Безопасное форматирование дат
      const formatSafeDate = (dateString: string) => {
        try {
          const date = new Date(dateString);
          return isValid(date) ? format(date, 'dd.MM.yyyy', { locale: ru }) : 'Некорректная дата';
        } catch (error) {
          console.error('Error formatting date:', error);
          return 'Некорректная дата';
        }
      };
      
      return (
        <div className="bg-popover p-2 rounded shadow-md border border-border">
          <p className="font-bold">{data.name}</p>
          <p>{data.organization}</p>
          <p>Начало: {formatSafeDate(data.startString)}</p>
          <p>Конец: {formatSafeDate(data.endString)}</p>
          <p>Прогресс: {data.completed}%</p>
        </div>
      );
    }
    return null;
  };

  // Prepare data for chart
  const barChartData = chartData.map((task, index) => {
    const startOffset = differenceInDays(task.start, minDate);
    const progressWidth = (task.duration * task.completed) / 100;
    
    const dataPoint: any = {
      name: task.name,
      fullName: task.name,
      index,
      // Добавляем строковые представления дат для тултипа
      startString: task.startString,
      endString: task.endString
    };
    
    // Empty space before bar
    dataPoint[`padding${index}`] = startOffset;
    
    // Completed portion of task
    dataPoint[`completed${index}`] = progressWidth;
    
    // Remaining portion of task
    dataPoint[`remaining${index}`] = task.duration - progressWidth;
    
    return dataPoint;
  });

  // Generate bar definitions for chart
  const generateBars = () => {
    const bars: JSX.Element[] = [];
    
    chartData.forEach((_, index) => {
      // Padding bar (invisible)
      bars.push(
        <Bar 
          key={`padding${index}`} 
          dataKey={`padding${index}`} 
          stackId={`stack${index}`} 
          fill="transparent" 
        />
      );
      
      // Completed portion (green)
      bars.push(
        <Bar 
          key={`completed${index}`} 
          dataKey={`completed${index}`} 
          stackId={`stack${index}`} 
          fill="#4ade80" 
        />
      );
      
      // Remaining portion (light blue)
      bars.push(
        <Bar 
          key={`remaining${index}`} 
          dataKey={`remaining${index}`} 
          stackId={`stack${index}`} 
          fill="#93c5fd" 
        />
      );
    });
    
    return bars;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Диаграмма Ганта</CardTitle>
        <div className="flex space-x-2">
          <div className="w-64">
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
                    value={org.id !== undefined ? org.id.toString() : 'unknown'}
                  >
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
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Нет задач для отображения на диаграмме
          </div>
        ) : (
          <div className="h-[500px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={barChartData}
                margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  domain={[0, totalDays]} 
                  tickFormatter={(value) => {
                    try {
                      const date = addDays(minDate, value);
                      return isValid(date) ? formatXAxis(format(date, 'yyyy-MM-dd')) : '';
                    } catch (error) {
                      console.error('Error formatting XAxis:', error);
                      return '';
                    }
                  }}
                />
                <YAxis 
                  type="category" 
                  dataKey="fullName"
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {generateBars()}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GanttChart;
