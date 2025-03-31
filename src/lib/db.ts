
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
            "ГБУЗ НСО \"ГКП №2\" ВПО",
            "ГБУЗ НСО \"ГКП №2\" ДПО",
            "ГБУЗ НСО \"КДП №2\" ВПО",
            "ГБУЗ НСО \"КДП №2\" ДПО, ул. Морской Проспект 25/1",
            "ГБУЗ НСО \"КДП №2\" ДПО, ул. Русская 37",
            "ГБУЗ НСО \"НОГ №2 ВВ\" ВПО",
            "ГБУЗ НСО \"НРБ №2\" ВПО г. Обь, ул. Калинина, 25",
            "ГБУЗ НСО \"НРБ №2\" ВПО г. Обь, ул. ЖКО Аэропорта, 28",
            "ГБУЗ НСО \"НРБ №2\" ДПО",
            "ГБУЗ НСО \"ГБ №3\" ВПО",
            "ГБУЗ НСО \"ГБ №3\" ДПО",
            "ГБУЗ НСО \"ДГКБ №3\" ВПО",
            "ГБУЗ НСО \"ДГКБ №3\" ДПО",
            "ГБУЗ НСО \"НОКГВВ №3\" ВПО",
            "ГБУЗ НСО \"ГБ №4\" ВПО",
            "ГБУЗ НСО \"ГБ №4\" ДПО",
            "ГБУЗ НСО \"ДГКБ № 4 им.В.С. Гераськова\" ДПО",
            "ГБУЗ НСО \"ДГКБ №6\" ДПО",
            "ГБУЗ НСО \"ГКП №7\" ВПО",
            "ГБУЗ НСО \"ГКП №7\" ДПО",
            "ГБУЗ НСО \"ГКП №7\" КДЦ",
            "ГБУЗ НСО \"ГКБ №11\" ВПО",
            "ГБУЗ НСО \"ГКБ №11\" КДЦ",
            "ГБУЗ НСО \"ГКБ №12\" ВПО",
            "ГБУЗ НСО \"ГКБ №12\" ДПО",
            "ГБУЗ НСО \"ГКП №13\" ВПО",
            "ГБУЗ НСО \"ГКП №13\" ДПО",
            "ГБУЗ НСО \"ГКП №14\" ВПО",
            "ГБУЗ НСО \"ГКП №14\" ДПО",
            "ГБУЗ НСО \"ГКП №16\" ВПО",
            "ГБУЗ НСО \"ГП №17\" ВПО",
            "ГБУЗ НСО \"ГП №17\" ДПО",
            "ГБУЗ НСО \"ГП №18\" ВПО",
            "ГБУЗ НСО \"ГП №18\" ДПО ул. С. Иоаниди, 4/1",
            "ГБУЗ НСО \"ГП №18\" ДПО, ул. Халтурина 30",
            "ГБУЗ НСО \"ГП №18\" ДПО, ул. Широкая 113",
            "ГБУЗ НСО \"ГКБ №19\" ВПО",
            "ГБУЗ НСО \"ГКБ №19\" ДПО",
            "ГБУЗ НСО \"ГКП №20\" ВПО",
            "ГБУЗ НСО \"ГКП №20\" ДПО",
            "ГБУЗ НСО \"ГКП №21\" ВПО",
            "ГБУЗ НСО \"ГКП №22\" ВПО",
            "ГБУЗ НСО \"ГКП №22\" ДПО",
            "ГБУЗ НСО \"ГП №24\" ВПО",
            "ГБУЗ НСО \"ГП №24\" ДПО, ул. Связистов 157",
            "ГБУЗ НСО \"ГП №24\" ДПО, ул. Станиславского 52",
            "ГБУЗ НСО \"ГКБ №25\" ВПО",
            "ГБУЗ НСО \"ГКБ №25\" ДПО",
            "ГБУЗ НСО \"ККДП №27\" ВПО",
            "ГБУЗ НСО \"ККДП №27\" ДПО, ул. Вавилова 2",
            "ГБУЗ НСО \"ККДП №27\" ДПО, ул. Рельсовая 4",
            "ГБУЗ НСО \"ККДП №27\" ДПО, ул. Холодильная 16",
            "ГБУЗ НСО \"ГКП №29\" ВПО",
            "ГБУЗ НСО \"ГКП №29\" ДПО, ул. Рассветная 5/1",
            "ГБУЗ НСО \"ГКП №29\" ДПО, ул. Тамбовская 43а",
            "ГБУЗ НСО \"ГКП №29\" ДПО, ул. Тюленина 9",
            "ГБУЗ НСО \"ГКБ №34\" ВПО",
            "ГБУЗ НСО \"ГКБ №34\" КДЦ",
            "ГБУЗ НСО \"ГДКБСМП\" КДЦ",
            "ГБУЗ НСО \"ГНОКБ\" ВПО",
            "ГБУЗ НСО \"ГНОКБ\" КДЦ",
            "ГБУЗ НСО \"ГНОКГВВ\" ВПО",
            "ГБУЗ НСО \"НКЦРБ\" ВПО р.п. Краснообск",
            "ГБУЗ НСО \"НКЦРБ\" ВПО с. Криводановка",
            "ГБУЗ НСО \"НКЦРБ\" ДПО",
            "ГБУЗ НСО \"Баганская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Баганская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Барабинская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Барабинская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Бердская ЦГБ\" ДПО, ул. Карла Маркса 28",
            "ГБУЗ НСО \"Бердская ЦГБ\" ДПО, ул. Микрорайон 41а",
            "ГБУЗ НСО \"Бердская ЦРБ\" ВПО ул. Островского, 53",
            "ГБУЗ НСО \"Бердская ЦРБ\" ВПО ул. Боровая, 109",
            "ГБУЗ НСО \"Болотнинская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Болотнинская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Венгеровская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Венгеровская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Доволенская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Доволенская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Здвинская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Здвинская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Искитимская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Искитимская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Карасукская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Карасукская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Каргатская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Каргатская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Колыванская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Колыванская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Коченевская ЦРБ\" ВПО ул. Кузнецкая, 176",
            "ГБУЗ НСО \"Коченевская ЦРБ\" ВПО р.п. Чик",
            "ГБУЗ НСО \"Коченевская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Кочковская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Кочковская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Краснозерская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Краснозерская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Куйбышевская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Куйбышевская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Купинская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Купинская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Кыштовская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Кыштовская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Линевская РБ\" ВПО",
            "ГБУЗ НСО \"Линевская РБ\" ДПО",
            "ГБУЗ НСО \"Маслянинская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Маслянинская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Мошковская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Мошковская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Ордынская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Ордынская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Северная ЦРБ\" ВПО",
            "ГБУЗ НСО \"Северная ЦРБ\" ДПО",
            "ГБУЗ НСО \"Сузунская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Сузунская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Татарская ЦРБ им.70-летия Новосибирской области\" ВПО",
            "ГБУЗ НСО \"Татарская ЦРБ им.70-летия Новосибирской области\" ДПО",
            "ГБУЗ НСО \"Тогучинская ЦРБ\" ВПО ул. Лапина, 1",
            "ГБУЗ НСО \"Тогучинская ЦРБ\" ВПО р.п. Горный",
            "ГБУЗ НСО \"Тогучинская ЦРБ\" Горновская больница ДПО",
            "ГБУЗ НСО \"Тогучинская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Убинская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Убинская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Усть-Таркская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Усть-Таркская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Чановская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Чановская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Черепановская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Черепановская ЦРБ\" ДПО",
            "ГБУЗ НСО \"Чистоозерная ЦРБ\" ВПО",
            "ГБУЗ НСО \"Чистоозерная ЦРБ\" ДПО",
            "ГБУЗ НСО \"Чулымская ЦРБ\" ВПО",
            "ГБУЗ НСО \"Чулымская ЦРБ\" ДПО",
            "ГАУЗ НСО \"КСП №1\"",
            "ГАУЗ НСО \"КСП №2\"",
            "ГАУЗ НСО \"СП №5\"",
            "ГАУЗ НСО \"СП №8\"",
            "ГБУЗ НСО \"ДГКСП\"",
            "ГБУЗ НСО \"КСП №3\"",
            "ГБУЗ НСО \"НОСП\"",
            "ГБУЗ НСО \"ГНОВФД\"",
            "ГБУЗ НСО \"НОДКПНД\"",
            "ГБУЗ НСО \"НОККВД\" ВПО",
            "ГБУЗ НСО \"НОККД\" ВПО",
            "ГБУЗ НСО \"НОКНД\" ВПО",
            "ГБУЗ НСО \"НОКОД\" ВПО",
            "ГБУЗ НСО \"ГКБ №1\" КС",
            "ГБУЗ НСО \"ДГКБ №1\" КС",
            "ГБУЗ НСО \"НКРБ №1\" КС",
            "ГБУЗ НСО \"Гинекологическая больница №2\" КС",
            "ГБУЗ НСО \"ГКБ №2\" КС ул. Ползунова, 21",
            "ГБУЗ НСО \"ГКБСМП №2\" КС",
            "ГБУЗ НСО \"НОГ №2 ВВ\" КС",
            "ГБУЗ НСО \"НРБ №2\" КС",
            "ГБУЗ НСО \"ГБ №3\" КС",
            "ГБУЗ НСО \"ДГКБ №3\" КС",
            "ГБУЗ НСО \"НОКГВВ №3\" КС",
            "ГБУЗ НСО \"ГБ №4\" КС",
            "ГБУЗ НСО \"ДГКБ №4 им. В.С. Гераськова\" КС",
            "ГБУЗ НСО \"ДГКБ №6\" КС",
            "ГБУЗ НСО \"ГКБ №11\" КС",
            "ГБУЗ НСО \"ГКБ №12\" КС",
            "ГБУЗ НСО \"ГКБ №19\" КС",
            "ГБУЗ НСО \"ГКБ №25\" КС",
            "ГБУЗ НСО \"ГКБ №34\" КС",
            "ГБУЗ НСО \"ГДКБСМП\" КС",
            "ГБУЗ НСО \"ГНОКБ\" КС",
            "ГБУЗ НСО \"ГНОКГВВ\" КС",
            "ГБУЗ НСО \"НКЦРБ\" КС",
            "ГБУЗ НСО \"ЦКБ\" КС",
            "ГБУЗ НСО \"Баганская ЦРБ\" КС",
            "ГБУЗ НСО \"Барабинская ЦРБ\" КС",
            "ГБУЗ НСО \"Бердская ЦГБ\" КС",
            "ГБУЗ НСО \"Болотнинская ЦРБ\" КС",
            "ГБУЗ НСО \"Венгеровская ЦРБ\" КС",
            "ГБУЗ НСО \"Доволенская ЦРБ\" КС",
            "ГБУЗ НСО \"Здвинская ЦРБ\" КС",
            "ГБУЗ НСО \"Искитимская ЦРБ\" КС",
            "ГБУЗ НСО \"Карасукская ЦРБ\" КС",
            "ГБУЗ НСО \"Каргатская ЦРБ\" КС",
            "ГБУЗ НСО \"Колыванская ЦРБ\" КС",
            "ГБУЗ НСО \"Коченевская ЦРБ\" КС",
            "ГБУЗ НСО \"Кочковская ЦРБ\" КС",
            "ГБУЗ НСО \"Краснозерская ЦРБ\" КС",
            "ГБУЗ НСО \"Куйбышевская ЦРБ\" КС",
            "ГБУЗ НСО \"Купинская ЦРБ\" КС",
            "ГБУЗ НСО \"Кыштовская ЦРБ\" КС",
            "ГБУЗ НСО \"Линевская РБ\" КС",
            "ГБУЗ НСО \"Маслянинская ЦРБ\" КС",
            "ГБУЗ НСО \"Мошковская ЦРБ\" КС",
            "ГБУЗ НСО \"Ордынская ЦРБ\" КС",
            "ГБУЗ НСО \"Северная ЦРБ\" КС",
            "ГБУЗ НСО \"Сузунская ЦРБ\" КС",
            "ГБУЗ НСО \"Татарская ЦРБ им.70-летия Новосибирской области\" КС",
            "ГБУЗ НСО \"Тогучинская ЦРБ\" КС",
            "ГБУЗ НСО \"Убинская ЦРБ\" КС",
            "ГБУЗ НСО \"Усть-Таркская ЦРБ\" КС",
            "ГБУЗ НСО \"Чановская ЦРБ\" КС",
            "ГБУЗ НСО \"Черепановская ЦРБ\" КС",
            "ГБУЗ НСО \"Чистоозерная ЦРБ\" КС",
            "ГБУЗ НСО \"Чулымская ЦРБ\" КС",
            "ГБУЗ НСО \"НОККВД\" КС",
            "ГБУЗ НСО \"НОККД\" КС",
            "ГБУЗ НСО \"НОКНД\" КС",
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

export const createBulkTasks = async (taskTemplate: Omit<Task, 'id' | 'moId'>, moIds: number[]): Promise<Task[]> => {
  await initDb();
  const createdTasks: Task[] = [];
  
  // Create tasks for each selected MO
  for (const moId of moIds) {
    const taskData = { ...taskTemplate, moId };
    const id = await db.add('tasks', taskData as Task);
    createdTasks.push({ ...taskData, id });
  }
  
  return createdTasks;
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

