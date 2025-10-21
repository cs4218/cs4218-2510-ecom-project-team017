import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server.js';
import categoryModel from '../models/categoryModel.js';
import userModel from '../models/userModel.js';

let mongo;

describe('Category API integration tests', () => {
  let token;

  beforeEach(async () => {
    await userModel.deleteMany();
    await categoryModel.deleteMany();

    // Create a test user in DB
    const user = await userModel.create({
      name: "Test",
      email: "test@admin.com",
      password: 'test@admin.com',
      phone: "test@admin.com",
      address: "test@admin.com",
      answer: "test@admin.com",
      role: 1,
    });

    // Sign JWT manually
    token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || "test-secret-key", {
      expiresIn: '1h',
    });
  });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();

  });

  it('should create a category, return 201', async () => {
    const res = await request(app)
      .post('/api/v1/category/create-category')
      .set("Authorization", token)
      .send({ name: 'Tester' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.category.name).toBe('Tester');
    expect(res.body.category.slug).toBe('tester');
  });

  it('should not create duplicate category, return 200', async () => {
    await categoryModel.create({ name: 'Tester', slug: 'tester' });

    const res = await request(app)
      .post('/api/v1/category/create-category')
      .set("Authorization", token)
      .send({ name: 'Tester' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Category already exists');
  });

  it('create category bad request should return 400', async () => {
    const res = await request(app)
      .post('/api/v1/category/create-category')
      .set("Authorization", token)
      .send();

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Name is required');
  });

  it('should update a category, return 200', async () => {
    const category = await categoryModel.create({ name: 'Tech', slug: 'tech' });

    const res = await request(app)
      .put(`/api/v1/category/update-category/${category._id}`)
      .set("Authorization", token)
      .send({ name: 'Technology' });

    expect(res.statusCode).toBe(200);
    expect(res.body.category.name).toBe('Technology');
    expect(res.body.category.slug).toBe('technology');
  });

  it('should fetch all categories, return 200', async () => {
    await categoryModel.create({ name: 'Books', slug: 'books' });

    const res = await request(app)
      .get('/api/v1/category/get-category')
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.category.length).toBe(1);
    expect(res.body.category[0].name).toBe('Books');
  });

  it('should fetch single category by slug, return 200', async () => {
    await categoryModel.create({ name: 'Books', slug: 'books' });

    const res = await request(app)
      .get('/api/v1/category/single-category/books')
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.category.name).toBe('Books');
  });

  it('should delete a category, return 200', async () => {
    const category = await categoryModel.create({ name: 'DeleteMe', slug: 'deleteme' });

    const res = await request(app)
      .delete(`/api/v1/category/delete-category/${category._id}`)
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Category deleted successfully');
  });
});
