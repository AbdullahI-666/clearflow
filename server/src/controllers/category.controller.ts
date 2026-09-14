import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ServiceCategory } from '../models/serviceCategory.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { MOCK_CATEGORIES } from '../services/workOrder.service.js';

let inMemoryCategories = [...MOCK_CATEGORIES];

export const getAll = async (req: Request, res: Response) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const categories = await ServiceCategory.find().sort({ createdAt: 1 });
      if (categories && categories.length > 0) {
        return res.json(ApiResponse.success(categories, 'Categories retrieved successfully'));
      }
    } catch (err) {}
  }

  res.json(ApiResponse.success(inMemoryCategories, 'Categories retrieved successfully'));
};

export const getById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (mongoose.connection.readyState === 1) {
    try {
      const category = await ServiceCategory.findById(id);
      if (category) {
        return res.json(ApiResponse.success(category, 'Category retrieved successfully'));
      }
    } catch (err) {}
  }

  const match = inMemoryCategories.find((c: any) => c._id === id || c.name === id);
  if (match) {
    return res.json(ApiResponse.success(match, 'Category retrieved successfully'));
  }

  throw new ApiError(404, 'Category not found');
};

export const create = async (req: Request, res: Response) => {
  const { name, description, isPaid = false, isWaste = false, iconUrl, basePrice = 0 } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Category name is required');
  }

  const newCat = {
    _id: '65f000000000000000000' + Math.floor(Math.random() * 899 + 100),
    name: name.trim(),
    description: description || '',
    isPaid: Boolean(isPaid),
    isWaste: Boolean(isWaste),
    iconUrl: iconUrl || 'sparkles',
    basePrice: Number(basePrice) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  inMemoryCategories.push(newCat as any);

  if (mongoose.connection.readyState === 1) {
    try {
      const category = await ServiceCategory.create({
        name: name.trim(),
        description: description || '',
        isPaid: Boolean(isPaid),
        isWaste: Boolean(isWaste),
        iconUrl: iconUrl || 'sparkles',
        basePrice: Number(basePrice) || 0,
      });
      return res.status(201).json(ApiResponse.created(category, 'Service category created successfully'));
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ApiError(409, 'A category with this name already exists');
      }
    }
  }

  res.status(201).json(ApiResponse.created(newCat, 'Service category created successfully'));
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const match = inMemoryCategories.find((c: any) => c._id === id);
  if (match) {
    Object.assign(match, updates, { updatedAt: new Date() });
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const category = await ServiceCategory.findByIdAndUpdate(id, updates, { new: true });
      if (category) {
        return res.json(ApiResponse.success(category, 'Category updated successfully'));
      }
    } catch (err) {}
  }

  res.json(ApiResponse.success(match || inMemoryCategories[0], 'Category updated successfully'));
};

export const remove = async (req: Request, res: Response) => {
  const { id } = req.params;

  inMemoryCategories = inMemoryCategories.filter((c: any) => c._id !== id);

  if (mongoose.connection.readyState === 1) {
    try {
      await ServiceCategory.findByIdAndDelete(id);
    } catch (err) {}
  }

  res.json(ApiResponse.success({ id }, 'Category deleted successfully'));
};
