/* eslint-disable no-undef */
const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Устанавливаем тестовое окружение до подключения приложения,
// чтобы условие NODE_ENV !== 'test' не запустило сервер
process.env.NODE_ENV = 'test';

// Переопределяем путь к БД на временный файл
const TEST_DB_FILE = path.join(__dirname, '.test-db.json');
process.env.DB_FILE = TEST_DB_FILE;

const app = require('./server');

beforeEach(() => {
  // Перед каждым тестом очищаем тестовую БД
  fs.writeFileSync(TEST_DB_FILE, '[]', { encoding: 'utf8' });
});

afterAll(() => {
  // После всех тестов удаляем временный файл
  if (fs.existsSync(TEST_DB_FILE)) {
    fs.unlinkSync(TEST_DB_FILE);
  }
});

// Утилита для создания тестового клиента
const createTestClient = async (data = {}) => {
  const defaultClient = {
    name: 'Иван',
    surname: 'Иванов',
    lastName: 'Иванович',
    contacts: [{ type: 'phone', value: '+79991234567' }],
  };
  const res = await request(app)
    .post('/api/clients')
    .send({ ...defaultClient, ...data });
  return res;
};

describe('API clients', () => {
  // ================================================================
  // POST /api/clients
  // ================================================================
  describe('POST /api/clients', () => {
    it('должен создать клиента и вернуть 201', async () => {
      const res = await createTestClient();
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Иван');
      expect(res.body.surname).toBe('Иванов');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
      expect(res.headers.location).toBe(`/api/clients/${res.body.id}`);
    });

    it('должен вернуть 422 если нет имени или фамилии', async () => {
      const res = await request(app)
        .post('/api/clients')
        .send({ name: '', surname: '', contacts: [] });
      expect(res.statusCode).toBe(422);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', message: 'Не указано имя' }),
          expect.objectContaining({ field: 'surname', message: 'Не указана фамилия' }),
        ])
      );
    });

    it('должен вернуть 422 если контакты заполнены не полностью', async () => {
      const res = await request(app)
        .post('/api/clients')
        .send({
          name: 'Иван',
          surname: 'Иванов',
          contacts: [{ type: '', value: 'email@example.com' }],
        });
      expect(res.statusCode).toBe(422);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'contacts',
            message: 'Не все добавленные контакты полностью заполнены',
          }),
        ])
      );
    });
  });

  // ================================================================
  // GET /api/clients
  // ================================================================
  describe('GET /api/clients', () => {
    it('должен вернуть пустой массив, если клиентов нет', async () => {
      const res = await request(app).get('/api/clients');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('должен вернуть массив с одним клиентом после создания', async () => {
      await createTestClient();
      const res = await request(app).get('/api/clients');
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Иван');
    });

    it('должен фильтровать по поисковому запросу search (кириллица)', async () => {
      await createTestClient({ name: 'Петр', surname: 'Петров' });
      await createTestClient({ name: 'Иван', surname: 'Сидоров' });

      const res = await request(app).get('/api/clients?search=Петр');
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Петр');
    });

    it('должен искать по значению контактов (с учётом языкового фильтра)', async () => {
      // Клиент с латинским именем и email для латинского поиска
      await createTestClient({
        name: 'John',
        surname: 'Doe',
        contacts: [{ type: 'email', value: 'john@test.ru' }],
      });
      // Поиск по латинице
      const res = await request(app).get('/api/clients?search=john');
      expect(res.body).toHaveLength(1);
    });

    it('должен исключать клиента, если поиск на кириллице, а имя латиницей', async () => {
      await createTestClient({ name: 'John', surname: 'Doe' });
      const res = await request(app).get('/api/clients?search=Иван');
      expect(res.body).toHaveLength(0);
    });

    it('должен исключать клиента, если поиск на латинице, а имя кириллицей', async () => {
      await createTestClient({ name: 'Иван', surname: 'Иванов' });
      const res = await request(app).get('/api/clients?search=John');
      expect(res.body).toHaveLength(0);
    });

    it('должен искать по нескольким словам (имя + фамилия)', async () => {
      await createTestClient({ name: 'Анна', surname: 'Кузнецова' });
      await createTestClient({ name: 'Анна', surname: 'Смирнова' });
      const res = await request(app).get('/api/clients?search=Анна Кузнецова');
      expect(res.body).toHaveLength(1);
      expect(res.body[0].surname).toBe('Кузнецова');
    });

    it('должен корректно обрабатывать поиск с пробелами в начале и конце', async () => {
      await createTestClient({ name: 'Петр', surname: 'Петров' });
      const res = await request(app).get('/api/clients?search=  Петр  ');
      expect(res.body).toHaveLength(1);
    });
  });

  // ================================================================
  // GET /api/clients/:id
  // ================================================================
  describe('GET /api/clients/:id', () => {
    it('должен вернуть клиента по id', async () => {
      const { body: created } = await createTestClient();
      const res = await request(app).get(`/api/clients/${created.id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(created.id);
    });

    it('должен вернуть 404 для несуществующего id', async () => {
      const res = await request(app).get('/api/clients/несуществующий-id');
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Client Not Found');
    });
  });

  // ================================================================
  // PATCH /api/clients/:id
  // ================================================================
  describe('PATCH /api/clients/:id', () => {
    it('должен обновить имя клиента', async () => {
      const { body: created } = await createTestClient();
      const res = await request(app)
        .patch(`/api/clients/${created.id}`)
        .send({ name: 'Алексей' });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Алексей');
      expect(res.body.surname).toBe(created.surname); // не изменилась
      expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(created.updatedAt).getTime()
      );
    });

    it('должен обновить контакты', async () => {
      const { body: created } = await createTestClient();
      const newContacts = [{ type: 'email', value: 'alex@test.ru' }];
      const res = await request(app)
        .patch(`/api/clients/${created.id}`)
        .send({ contacts: newContacts });
      expect(res.statusCode).toBe(200);
      expect(res.body.contacts).toEqual(newContacts);
    });

    it('должен вернуть 404 при обновлении несуществующего клиента', async () => {
      const res = await request(app)
        .patch('/api/clients/fake-id')
        .send({ name: 'Новый' });
      expect(res.statusCode).toBe(404);
    });

    it('должен вернуть 422 если обновлённые данные некорректны (пустое имя)', async () => {
      const { body: created } = await createTestClient();
      const res = await request(app)
        .patch(`/api/clients/${created.id}`)
        .send({ name: '' });
      expect(res.statusCode).toBe(422);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', message: 'Имя не может быть пустым' }),
        ])
      );
    });

    it('должен вернуть 422 если в обновлённых контактах есть незаполненные', async () => {
      const { body: created } = await createTestClient();
      const res = await request(app)
        .patch(`/api/clients/${created.id}`)
        .send({ contacts: [{ type: 'phone', value: '' }] });
      expect(res.statusCode).toBe(422);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'contacts',
            message: 'Не все контакты заполнены',
          }),
        ])
      );
    });
  });

  // ================================================================
  // DELETE /api/clients/:id
  // ================================================================
  describe('DELETE /api/clients/:id', () => {
    it('должен удалить клиента и вернуть пустой объект', async () => {
      const { body: created } = await createTestClient();
      const res = await request(app).delete(`/api/clients/${created.id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({});

      // Проверяем, что клиент действительно удалён
      const getRes = await request(app).get(`/api/clients/${created.id}`);
      expect(getRes.statusCode).toBe(404);
    });

    it('должен вернуть 404 при удалении несуществующего клиента', async () => {
      const res = await request(app).delete('/api/clients/fake-id');
      expect(res.statusCode).toBe(404);
    });
  });

  // ================================================================
  // CORS
  // ================================================================
  describe('CORS headers', () => {
    it('должен отвечать на OPTIONS запрос', async () => {
      const res = await request(app).options('/api/clients');
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.statusCode).toBe(204);
    });
  });
});