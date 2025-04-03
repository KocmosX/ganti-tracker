
import initSqlJs, { SqlJsStatic, Database } from 'sql.js';
import { User, MedicalOrganization, Task, TaskStatus, TaskMoStatus } from './db';

// URL для загрузки WASM файла sql.js
const SQL_WASM_PATH = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.9.0/sql-wasm.wasm';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

// Инициализация SQLite
export const initSqliteDb = async (): Promise<Database> => {
  if (db) return db;
  
  try {
    console.log('Инициализация SQLite...');
    SQL = await initSqlJs({
      locateFile: () => SQL_WASM_PATH
    });
    
    // Проверяем, есть ли сохраненная база в localStorage
    const savedDbData = localStorage.getItem('sqlite-db-data');
    
    if (savedDbData) {
      // Восстанавливаем базу из сохраненных данных
      const dataArray = new Uint8Array(JSON.parse(savedDbData));
      db = new SQL.Database(dataArray);
      console.log('База SQLite восстановлена из localStorage');
    } else {
      // Создаем новую базу данных
      db = new SQL.Database();
      console.log('Создана новая база SQLite');
      
      // Создаем необходимые таблицы
      createTables();
      
      // Добавляем начальные данные
      await seedInitialData();
    }
    
    return db;
  } catch (error) {
    console.error('Ошибка при инициализации SQLite:', error);
    throw error;
  }
};

// Функция для сохранения базы данных в localStorage
export const saveDatabase = () => {
  if (!db) return;
  
  try {
    const data = db.export();
    const dataArray = Array.from(data);
    localStorage.setItem('sqlite-db-data', JSON.stringify(dataArray));
    console.log('База данных сохранена в localStorage');
  } catch (error) {
    console.error('Ошибка при сохранении базы данных:', error);
  }
};

// Создание структуры таблиц
const createTables = () => {
  if (!db) return;
  
  // Таблица пользователей
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      isAdmin INTEGER NOT NULL DEFAULT 0
    )
  `);
  
  // Таблица медицинских организаций
  db.exec(`
    CREATE TABLE IF NOT EXISTS medical_organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);
  
  // Таблица задач
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      moId INTEGER NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      assignedBy TEXT NOT NULL,
      completionPercentage INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      result TEXT,
      comment TEXT
    )
  `);
  
  // Таблица статусов задач по МО
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_mo_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      moId INTEGER NOT NULL,
      completionPercentage INTEGER NOT NULL DEFAULT 0,
      comment TEXT,
      lastUpdated TEXT NOT NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (moId) REFERENCES medical_organizations(id)
    )
  `);
  
  console.log('Таблицы созданы в SQLite');
};

// Заполнение базы данных начальными данными
const seedInitialData = async () => {
  if (!db) return;
  
  // Список администраторов
  const adminUsers = [
    { username: 'evbelugina', password: 'evbelugina', isAdmin: 1, fullName: 'Белугина Елена Владимировна' },
    { username: 'nvizmaylova', password: 'nvizmaylova', isAdmin: 1, fullName: 'Измайлова Наталья Викторовна' },
    { username: 'yvnikitenko', password: 'yvnikitenko', isAdmin: 1, fullName: 'Никитенко Юлия Владимировна' },
    { username: 'nv-mironova', password: 'nv-mironova', isAdmin: 1, fullName: 'Миронова Наталья Владимировна' },
    { username: 'aknol', password: 'aknol', isAdmin: 1, fullName: 'Кноль Анна Сергеевна' },
    { username: 'nebakulina', password: 'nebakulina', isAdmin: 1, fullName: 'Бакулина Наталья Евгеньевна' },
    { username: 'nv_kovaleva', password: 'nv_kovaleva', isAdmin: 1, fullName: 'Ковалева Наталья Викторовна' },
    { username: 'siyadykin', password: 'siyadykin', isAdmin: 1, fullName: 'Ядыкин Станислав Игоревич' }
  ];
  
  adminUsers.forEach(user => {
    db!.exec(`
      INSERT OR IGNORE INTO users (username, password, isAdmin)
      VALUES ('${user.username}', '${user.password}', ${user.isAdmin})
    `);
  });
  
  // Медицинские организации
  // Получаем список МО из существующей базы и импортируем их
  try {
    const organizations = await getAllMedicalOrganizationsFromIndexedDB();
    organizations.forEach(org => {
      if (org.name) {
        db!.exec(`
          INSERT OR IGNORE INTO medical_organizations (name)
          VALUES ('${org.name.replace(/'/g, "''")}')
        `);
      }
    });
  } catch (error) {
    console.error('Ошибка при импорте МО:', error);
  }
  
  saveDatabase();
  console.log('Начальные данные добавлены в SQLite');
};

// Получение данных из IndexedDB для миграции
const getAllMedicalOrganizationsFromIndexedDB = async (): Promise<MedicalOrganization[]> => {
  try {
    const { getAllMedicalOrganizations } = await import('./db');
    return await getAllMedicalOrganizations();
  } catch (error) {
    console.error('Ошибка при получении МО из IndexedDB:', error);
    return [];
  }
};

// Аутентификация пользователя
export const authenticateUserSQLite = async (username: string, password: string): Promise<Omit<User, 'password'> | null> => {
  await initSqliteDb();
  if (!db) return null;
  
  try {
    const stmt = db.prepare(`
      SELECT id, username, isAdmin FROM users
      WHERE username = :username AND password = :password
    `);
    
    stmt.bind({ ':username': username, ':password': password });
    const result = stmt.step();
    
    if (result) {
      const user = stmt.getAsObject() as User;
      stmt.free();
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } else {
      stmt.free();
      return null;
    }
  } catch (error) {
    console.error('Ошибка при аутентификации пользователя:', error);
    return null;
  }
};

// Получение всех МО
export const getAllMedicalOrganizationsSQLite = async (): Promise<MedicalOrganization[]> => {
  await initSqliteDb();
  if (!db) return [];
  
  try {
    const result = db.exec(`SELECT id, name FROM medical_organizations ORDER BY name`);
    
    if (result.length === 0 || !result[0].values) return [];
    
    return result[0].values.map(row => ({
      id: row[0] as number,
      name: row[1] as string
    }));
  } catch (error) {
    console.error('Ошибка при получении списка МО:', error);
    return [];
  }
};

// Получение всех задач
export const getAllTasksSQLite = async (): Promise<Task[]> => {
  await initSqliteDb();
  if (!db) return [];
  
  try {
    // Получаем все задачи
    const tasksResult = db.exec(`
      SELECT id, title, description, moId, startDate, endDate, 
             assignedBy, completionPercentage, status, result, comment
      FROM tasks
    `);
    
    if (tasksResult.length === 0 || !tasksResult[0].values) return [];
    
    const tasks = tasksResult[0].values.map(row => ({
      id: row[0] as number,
      title: row[1] as string,
      description: row[2] as string,
      moId: row[3] as number,
      startDate: row[4] as string,
      endDate: row[5] as string,
      assignedBy: row[6] as string,
      completionPercentage: row[7] as number,
      status: row[8] as TaskStatus,
      result: row[9] as string | undefined,
      comment: row[10] as string | undefined
    }));
    
    // Получаем статусы по МО для каждой задачи
    for (const task of tasks) {
      const statusesResult = db.exec(`
        SELECT moId, completionPercentage, comment, lastUpdated
        FROM task_mo_statuses
        WHERE taskId = ${task.id}
      `);
      
      if (statusesResult.length > 0 && statusesResult[0].values) {
        task.moStatuses = statusesResult[0].values.map(row => ({
          moId: row[0] as number,
          completionPercentage: row[1] as number,
          comment: row[2] as string | undefined,
          lastUpdated: row[3] as string
        }));
      }
    }
    
    return tasks;
  } catch (error) {
    console.error('Ошибка при получении списка задач:', error);
    return [];
  }
};

// Создание задачи
export const createTaskSQLite = async (taskData: Omit<Task, 'id'>): Promise<Task> => {
  await initSqliteDb();
  if (!db) throw new Error('База данных не инициализирована');
  
  try {
    // Добавляем статусы для медорганизаций, если их еще нет
    let finalTaskData = { ...taskData };
    
    if (!finalTaskData.moStatuses) {
      finalTaskData.moStatuses = [{
        moId: finalTaskData.moId,
        completionPercentage: finalTaskData.completionPercentage || 0,
        lastUpdated: new Date().toISOString()
      }];
    }
    
    // Добавляем задачу
    db.exec(`
      INSERT INTO tasks (title, description, moId, startDate, endDate,
                        assignedBy, completionPercentage, status, result, comment)
      VALUES (
        '${finalTaskData.title.replace(/'/g, "''")}',
        '${finalTaskData.description.replace(/'/g, "''")}',
        ${finalTaskData.moId},
        '${finalTaskData.startDate}',
        '${finalTaskData.endDate}',
        '${finalTaskData.assignedBy.replace(/'/g, "''")}',
        ${finalTaskData.completionPercentage},
        '${finalTaskData.status}',
        ${finalTaskData.result ? `'${finalTaskData.result.replace(/'/g, "''")}'` : 'NULL'},
        ${finalTaskData.comment ? `'${finalTaskData.comment.replace(/'/g, "''")}'` : 'NULL'}
      )
    `);
    
    // Получаем ID только что добавленной задачи
    const idResult = db.exec('SELECT last_insert_rowid()');
    const taskId = idResult[0].values![0][0] as number;
    
    // Добавляем статусы для МО
    if (finalTaskData.moStatuses) {
      for (const status of finalTaskData.moStatuses) {
        db.exec(`
          INSERT INTO task_mo_statuses (taskId, moId, completionPercentage, comment, lastUpdated)
          VALUES (
            ${taskId},
            ${status.moId},
            ${status.completionPercentage},
            ${status.comment ? `'${status.comment.replace(/'/g, "''")}'` : 'NULL'},
            '${status.lastUpdated}'
          )
        `);
      }
    }
    
    saveDatabase();
    return { ...finalTaskData, id: taskId };
  } catch (error) {
    console.error('Ошибка при создании задачи:', error);
    throw error;
  }
};

// Обновление задачи
export const updateTaskSQLite = async (id: number, taskData: Partial<Omit<Task, 'id'>>): Promise<Task> => {
  await initSqliteDb();
  if (!db) throw new Error('База данных не инициализирована');
  
  try {
    // Получаем текущую задачу
    const taskResult = db.exec(`
      SELECT id, title, description, moId, startDate, endDate,
             assignedBy, completionPercentage, status, result, comment
      FROM tasks
      WHERE id = ${id}
    `);
    
    if (taskResult.length === 0 || !taskResult[0].values) {
      throw new Error(`Задача с id ${id} не найдена`);
    }
    
    const taskRow = taskResult[0].values[0];
    const currentTask: Task = {
      id: taskRow[0] as number,
      title: taskRow[1] as string,
      description: taskRow[2] as string,
      moId: taskRow[3] as number,
      startDate: taskRow[4] as string,
      endDate: taskRow[5] as string,
      assignedBy: taskRow[6] as string,
      completionPercentage: taskRow[7] as number,
      status: taskRow[8] as TaskStatus,
      result: taskRow[9] as string | undefined,
      comment: taskRow[10] as string | undefined
    };
    
    // Объединяем текущую задачу с данными обновления
    const updatedTask = { ...currentTask, ...taskData };
    
    // Обновляем задачу
    db.exec(`
      UPDATE tasks SET
        title = '${updatedTask.title.replace(/'/g, "''")}',
        description = '${updatedTask.description.replace(/'/g, "''")}',
        moId = ${updatedTask.moId},
        startDate = '${updatedTask.startDate}',
        endDate = '${updatedTask.endDate}',
        assignedBy = '${updatedTask.assignedBy.replace(/'/g, "''")}',
        completionPercentage = ${updatedTask.completionPercentage},
        status = '${updatedTask.status}',
        result = ${updatedTask.result ? `'${updatedTask.result.replace(/'/g, "''")}'` : 'NULL'},
        comment = ${updatedTask.comment ? `'${updatedTask.comment.replace(/'/g, "''")}'` : 'NULL'}
      WHERE id = ${id}
    `);
    
    // Обновляем статусы МО, если они были предоставлены
    if (taskData.moStatuses) {
      // Удаляем существующие статусы
      db.exec(`DELETE FROM task_mo_statuses WHERE taskId = ${id}`);
      
      // Добавляем новые статусы
      for (const status of taskData.moStatuses) {
        db.exec(`
          INSERT INTO task_mo_statuses (taskId, moId, completionPercentage, comment, lastUpdated)
          VALUES (
            ${id},
            ${status.moId},
            ${status.completionPercentage},
            ${status.comment ? `'${status.comment.replace(/'/g, "''")}'` : 'NULL'},
            '${status.lastUpdated}'
          )
        `);
      }
    }
    
    // Получаем обновленные статусы МО
    const statusesResult = db.exec(`
      SELECT moId, completionPercentage, comment, lastUpdated
      FROM task_mo_statuses
      WHERE taskId = ${id}
    `);
    
    if (statusesResult.length > 0 && statusesResult[0].values) {
      updatedTask.moStatuses = statusesResult[0].values.map(row => ({
        moId: row[0] as number,
        completionPercentage: row[1] as number,
        comment: row[2] as string | undefined,
        lastUpdated: row[3] as string
      }));
    }
    
    saveDatabase();
    return updatedTask;
  } catch (error) {
    console.error('Ошибка при обновлении задачи:', error);
    throw error;
  }
};

// Обновление статуса задачи для конкретной МО
export const updateTaskMoStatusSQLite = async (
  taskId: number, 
  moId: number, 
  status: Partial<Omit<TaskMoStatus, 'moId'>>
): Promise<Task> => {
  await initSqliteDb();
  if (!db) throw new Error('База данных не инициализирована');
  
  try {
    const lastUpdated = new Date().toISOString();
    
    // Проверяем, существует ли статус для этой задачи и МО
    const statusResult = db.exec(`
      SELECT COUNT(*) FROM task_mo_statuses
      WHERE taskId = ${taskId} AND moId = ${moId}
    `);
    
    const statusExists = statusResult[0].values![0][0] as number > 0;
    
    if (statusExists) {
      // Обновляем существующий статус
      db.exec(`
        UPDATE task_mo_statuses SET
          completionPercentage = ${status.completionPercentage !== undefined ? status.completionPercentage : 0},
          comment = ${status.comment ? `'${status.comment.replace(/'/g, "''")}'` : 'NULL'},
          lastUpdated = '${lastUpdated}'
        WHERE taskId = ${taskId} AND moId = ${moId}
      `);
    } else {
      // Добавляем новый статус
      db.exec(`
        INSERT INTO task_mo_statuses (taskId, moId, completionPercentage, comment, lastUpdated)
        VALUES (
          ${taskId},
          ${moId},
          ${status.completionPercentage !== undefined ? status.completionPercentage : 0},
          ${status.comment ? `'${status.comment.replace(/'/g, "''")}'` : 'NULL'},
          '${lastUpdated}'
        )
      `);
    }
    
    // Получаем все статусы МО для этой задачи
    const statusesResult = db.exec(`
      SELECT moId, completionPercentage FROM task_mo_statuses
      WHERE taskId = ${taskId}
    `);
    
    // Вычисляем средний процент выполнения
    let avgCompletion = 0;
    
    if (statusesResult.length > 0 && statusesResult[0].values) {
      const statuses = statusesResult[0].values;
      const total = statuses.reduce((sum, row) => sum + (row[1] as number), 0);
      avgCompletion = Math.round(total / statuses.length);
    }
    
    // Обновляем общий процент выполнения задачи
    db.exec(`
      UPDATE tasks SET
        completionPercentage = ${avgCompletion}
      WHERE id = ${taskId}
    `);
    
    // Получаем обновленную задачу
    const taskResult = db.exec(`
      SELECT id, title, description, moId, startDate, endDate,
             assignedBy, completionPercentage, status, result, comment
      FROM tasks
      WHERE id = ${taskId}
    `);
    
    if (taskResult.length === 0 || !taskResult[0].values) {
      throw new Error(`Задача с id ${taskId} не найдена`);
    }
    
    const taskRow = taskResult[0].values[0];
    const task: Task = {
      id: taskRow[0] as number,
      title: taskRow[1] as string,
      description: taskRow[2] as string,
      moId: taskRow[3] as number,
      startDate: taskRow[4] as string,
      endDate: taskRow[5] as string,
      assignedBy: taskRow[6] as string,
      completionPercentage: taskRow[7] as number,
      status: taskRow[8] as TaskStatus,
      result: taskRow[9] as string | undefined,
      comment: taskRow[10] as string | undefined
    };
    
    // Получаем обновленные статусы МО
    const updatedStatusesResult = db.exec(`
      SELECT moId, completionPercentage, comment, lastUpdated
      FROM task_mo_statuses
      WHERE taskId = ${taskId}
    `);
    
    if (updatedStatusesResult.length > 0 && updatedStatusesResult[0].values) {
      task.moStatuses = updatedStatusesResult[0].values.map(row => ({
        moId: row[0] as number,
        completionPercentage: row[1] as number,
        comment: row[2] as string | undefined,
        lastUpdated: row[3] as string
      }));
    }
    
    saveDatabase();
    return task;
  } catch (error) {
    console.error('Ошибка при обновлении статуса задачи для МО:', error);
    throw error;
  }
};

// Удаление задачи
export const deleteTaskSQLite = async (id: number): Promise<void> => {
  await initSqliteDb();
  if (!db) throw new Error('База данных не инициализирована');
  
  try {
    // Удаляем статусы МО для задачи
    db.exec(`DELETE FROM task_mo_statuses WHERE taskId = ${id}`);
    
    // Удаляем задачу
    db.exec(`DELETE FROM tasks WHERE id = ${id}`);
    
    saveDatabase();
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    throw error;
  }
};

// Экспорт базы данных
export const exportSqliteDatabase = (): Uint8Array | null => {
  if (!db) return null;
  return db.export();
};
