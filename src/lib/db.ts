
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export enum TaskStatus {
  NotStarted = 'Не начата',
  InProgress = 'В процессе',
  Completed = 'Завершена'
}

export interface User {
  id?: number;
  username: string;
  password: string;
  isAdmin: boolean;
}

export interface MedicalOrganization {
  id?: number;
  name: string;
}

export interface Task {
  id?: number;
  title: string;
  description: string;
  moId: number;
  startDate: string;
  endDate: string;
  assignedBy: string;
  completionPercentage: number;
  status: TaskStatus;
  result?: string;
  comment?: string;
}

interface TaskDB extends DBSchema {
  users: {
    key: number;
    value: User;
    indexes: { 'by-username': string };
  };
  medical_organizations: {
    key: number;
    value: MedicalOrganization;
  };
  tasks: {
    key: number;
    value: Task;
    indexes: { 'by-moId': number };
  };
}

let db: IDBPDatabase<TaskDB>;

export const initDb = async () => {
  try {
    db = await openDB<TaskDB>('task-management-db', 1, {
      upgrade(database, oldVersion, newVersion, transaction) {
        // Create users store
        if (!database.objectStoreNames.contains('users')) {
          const userStore = database.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          userStore.createIndex('by-username', 'username', { unique: true });
          
          // Add admin users
          const adminUsers = [
            'evbelugina', 'nvizmaylova', 'yvnikitenko', 'nv-mironova', 
            'aknol', 'nebakulina', 'nv_kovaleva', 'siyadykin'
          ];
          
          const tx = transaction.objectStore('users');
          adminUsers.forEach(username => {
            tx.add({
              username,
              password: username, // Same as username for simplicity
              isAdmin: true
            });
          });
        }
        
        // Create medical organizations store
        if (!database.objectStoreNames.contains('medical_organizations')) {
          const moStore = database.createObjectStore('medical_organizations', { keyPath: 'id', autoIncrement: true });
          
          // Add medical organizations
          const organizations = [
            "ГАУЗ НСО \"ГКП №1\" ВПО",
            "ГАУЗ НСО \"ГКП №1\" ДПО",
            // Add all other organizations from the list
            "ГБУЗ НСО \"НОКОД\" КС"
          ];
          
          const tx = transaction.objectStore('medical_organizations');
          organizations.forEach(name => {
            tx.add({ name });
          });
        }
        
        // Create tasks store
        if (!database.objectStoreNames.contains('tasks')) {
          const taskStore = database.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
          taskStore.createIndex('by-moId', 'moId', { unique: false });
        }
      }
    });
    
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// User operations
export const getUserByUsername = async (username: string): Promise<User | undefined> => {
  await initDb();
  return db.getFromIndex('users', 'by-username', username);
};

export const authenticateUser = async (username: string, password: string): Promise<Omit<User, 'password'> | null> => {
  const user = await getUserByUsername(username);
  
  if (user && user.password === password) {
    // Return user without the password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  return null;
};

export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  await initDb();
  const id = await db.add('users', userData as User);
  return { ...userData, id };
};

// Medical Organization operations
export const getAllMedicalOrganizations = async (): Promise<MedicalOrganization[]> => {
  await initDb();
  return db.getAll('medical_organizations');
};

export const getMedicalOrganizationById = async (id: number): Promise<MedicalOrganization | undefined> => {
  await initDb();
  return db.get('medical_organizations', id);
};

export const createMedicalOrganization = async (orgData: Omit<MedicalOrganization, 'id'>): Promise<MedicalOrganization> => {
  await initDb();
  const id = await db.add('medical_organizations', orgData as MedicalOrganization);
  return { ...orgData, id };
};

// Task operations
export const getAllTasks = async (): Promise<Task[]> => {
  await initDb();
  return db.getAll('tasks');
};

export const getTaskById = async (id: number): Promise<Task | undefined> => {
  await initDb();
  return db.get('tasks', id);
};

export const getTasksByMoId = async (moId: number): Promise<Task[]> => {
  await initDb();
  return db.getAllFromIndex('tasks', 'by-moId', moId);
};

export const createTask = async (taskData: Omit<Task, 'id'>): Promise<Task> => {
  await initDb();
  const id = await db.add('tasks', taskData as Task);
  return { ...taskData, id };
};

export const updateTask = async (id: number, taskData: Partial<Omit<Task, 'id'>>): Promise<Task> => {
  await initDb();
  const task = await getTaskById(id);
  if (!task) throw new Error(`Task with id ${id} not found`);
  
  const updatedTask = { ...task, ...taskData };
  await db.put('tasks', updatedTask);
  return updatedTask;
};

export const deleteTask = async (id: number): Promise<void> => {
  await initDb();
  await db.delete('tasks', id);
};
