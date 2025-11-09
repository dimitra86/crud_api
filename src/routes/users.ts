import { Router, Request, Response } from 'express';
import { db } from '../db/inMemoryDb';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { User } from '../types/user';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const all = await db.getAll();
  res.status(200).json(all);
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!uuidValidate(id)) return res.status(400).json({ message: 'Invalid userId' });
  const user = await db.getById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.status(200).json(user);
});

router.post('/', async (req: Request, res: Response) => {
  const { username, age, hobbies } = req.body;
  if (typeof username !== 'string' || typeof age !== 'number' || !Array.isArray(hobbies)) {
    return res.status(400).json({ message: 'Invalid request body' });
  }
  const newUser: User = { id: uuidv4(), username, age, hobbies };
  const created = await db.create(newUser);
  res.status(201).json(created);
});

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!uuidValidate(id)) return res.status(400).json({ message: 'Invalid userId' });
  const existing = await db.getById(id);
  if (!existing) return res.status(404).json({ message: 'User not found' });
  const { username, age, hobbies } = req.body;
  if (typeof username !== 'string' || typeof age !== 'number' || !Array.isArray(hobbies)) {
    return res.status(400).json({ message: 'Invalid request body' });
  }
  const updated: User = { id, username, age, hobbies };
  const saved = await db.update(id, updated);
  res.status(200).json(saved);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!uuidValidate(id)) return res.status(400).json({ message: 'Invalid userId' });
  const existing = await db.getById(id);
  if (!existing) return res.status(404).json({ message: 'User not found' });
  await db.delete(id);
  res.status(204).send();
});

export default router;
