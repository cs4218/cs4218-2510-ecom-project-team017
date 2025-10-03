
import {
    createCategoryController, updateCategoryController, categoryController,
    singleCategoryController, deleteCategoryController
} from './categoryController.js';
import slugify from "slugify";
import categoryModel from "../models/categoryModel.js";

jest.mock('../models/categoryModel');
jest.mock('slugify', () => jest.fn((name) => name.toLowerCase().replace(/\s+/g, '-')));
const error = new Error('DB error');

describe('Create Category Controller', () => {
    let req, res;

    beforeEach(() => {
        req = { body: { name: 'Electronics' } };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        jest.clearAllMocks();
    });

    it('should return 400 if name is missing', async () => {
        req.body.name = '';

        await createCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: 'Name is required' });
    });

    it('should return 200 if category already exists', async () => {
        categoryModel.findOne.mockResolvedValueOnce({ name: 'Electronics' });

        await createCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category already exists"
        });
    });

    it('should return 201 upon successful creation of new category', async () => {
        categoryModel.create.mockResolvedValueOnce(null);
        categoryModel.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue({
                name: 'Electronics',
                slug: 'electronics',
            }),
        }));

        await createCategoryController(req, res);

        expect(slugify).toHaveBeenCalledWith('Electronics');
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: 'New category created',
            category: expect.objectContaining({
                name: 'Electronics',
                slug: 'electronics'
            })
        });

    });

    it('should return 500 in case of error', async () => {
        categoryModel.findOne.mockRejectedValue(error);

        await createCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error,
            message: "Error in creating category"
        });
    });
});

describe('Update Category Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: { name: 'UpdatedName' },
            params: { id: '66db427fdb0119d9234b27ed' }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        jest.clearAllMocks();
    });

    it('should return 200 when update category successful', async () => {
        categoryModel.findByIdAndUpdate.mockResolvedValueOnce({
            _id: '66db427fdb0119d9234b27ed',
            name: 'UpdatedName',
            slug: 'updatedname'
        });

        await updateCategoryController(req, res);
        expect(slugify).toHaveBeenCalledWith('UpdatedName');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            messsage: 'Category updated successfully',
            category: {
                _id: '66db427fdb0119d9234b27ed',
                name: 'UpdatedName',
                slug: 'updatedname'
            }
        });
    });

    it('should return 500 in case of error', async () => {
        categoryModel.findByIdAndUpdate.mockRejectedValue(error);

        await updateCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error,
            message: "Error while updating category"
        });
    });
});

describe('Category Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        jest.clearAllMocks();
    });

    it('should return 200 when get all categories successful', async () => {
        categoryModel.find.mockResolvedValueOnce({
            _id: '66db427fdb0119d9234b27ed',
            name: 'Electronics',
            slug: 'electronics'
        });

        await categoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "All Categories List",
            category: {
                _id: '66db427fdb0119d9234b27ed',
                name: 'Electronics',
                slug: 'electronics'
            },
        });
    });

    it('should return 500 in case of error', async () => {
        categoryModel.find.mockRejectedValue(error);

        await categoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error,
            message: "Error while getting all categories"
        });
    });
});

describe('Single Category Controller', () => {
    let req, res;

    beforeEach(() => {
        req = { params: { slug: 'electronics' } };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        jest.clearAllMocks();
    });

    it('should return 200 when get single category successful', async () => {
        categoryModel.findOne.mockResolvedValueOnce({
            _id: '66db427fdb0119d9234b27ed',
            name: 'Electronics',
            slug: 'electronics'
        });

        await singleCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Get single category successfully",
            category: {
                _id: '66db427fdb0119d9234b27ed',
                name: 'Electronics',
                slug: 'electronics'
            },
        });
    });

    it('should return 500 in case of error', async () => {
        categoryModel.findOne.mockRejectedValue(error);

        await singleCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error,
            message: "Error while getting single category"
        });
    });
});

describe('Delete Category Controller', () => {
    let req, res;

    beforeEach(() => {
        req = { params: { id: '66db427fdb0119d9234b27ed' } };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        jest.clearAllMocks();
    });

    it('should return 200 when category successfully deleted', async () => {
        categoryModel.findByIdAndDelete.mockResolvedValueOnce(null);

        await deleteCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category deleted successfully"
        });
    });

    it('should return 500 in case of error', async () => {
        categoryModel.findByIdAndDelete.mockRejectedValue(error);

        await deleteCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while deleting category",
            error
        });
    });
});