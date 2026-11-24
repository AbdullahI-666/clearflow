import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { dbQuery } from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { emitCategoryUpdated } from '../socket/index.js';

const getCategoriesFilePath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'data', 'categories.json'),
    path.resolve(process.cwd(), 'server', 'data', 'categories.json'),
    'D:/Clearflow/clearflow-main/server/data/categories.json',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
};

export const loadPersistedCategories = (): any[] => {
  try {
    const p = getCategoriesFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
};

export const savePersistedCategories = (cats: any[]) => {
  try {
    const p = getCategoriesFilePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(cats, null, 2), 'utf-8');
  } catch (_) {}
};

export let inMemoryCategories = loadPersistedCategories();

export const getAll = async (req: Request, res: Response) => {
  let rows: any[] | null = null;
  try {
    const dbPromise = dbQuery('SELECT * FROM service_categories ORDER BY created_at ASC');
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 400));
    rows = await Promise.race([dbPromise, timeoutPromise]);
  } catch (_) {}

  if (Array.isArray(rows) && rows.length > 0) {
    const mapped = rows.map(r => ({
      _id: r.id,
      name: r.name,
      description: r.description,
      isPaid: r.is_paid,
      isWaste: r.is_waste,
      iconUrl: r.icon_url,
      basePrice: Number(r.base_price),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    const filtered = mapped.filter((c: any) => c.name !== 'Machinery' && c.name !== 'Security');
    return res.json(ApiResponse.success(filtered, 'Categories retrieved successfully'));
  }

  if (!inMemoryCategories || inMemoryCategories.length === 0) {
    inMemoryCategories = loadPersistedCategories();
  }
  const filteredMem = inMemoryCategories.filter((c: any) => c.name !== 'Machinery' && c.name !== 'Security');
  res.json(ApiResponse.success(filteredMem, 'Categories retrieved successfully'));
};

export const getById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const rows = await dbQuery('SELECT * FROM service_categories WHERE id::text = $1 OR name = $1 LIMIT 1', [id]);
  if (rows && rows.length > 0) {
    const r = rows[0];
    const mapped = {
      _id: r.id,
      name: r.name,
      description: r.description,
      isPaid: r.is_paid,
      isWaste: r.is_waste,
      iconUrl: r.icon_url,
      basePrice: Number(r.base_price),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
    return res.json(ApiResponse.success(mapped, 'Category retrieved successfully'));
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

  inMemoryCategories = loadPersistedCategories();
  inMemoryCategories.push(newCat as any);
  savePersistedCategories(inMemoryCategories);

  const rows = await dbQuery(
    `INSERT INTO service_categories (name, description, is_paid, is_waste, icon_url, base_price)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (name) DO NOTHING RETURNING *`,
    [name.trim(), description || '', Boolean(isPaid), Boolean(isWaste), iconUrl || 'sparkles', Number(basePrice) || 0]
  );

  if (rows && rows.length > 0) {
    const r = rows[0];
    const createdCat = {
      _id: r.id,
      name: r.name,
      description: r.description,
      isPaid: r.is_paid,
      isWaste: r.is_waste,
      iconUrl: r.icon_url,
      basePrice: Number(r.base_price),
    };
    emitCategoryUpdated('created', createdCat);
    return res.status(201).json(ApiResponse.created(createdCat, 'Service category created successfully'));
  }

  emitCategoryUpdated('created', newCat);
  res.status(201).json(ApiResponse.created(newCat, 'Service category created successfully'));
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  inMemoryCategories = loadPersistedCategories();
  let match = inMemoryCategories.find((c: any) => c._id === id || c.name === id);
  if (match) {
    Object.assign(match, updates, { updatedAt: new Date() });
    savePersistedCategories(inMemoryCategories);
  }

  await dbQuery(
    `UPDATE service_categories
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         is_paid = COALESCE($3, is_paid),
         is_waste = COALESCE($4, is_waste),
         icon_url = COALESCE($5, icon_url),
         base_price = COALESCE($6, base_price),
         updated_at = NOW()
     WHERE id::text = $7 OR name = $8`,
    [updates.name, updates.description, updates.isPaid, updates.isWaste, updates.iconUrl, updates.basePrice, id, updates.name || id]
  );

  const updatedPayload = match || { _id: id, ...updates };
  emitCategoryUpdated('updated', updatedPayload);

  res.json(ApiResponse.success(updatedPayload, 'Category updated successfully'));
};

export const remove = async (req: Request, res: Response) => {
  const { id } = req.params;

  inMemoryCategories = loadPersistedCategories().filter((c: any) => c._id !== id && c.name !== id);
  savePersistedCategories(inMemoryCategories);
  await dbQuery('DELETE FROM service_categories WHERE id::text = $1 OR name = $1', [id]);

  emitCategoryUpdated('deleted', { id });

  res.json(ApiResponse.success({ id }, 'Category deleted successfully'));
};
