import { Request, Response } from 'express';
import {
  createCustomer,
  customerTypeRefnoExists,
  findCustomerByRefno,
  listCustomerTypes,
  listCustomers,
  nextCustomerCode,
  updateCustomer,
} from '../models/customerModel';
import { branchExists } from '../models/branchModel';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));

const currentYYMM = (): string => {
  const now = new Date();
  const yy = String(now.getFullYear() % 100).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
};

export const listCustomerTypesHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const types = await listCustomerTypes();
  res.json({ types });
};

export const listCustomersHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const branchFilter =
    req.user.role === 'owner' ? null : req.user.contract?.branch_id ?? null;

  if (req.user.role !== 'owner' && !branchFilter) {
    res.json({ customers: [] });
    return;
  }

  const customers = await listCustomers(branchFilter);
  res.json({ customers });
};

export const createCustomerHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const {
    cus_name,
    cus_address,
    cus_contactno,
    cus_email,
    cus_birthdate,
    cus_type,
    cus_branch,
  } = req.body ?? {};

  if (!cus_name || !cus_type) {
    res.status(400).json({ message: 'cus_name and cus_type are required' });
    return;
  }
  if (cus_birthdate !== undefined && cus_birthdate !== null && !isValidDate(cus_birthdate)) {
    res.status(400).json({ message: 'cus_birthdate must be YYYY-MM-DD' });
    return;
  }
  if (!(await customerTypeRefnoExists(cus_type))) {
    res.status(404).json({ message: `Customer type '${cus_type}' not found` });
    return;
  }
  if (cus_branch !== undefined && cus_branch !== null && cus_branch !== '') {
    if (typeof cus_branch !== 'string' || !(await branchExists(cus_branch))) {
      res.status(404).json({ message: `Branch '${cus_branch}' not found` });
      return;
    }
  }

  const cus_code = await nextCustomerCode(cus_type, currentYYMM());

  const insertId = await createCustomer({
    cus_name,
    cus_address: cus_address ?? null,
    cus_contactno: cus_contactno ?? null,
    cus_email: cus_email ?? null,
    cus_birthdate: cus_birthdate ?? null,
    cus_type,
    cus_branch: cus_branch || null,
    cus_userid: req.user.id,
    cus_code,
  });

  const customer = await findCustomerByRefno(insertId);
  res.status(201).json({ customer });
};

export const updateCustomerHandler = async (req: Request, res: Response): Promise<void> => {
  const cusRefno = Number(req.params.cus_refno);
  if (!Number.isInteger(cusRefno)) {
    res.status(400).json({ message: 'cus_refno must be an integer' });
    return;
  }

  const existing = await findCustomerByRefno(cusRefno);
  if (!existing) {
    res.status(404).json({ message: 'Customer not found' });
    return;
  }

  const {
    cus_name,
    cus_address,
    cus_contactno,
    cus_email,
    cus_birthdate,
    cus_joindate,
    cus_type,
  } = req.body ?? {};

  if (cus_birthdate !== undefined && cus_birthdate !== null && !isValidDate(cus_birthdate)) {
    res.status(400).json({ message: 'cus_birthdate must be YYYY-MM-DD' });
    return;
  }
  if (cus_joindate !== undefined && cus_joindate !== null && !isValidDate(cus_joindate)) {
    res.status(400).json({ message: 'cus_joindate must be YYYY-MM-DD' });
    return;
  }
  if (cus_type !== undefined && !(await customerTypeRefnoExists(cus_type))) {
    res.status(404).json({ message: `Customer type '${cus_type}' not found` });
    return;
  }

  const affected = await updateCustomer(cusRefno, {
    cus_name,
    cus_address,
    cus_contactno,
    cus_email,
    cus_birthdate,
    cus_joindate,
    cus_type,
  });
  if (affected === 0) {
    res.status(400).json({ message: 'No valid fields provided for update' });
    return;
  }

  const customer = await findCustomerByRefno(cusRefno);
  res.json({ customer });
};
