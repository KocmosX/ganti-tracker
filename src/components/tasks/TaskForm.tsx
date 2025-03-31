
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

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: MedicalOrganization[];
  taskToEdit?: any;
  onTaskAdded?: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ 
  isOpen, 
  onClose, 
  organizations,
  taskToEdit,
  onTaskAdded
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moId, setMoId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.NotStarted);
  const [result, setResult] = useState('');
  const [comment, setComment] = useState('');

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
    } else {
      resetForm();
    }
  }, [taskToEdit, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setMoId('');
    setStartDate(new Date());
    setEndDate(new Date());
    setCompletionPercentage(0);
    setStatus(TaskStatus.NotStarted);
    setResult('');
    setComment('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || !moId) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    try {
      const taskData = {
        title,
        description,
        moId: parseInt(moId),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        assignedBy: user?.username || 'Гость',
        completionPercentage,
        status,
        result,
        comment,
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
