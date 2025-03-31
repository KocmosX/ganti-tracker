
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MedicalOrganization, TaskStatus, createTask, updateTask } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: MedicalOrganization[];
  taskToEdit?: any;
  onTaskAdded?: () => void;
  allowMultipleOrganizations?: boolean;
}

// Предопределенный список возможных постановщиков задач
const TASK_ASSIGNERS = [
  'Администратор',
  'Руководитель',
  'Менеджер',
  'Координатор',
  'Аналитик',
  'Главврач',
];

const TaskForm: React.FC<TaskFormProps> = ({ 
  isOpen, 
  onClose, 
  organizations,
  taskToEdit,
  onTaskAdded,
  allowMultipleOrganizations = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moId, setMoId] = useState<string>('');
  const [selectedMoIds, setSelectedMoIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.NotStarted);
  const [result, setResult] = useState('');
  const [comment, setComment] = useState('');
  const [assignedBy, setAssignedBy] = useState<string>(user?.username || '');
  const [customAssigner, setCustomAssigner] = useState<string>('');
  const [isCustomAssigner, setIsCustomAssigner] = useState<boolean>(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description);
      setMoId(taskToEdit.moId.toString());
      setStartDate(taskToEdit.startDate ? new Date(taskToEdit.startDate) : undefined);
      setEndDate(taskToEdit.endDate ? new Date(taskToEdit.endDate) : undefined);
      setCompletionPercentage(taskToEdit.completionPercentage || 0);
      setStatus(taskToEdit.status || TaskStatus.NotStarted);
      setResult(taskToEdit.result || '');
      setComment(taskToEdit.comment || '');
      setAssignedBy(taskToEdit.assignedBy || user?.username || '');
      
      // Check if it's a custom assigner
      const isCustom = !TASK_ASSIGNERS.includes(taskToEdit.assignedBy);
      setIsCustomAssigner(isCustom);
      if (isCustom) {
        setCustomAssigner(taskToEdit.assignedBy || '');
      }
      
      // Initialize selected MO IDs if task has moStatuses
      if (taskToEdit.moStatuses && taskToEdit.moStatuses.length > 0) {
        const ids = taskToEdit.moStatuses.map((status: any) => status.moId.toString());
        setSelectedMoIds(ids);
      } else {
        setSelectedMoIds([taskToEdit.moId.toString()]);
      }
    } else {
      resetForm();
    }
  }, [taskToEdit, isOpen, user]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setMoId('');
    setSelectedMoIds([]);
    setStartDate(new Date());
    setEndDate(new Date());
    setCompletionPercentage(0);
    setStatus(TaskStatus.NotStarted);
    setResult('');
    setComment('');
    setAssignedBy(user?.username || '');
    setCustomAssigner('');
    setIsCustomAssigner(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || (!moId && selectedMoIds.length === 0)) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    const finalAssignedBy = isCustomAssigner ? customAssigner : assignedBy;

    try {
      const baseTaskData = {
        title,
        description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        assignedBy: finalAssignedBy,
        completionPercentage,
        status,
        result,
        comment,
      };

      if (allowMultipleOrganizations && selectedMoIds.length > 0) {
        // For multiple MOs
        const primaryMoId = parseInt(selectedMoIds[0]);
        const currentTime = new Date().toISOString();
        
        const taskData = {
          ...baseTaskData,
          moId: primaryMoId,
          moStatuses: selectedMoIds.map(id => ({
            moId: parseInt(id),
            completionPercentage: 0,
            comment: '',
            lastUpdated: currentTime
          }))
        };

        if (taskToEdit) {
          await updateTask(taskToEdit.id, taskData);
          toast({
            title: "Задача обновлена",
            description: "Задача успешно обновлена",
          });
        } else {
          await createTask(taskData);
          toast({
            title: "Задача создана",
            description: "Задача успешно создана",
          });
        }
      } else {
        // For single MO
        const taskData = {
          ...baseTaskData,
          moId: parseInt(moId),
        };

        if (taskToEdit) {
          await updateTask(taskToEdit.id, taskData);
          toast({
            title: "Задача обновлена",
            description: "Задача успешно обновлена",
          });
        } else {
          await createTask(taskData);
          toast({
            title: "Задача создана",
            description: "Задача успешно создана",
          });
        }
      }

      if (onTaskAdded) {
        onTaskAdded();
      }
      
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при сохранении задачи",
        variant: "destructive",
      });
    }
  };

  const toggleMoSelection = (moId: string) => {
    setSelectedMoIds(prev => {
      if (prev.includes(moId)) {
        return prev.filter(id => id !== moId);
      } else {
        return [...prev, moId];
      }
    });
  };

  const selectAllMos = () => {
    const allMoIds = organizations.map(org => org.id?.toString() || '').filter(id => id !== '');
    setSelectedMoIds(allMoIds);
  };

  const deselectAllMos = () => {
    setSelectedMoIds([]);
  };

  const handleAssignerChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomAssigner(true);
    } else {
      setIsCustomAssigner(false);
      setAssignedBy(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{taskToEdit ? 'Редактировать задачу' : 'Создать новую задачу'}</DialogTitle>
            <DialogDescription>
              {taskToEdit 
                ? 'Отредактируйте информацию о задаче и нажмите Сохранить' 
                : 'Заполните информацию о новой задаче и нажмите Создать'}
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
            
            {allowMultipleOrganizations ? (
              <div className="grid gap-2">
                <Label>Медицинские организации</Label>
                <div className="border p-4 rounded-md max-h-60 overflow-y-auto">
                  <div className="flex justify-between mb-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={selectAllMos}
                    >
                      Выбрать все
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={deselectAllMos}
                    >
                      Снять выбор
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {organizations.map((org) => (
                      <div key={org.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`mo-${org.id}`} 
                          checked={selectedMoIds.includes(org.id?.toString() || '')}
                          onCheckedChange={() => toggleMoSelection(org.id?.toString() || '')}
                        />
                        <Label 
                          htmlFor={`mo-${org.id}`}
                          className="cursor-pointer"
                        >
                          {org.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedMoIds.length === 0 && (
                  <p className="text-sm text-destructive">Выберите хотя бы одну организацию</p>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="mo">Медицинская организация</Label>
                <Select
                  value={moId}
                  onValueChange={setMoId}
                  required
                >
                  <SelectTrigger id="mo">
                    <SelectValue placeholder="Выберите организацию" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem 
                        key={org.id} 
                        value={org.id !== undefined ? org.id.toString() : 'unknown'} // Ensure we never pass empty string
                      >
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="description">Описание задачи</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="assignedBy">Постановщик задачи</Label>
              <Select
                value={isCustomAssigner ? 'custom' : assignedBy}
                onValueChange={handleAssignerChange}
              >
                <SelectTrigger id="assignedBy">
                  <SelectValue placeholder="Выберите постановщика" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_ASSIGNERS.map((assigner) => (
                    <SelectItem key={assigner} value={assigner}>
                      {assigner}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Другое (ввести вручную)</SelectItem>
                </SelectContent>
              </Select>
              
              {isCustomAssigner && (
                <div className="mt-2">
                  <Input
                    placeholder="Введите имя постановщика"
                    value={customAssigner}
                    onChange={(e) => setCustomAssigner(e.target.value)}
                    required={isCustomAssigner}
                  />
                </div>
              )}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">
              {taskToEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskForm;
