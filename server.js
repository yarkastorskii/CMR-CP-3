require('dotenv').config();
const express = require('express');
const path = require('path');
const { existsSync, readFileSync, writeFileSync } = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || './db.json';
const URI_PREFIX = '/api/clients';

const asString = (v) => (v && String(v).trim()) || '';

// ============================================================
// Вспомогательный класс ошибки и функции работы с данными
// ============================================================
class ApiError extends Error {
  constructor(statusCode, data) {
    super();
    this.statusCode = statusCode;
    this.data = data;
  }
}

function makeClientFromData(data) {
  const errors = [];

  const client = {
    name: asString(data.name),
    surname: asString(data.surname),
    lastName: asString(data.lastName),
    contacts: Array.isArray(data.contacts)
      ? data.contacts.map(contact => ({
          type: asString(contact.type),
          value: asString(contact.value),
        }))
      : [],
  };

  if (!client.name) errors.push({ field: 'name', message: 'Не указано имя' });
  if (!client.surname) errors.push({ field: 'surname', message: 'Не указана фамилия' });
  if (client.contacts.some(contact => !contact.type || !contact.value)) {
    errors.push({ field: 'contacts', message: 'Не все добавленные контакты полностью заполнены' });
  }

  if (errors.length) throw new ApiError(422, { errors });
  return client;
}

function getClientList(params = {}) {
  const clients = JSON.parse(readFileSync(DB_FILE, 'utf-8') || '[]');
  if (!params.search) return clients;

  const search = params.search.trim().toLowerCase();
  if (!search) return clients;

  const searchWords = search.split(/\s+/).filter(w => w.length > 0);
  if (searchWords.length === 0) return clients;

  const hasCyrillic = /[а-яё]/i.test(search);

  return clients.filter(client => {
    const fullName = [
      client.surname,
      client.name,
      client.lastName
    ].filter(Boolean).join(' ').toLowerCase();

    if (hasCyrillic && !/[а-яё]/i.test(fullName)) return false;
    if (!hasCyrillic && /[а-яё]/i.test(fullName)) return false;

    return searchWords.every(word => {
      if (fullName.includes(word)) return true;
      return (client.contacts || []).some(contact =>
        contact.value.toLowerCase().includes(word)
      );
    });
  });
}

function createClient(data) {
  const clients = getClientList();
  const newItem = makeClientFromData(data);

  const maxId = clients.reduce((max, client) => {
    const num = parseInt(client.id, 10);
    return num > max ? num : max;
  }, 0);
  newItem.id = String(maxId + 1);
  newItem.createdAt = newItem.updatedAt = new Date().toISOString();

  // используем уже загруженный массив clients
  clients.push(newItem);
  writeFileSync(DB_FILE, JSON.stringify(clients), { encoding: 'utf8' });
  return newItem;
}

function getClient(itemId) {
  const client = getClientList().find(({ id }) => id === itemId);
  if (!client) throw new ApiError(404, { message: 'Client Not Found' });
  return client;
}

function updateClient(itemId, data) {
  const clients = getClientList();
  const itemIndex = clients.findIndex(({ id }) => id === itemId);
  if (itemIndex === -1) throw new ApiError(404, { message: 'Client Not Found' });
  
  const existing = clients[itemIndex];
  
  if (data.name !== undefined) existing.name = asString(data.name);
  if (data.surname !== undefined) existing.surname = asString(data.surname);
  if (data.lastName !== undefined) existing.lastName = asString(data.lastName);
  if (data.contacts !== undefined) {
    existing.contacts = Array.isArray(data.contacts) 
      ? data.contacts.map(c => ({ type: asString(c.type), value: asString(c.value) }))
      : [];
  }
  
  const validationErrors = [];
  if (!existing.name) {
    validationErrors.push({ field: 'name', message: 'Имя не может быть пустым' });
  }
  if (!existing.surname) {
    validationErrors.push({ field: 'surname', message: 'Фамилия не может быть пустой' });
  }
  if (existing.contacts.some(c => !c.type || !c.value)) {
    validationErrors.push({ field: 'contacts', message: 'Не все контакты заполнены' });
  }
  if (validationErrors.length) {
    throw new ApiError(422, { errors: validationErrors });
  }
  
  existing.updatedAt = new Date().toISOString();
  writeFileSync(DB_FILE, JSON.stringify(clients), { encoding: 'utf8' });
  return existing;
}

function deleteClient(itemId) {
  const clients = getClientList();
  const itemIndex = clients.findIndex(({ id }) => id === itemId);
  if (itemIndex === -1) throw new ApiError(404, { message: 'Client Not Found' });
  clients.splice(itemIndex, 1);
  writeFileSync(DB_FILE, JSON.stringify(clients), { encoding: 'utf8' });
  return {};
}

// ============================================================
// Создаём файл БД, если его нет
// ============================================================
if (!existsSync(DB_FILE)) {
  writeFileSync(DB_FILE, '[]', { encoding: 'utf8' });
}

// ============================================================
// Middleware
// ============================================================
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// Маршруты
// ============================================================
app.get('/api/info', (req, res) => {
  res.json({ server: 'Node.js', framework: 'Express' });
});

const clientsRouter = express.Router();

clientsRouter.get('/', (req, res, next) => {
  try {
    const clients = getClientList(req.query);
    res.json(clients);
  } catch (err) {
    next(err);
  }
});

clientsRouter.post('/', async (req, res, next) => {
  try {
    const newClient = createClient(req.body);
    res.setHeader('Access-Control-Expose-Headers', 'Location');
    res.setHeader('Location', `${URI_PREFIX}/${newClient.id}`);
    res.status(201).json(newClient);
  } catch (err) {
    next(err);
  }
});

clientsRouter.get('/:id', (req, res, next) => {
  try {
    const client = getClient(req.params.id);
    res.json(client);
  } catch (err) {
    next(err);
  }
});

clientsRouter.patch('/:id', (req, res, next) => {
  try {
    const updatedClient = updateClient(req.params.id, req.body);
    res.json(updatedClient);
  } catch (err) {
    next(err);
  }
});

clientsRouter.delete('/:id', (req, res, next) => {
  try {
    const result = deleteClient(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.use(URI_PREFIX, clientsRouter);

// ============================================================
// Централизованная обработка ошибок
// ============================================================
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(err.data);
  }
  console.error(err);
  res.status(500).json({ message: 'Server Error' });
});

// ============================================================
// Запуск сервера
// ============================================================
module.exports = app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Сервер CRM запущен на http://localhost:${PORT}`);
    console.log('Нажмите CTRL+C, чтобы остановить сервер');
    console.log('Доступные методы:');
    console.log(`GET ${URI_PREFIX} - список клиентов (query: search)`);
    console.log(`POST ${URI_PREFIX} - создать клиента (body: { name, surname, lastName?, contacts? })`);
    console.log(`GET ${URI_PREFIX}/{id} - получить клиента`);
    console.log(`PATCH ${URI_PREFIX}/{id} - изменить клиента (body: { name?, surname?, lastName?, contacts? })`);
    console.log(`DELETE ${URI_PREFIX}/{id} - удалить клиента`);
  });
}