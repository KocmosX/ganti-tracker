
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  MedicalOrganization, 
  TaskStatus, 
  createBulkTasks 
} from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface BulkTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: MedicalOrganization[];
  onTasksAdded?: () => void;
}

const BulkTaskForm: React.FC<BulkTaskFormProps> = ({ 
  isOpen, 
  onClose, 
  organizations,
  onTasksAdded
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Основные данные задачи
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.NotStarted);
  const [result, setResult] = useState('');
  const [comment, setComment] = useState('');
  
  // Выбор организаций
  const [selectedOrgIds, setSelectedOrgIds] = useState<number[]>([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Фильтрация организаций по поисковому запросу
  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Выбор/отмена выбора всех организаций
  const toggleSelectAll = () => {
    if (selectedOrgIds.length === organizations.length) {
      setSelectedOrgIds([]);
    } else {
      setSelectedOrgIds(organizations.map(org => org.id!).filter(id => id !== undefined));
    }
  };
  
  // Выбор/отмена выбора одной организации
  const toggleOrg = (orgId: number) => {
    if (selectedOrgIds.includes(orgId)) {
      setSelectedOrgIds(selectedOrgIds.filter(id => id !== orgId));
    } else {
      setSelectedOrgIds([...selectedOrgIds, orgId]);
    }
  };
  
  // Сброс формы
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate(new Date());
    setEndDate(new Date());
    setCompletionPercentage(0);
    setStatus(TaskStatus.NotStarted);
    setResult('');
    setComment('');
    setSelectedOrgIds([]);
  };
  
  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || selectedOrgIds.length === 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все обязательные поля и выберите хотя бы одну организацию",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const taskTemplate = {
        title,
        description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        assignedBy: user?.username || 'Гость',
        completionPercentage,
        status,
        result,
        comment,
      };
      
      await createBulkTasks(taskTemplate, selectedOrgIds);
      
      toast({
        title: "Задачи созданы",
        description: `Успешно создано ${selectedOrgIds.length} задач`,
      });
      
      if (onTasksAdded) {
        onTasksAdded();
      }
      
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating bulk tasks:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при создании задач",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Группировка организаций по типу
  const groupOrganizations = () => {
    const groups: Record<string, MedicalOrganization[]> = {};
    
    organizations.forEach(org => {
      const name = org.name;
      let groupKey = 'Другие';
      
      if (name.includes('ВПО')) groupKey = 'ВПО';
      else if (name.includes('ДПО')) groupKey = 'ДПО';
      else if (name.includes('КС')) groupKey = 'КС';
      else if (name.includes('КДЦ')) groupKey = 'КДЦ';
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(org);
    });
    
    return groups;
  };
  
  const orgGroups = groupOrganizations();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Массовое создание задач</DialogTitle>
            <DialogDescription>
              Создание одинаковой задачи для нескольких медицинских организаций
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Название задачи</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="organizations">Выбор медицинских организаций ({selectedOrgIds.length} выбрано)</Label>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="selectAll" 
                    checked={selectedOrgIds.length === organizations.length} 
                    onCheckedChange={toggleSelectAll} 
                  />
                  <Label htmlFor="selectAll" className="cursor-pointer">Выбрать все</Label>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedOrgIds([])}
                >
                  Очистить выбор
                </Button>
              </div>
              
              <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isSelectOpen}
                    className="justify-between h-auto min-h-10 py-2"
                  >
                    {selectedOrgIds.length > 0
                      ? `Выбрано ${selectedOrgIds.length} организаций`
                      : "Выберите организации"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[500px] max-h-[500px] overflow-y-auto">
                  <Command>
                    <CommandInput 
                      placeholder="Поиск организаций..." 
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandEmpty>Организации не найдены</CommandEmpty>
                    <CommandList>
                      {Object.keys(orgGroups).map(groupKey => (
                        <CommandGroup key={groupKey} heading={groupKey}>
                          {filteredOrganizations
                            .filter(org => {
                              const name = org.name;
                              if (groupKey === 'ВПО' && name.includes('ВПО')) return true;
                              if (groupKey === 'ДПО' && name.includes('ДПО')) return true;
                              if (groupKey === 'КС' && name.includes('КС')) return true;
                              if (groupKey === 'КДЦ' && name.includes('КДЦ')) return true;
                              if (groupKey === 'Другие' && 
                                !name.includes('ВПО') && 
                                !name.includes('ДПО') && 
                                !name.includes('КС') && 
                                !name.includes('КДЦ')) return true;
                              return false;
                            })
                            .map(org => (
                              <CommandItem 
                                key={org.id} 
                                value={org.id?.toString() || ''}
                                onSelect={() => toggleOrg(org.id!)}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox 
                                  checked={selectedOrgIds.includes(org.id!)} 
                                  onCheckedChange={() => toggleOrg(org.id!)}
                                />
                                <span className={selectedOrgIds.includes(org.id!) ? "font-medium" : ""}>
                                  {org.name}
                                </span>
                                {selectedOrgIds.includes(org.id!) && (
                                  <Check className="ml-auto h-4 w-4 opacity-70" />
                                )}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {selectedOrgIds.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Выбрано {selectedOrgIds.length} организаций
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Описание задачи</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Дата начала</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, "PPP", { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      locale={ru}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid gap-2">
                <Label>Дата завершения</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, "PPP", { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      locale={ru}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">Статус</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as TaskStatus)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TaskStatus.NotStarted}>{TaskStatus.NotStarted}</SelectItem>
                  <SelectItem value={TaskStatus.InProgress}>{TaskStatus.InProgress}</SelectItem>
                  <SelectItem value={TaskStatus.Completed}>{TaskStatus.Completed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="completion">Процент выполнения ({completionPercentage}%)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="completion"
                  type="range"
                  min="0"
                  max="100"
                  value={completionPercentage}
                  onChange={(e) => setCompletionPercentage(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="w-10 text-center">{completionPercentage}%</span>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="result">Результаты задачи</Label>
              <Textarea
                id="result"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="comment">Комментарий</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || selectedOrgIds.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                `Создать ${selectedOrgIds.length} задач`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkTaskForm;
