import { api } from "./api";
import type { Customer, CustomerType } from "@/types/customer";

export interface CreateCustomerInput {
  cus_name: string;
  cus_address?: string | null;
  cus_contactno?: string | null;
  cus_email?: string | null;
  cus_birthdate?: string | null;
  cus_type: string;
  cus_branch?: string | null;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput> & {
  cus_joindate?: string | null;
};

export async function listCustomerTypes(): Promise<CustomerType[]> {
  const { types } = await api.get<{ types: CustomerType[] }>(
    "/api/customers/type",
  );
  return types;
}

export async function listCustomers(): Promise<Customer[]> {
  const { customers } = await api.get<{ customers: Customer[] }>(
    "/api/customers",
  );
  return customers;
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<Customer> {
  const { customer } = await api.post<{ customer: Customer }>(
    "/api/customers",
    input,
  );
  return customer;
}

export async function updateCustomer(
  cusRefno: number,
  input: UpdateCustomerInput,
): Promise<Customer> {
  const { customer } = await api.patch<{ customer: Customer }>(
    `/api/customers/${cusRefno}`,
    input,
  );
  return customer;
}
