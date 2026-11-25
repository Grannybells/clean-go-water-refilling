import { Request, Response } from 'express';
import { listWaterProducts } from '../models/productWaterModel';

export const listWaterProductsHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const products = await listWaterProducts();
  res.json({ products });
};
