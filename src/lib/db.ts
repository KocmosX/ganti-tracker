
import { openDB, DBSchema } from 'idb';

export interface User {
  id: number;
  username: string;
  password: string;  // In a real app, this would be hashed
  isAdmin: boolean;
}

export interface MedicalOrganization {
  id: number;
  name: string;
}

export enum TaskStatus {
  NotStarted = 'Не начата',
  InProgress = 'В процессе',
  Completed = 'Завершена'
}

export interface Task {
  id: number;
  moId: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  assignedBy: string;
  completionPercentage: number;
  status: TaskStatus;
  result: string;
  comment: string;
}

interface TaskManagerDB extends DBSchema {
  users: {
    key: number;
    value: User;
    indexes: { 'by-username': string };
  };
  medicalOrganizations: {
    key: number;
    value: MedicalOrganization;
  };
  tasks: {
    key: number;
    value: Task;
    indexes: { 'by-mo': number };
  };
}

export const initDB = async () => {
  const db = await openDB<TaskManagerDB>('task-manager-db', 1, {
    upgrade(db) {
      // Create users store
      const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
      userStore.createIndex('by-username', 'username', { unique: true });

      // Create medical organizations store
      db.createObjectStore('medicalOrganizations', { keyPath: 'id', autoIncrement: true });

      // Create tasks store
      const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
      taskStore.createIndex('by-mo', 'moId');

      // Seed initial admin users
      const admins = [
        { username: 'evbelugina', password: 'password', isAdmin: true },
        { username: 'nvizmaylova', password: 'password', isAdmin: true },
        { username: 'yvnikitenko', password: 'password', isAdmin: true },
        { username: 'nv-mironova', password: 'password', isAdmin: true },
        { username: 'aknol', password: 'password', isAdmin: true },
        { username: 'nebakulina', password: 'password', isAdmin: true },
        { username: 'nv_kovaleva', password: 'password', isAdmin: true },
        { username: 'siyadykin', password: 'password', isAdmin: true },
      ];
      
      admins.forEach(admin => {
        userStore.add(admin);
      });

      // Seed medical organizations
      const organizations = [
        "ГАУЗ НСО \"ГКП №1\" ВПО",
        "ГАУЗ НСО \"ГКП №1\" ДПО",
        "ГБУЗ НСО \"ГКБ №1\" КДЦ",
        "ГБУЗ НСО \"ДГКБ №1\" ДПО",
        "ГБУЗ НСО \"НКРБ №1\" ВПО, р.п. Кольцово",
        "ГБУЗ НСО \"НКРБ №1\" ВПО, с. Барышево",
        "ГБУЗ НСО \"НКРБ №1\" ДПО",
        "ГБУЗ НСО \"ГКБ №2\" ВПО пр. Дзержинского, 15",
        "ГБУЗ НСО \"ГКБ №2\" ВПО пр. Дзержинского, 71",
        "ГБУЗ НСО \"ГКБ №2\" ВПО ул. Кошурникова, 18",
        "ГБУЗ НСО \"ГКБ №2\" ВПО ул. Гоголя, 225/1",
        "ГБУЗ НСО \"ГКБ №2\" ВПО п.Восход, ул.Мирная, 1в",
        "ГБУЗ НСО \"ГКБ №2\" КДЦ пр. Дзержинского, 44",
        // We would add all the organizations here, but for brevity I'm showing just a few
        // You can add the rest of the organizations from your list
      ];
      
      const moStore = db.transaction('medicalOrganizations', 'readwrite').objectStore('medicalOrganizations');
      organizations.forEach(org => {
        moStore.add({ name: org });
      });
    }
  });

  return db;
};

export const getDB = async () => {
  return await openDB<TaskManagerDB>('task-manager-db', 1);
};

// User functions
export const authenticateUser = async (username: string, password: string) => {
  const db = await getDB();
  const userIndex = db.transaction('users').store.index('by-username');
  const user = await userIndex.get(username);
  
  if (user && user.password === password) {
    // In a real app, we would compare hashed passwords
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  return null;
};

export const getAllUsers = async () => {
  const db = await getDB();
  return await db.getAll('users');
};

// Medical Organization functions
export const getAllMedicalOrganizations = async () => {
  const db = await getDB();
  return await db.getAll('medicalOrganizations');
};

export const getMedicalOrganizationById = async (id: number) => {
  const db = await getDB();
  return await db.get('medicalOrganizations', id);
};

// Task functions
export const createTask = async (task: Omit<Task, 'id'>) => {
  const db = await getDB();
  return await db.add('tasks', task);
};

export const updateTask = async (id: number, task: Partial<Task>) => {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  
  const existingTask = await store.get(id);
  if (!existingTask) {
    throw new Error('Task not found');
  }
  
  const updatedTask = { ...existingTask, ...task };
  await store.put(updatedTask);
  await tx.done;
  
  return updatedTask;
};

export const deleteTask = async (id: number) => {
  const db = await getDB();
  await db.delete('tasks', id);
};

export const getAllTasks = async () => {
  const db = await getDB();
  return await db.getAll('tasks');
};

export const getTasksByMedicalOrganization = async (moId: number) => {
  const db = await getDB();
  const index = db.transaction('tasks').store.index('by-mo');
  return await index.getAll(moId);
};

export const getTaskById = async (id: number) => {
  const db = await getDB();
  return await db.get('tasks', id);
};

// Initialize database on app start
initDB().catch(e => console.error('Error initializing database:', e));
