
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, MedicalOrganization, TaskMoStatus, updateTaskMoStatus, getMedicalOrganizationById } from '@/lib/db';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Save, X, Check } from 'lucide-react';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  organizations: MedicalOrganization[];
  onTaskUpdated: () => void;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  task,
  organizations,
  onTaskUpdated,
}) => {
  const { toast } = useToast();
  const [editingMoId, setEditingMoId] = useState<number | null>(null);
  const [editingPercentage, setEditingPercentage] = useState<string>('');
  const [editingComment, setEditingComment] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [organizationNames, setOrganizationNames] = useState<Record<number, string>>({});

  useEffect(() => {
    // Создаем маппинг ID организаций к их названиям для быстрого доступа
    const orgMap: Record<number, string> = {};
    organizations.forEach(org => {
      if (org.id !== undefined) {
        orgMap[org.id] = org.name;
      }
    });
    setOrganizationNames(orgMap);
  }, [organizations]);

  const resetEditingState = () => {
    setEditingMoId(null);
    setEditingPercentage('');
    setEditingComment('');
  };

  const handleEdit = (moStatus: TaskMoStatus) => {
    setEditingMoId(moStatus.moId);
    setEditingPercentage(moStatus.completionPercentage.toString());
    setEditingComment(moStatus.comment || '');
  };

  const handleSave = async () => {
    if (!task || editingMoId === null) return;

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

      await updateTaskMoStatus(task.id!, editingMoId, {
        completionPercentage: percentage,
        comment: editingComment
      });

      toast({
        title: "Статус обновлен",
        description: "Статус выполнения задачи успешно обновлен",
      });

      onTaskUpdated();
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

  const getFilteredMoStatuses = () => {
    if (!task || !task.moStatuses) return [];

    return task.moStatuses.filter(moStatus => {
      const orgName = organizationNames[moStatus.moId] || '';
      return !searchTerm || orgName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  if (!task) return null;

  const filteredMoStatuses = getFilteredMoStatuses();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            <div className="mt-2 space-y-2">
              <div>
                <span className="font-medium">Описание:</span> {task.description}
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="font-medium">Дата начала:</span> {format(new Date(task.startDate), 'dd.MM.yyyy', { locale: ru })}
                </div>
                <div>
                  <span className="font-medium">Дата окончания:</span> {format(new Date(task.endDate), 'dd.MM.yyyy', { locale: ru })}
                </div>
              </div>
              <div>
                <span className="font-medium">Постановщик:</span> {task.assignedBy}
              </div>
              <div>
                <span className="font-medium">Общий прогресс:</span>
                <div className="flex items-center space-x-2 mt-1">
                  <Progress value={task.completionPercentage} className="h-2" />
                  <span className="text-xs font-medium">{task.completionPercentage}%</span>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <div className="mb-4">
            <Input
              placeholder="Поиск по организациям..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Организация</TableHead>
                  <TableHead>Процент выполнения</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Комментарий</TableHead>
                  <TableHead>Последнее обновление</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMoStatuses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Медицинские организации не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMoStatuses.map((moStatus) => (
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
                          />
                        ) : (
                          <div className="max-w-[200px] overflow-hidden text-ellipsis">
                            {moStatus.comment || "—"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {moStatus.lastUpdated 
                          ? format(new Date(moStatus.lastUpdated), 'dd.MM.yyyy HH:mm', { locale: ru })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {editingMoId === moStatus.moId ? (
                          <div className="flex space-x-1">
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={handleSave}
                            >
                              <Save size={16} />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={resetEditingState}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(moStatus)}
                          >
                            Редактировать
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;
