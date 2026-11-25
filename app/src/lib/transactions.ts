import { api } from "./api";

export type TxnType = "WI" | "PU" | "DL";
export type PayOption = "CS" | "QR" | "GC" | "CR";

export interface TxnHeader {
  wth_refno: number;
  wth_stncode: string | null;
  wth_docno: string;
  wth_date: string;
  wth_cuscode: string | null;
  wth_type: TxnType;
  wth_totalamt: number;
  wth_payoption: string | null;
  wth_status: string;
  wth_datecreated: string;
  wth_userid: string | null;
}

export interface TxnDetail {
  wtd_refno: number;
  wtd_stncode: string | null;
  wtd_docno: string;
  wtd_seqno: number;
  wtd_itemcode: string;
  wtd_qty: number;
  wtd_uprice: number;
  wtd_amount: number;
}

export interface TxnWithDetails {
  header: TxnHeader;
  details: TxnDetail[];
}

export async function listTransactions(): Promise<TxnHeader[]> {
  const { transactions } = await api.get<{ transactions: TxnHeader[] }>(
    "/api/transactions",
  );
  return transactions;
}

export async function getTransaction(docno: string): Promise<TxnWithDetails> {
  const { transaction } = await api.get<{ transaction: TxnWithDetails }>(
    `/api/transactions/${encodeURIComponent(docno)}`,
  );
  return transaction;
}

export async function listPendingPickups(): Promise<TxnHeader[]> {
  const { transactions } = await api.get<{ transactions: TxnHeader[] }>(
    "/api/transactions/pickups",
  );
  return transactions;
}

export interface PickupLineUpdate {
  seqno: number;
  qtypickup: number | null;
}

export async function closePickup(
  docno: string,
  lines: PickupLineUpdate[],
): Promise<TxnHeader> {
  const { transaction } = await api.patch<{ transaction: TxnHeader }>(
    `/api/transactions/${encodeURIComponent(docno)}/close-pickup`,
    { lines },
  );
  return transaction;
}

export interface TxnHeaderWithCustomer extends TxnHeader {
  customer_refno: number | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_contactno: string | null;
  customer_email: string | null;
}

export async function listPendingDeliveries(): Promise<TxnHeaderWithCustomer[]> {
  const { transactions } = await api.get<{
    transactions: TxnHeaderWithCustomer[];
  }>("/api/transactions/deliveries");
  return transactions;
}

export async function closeDelivery(
  docno: string,
  lines: PickupLineUpdate[],
): Promise<TxnHeaderWithCustomer> {
  const { transaction } = await api.patch<{
    transaction: TxnHeaderWithCustomer;
  }>(`/api/transactions/${encodeURIComponent(docno)}/close-delivery`, {
    lines,
  });
  return transaction;
}

export interface TxnLineInput {
  wr_code: string;
  qty: number;
  uprice: number;
}

export interface CreateTransactionInput {
  stncode: string | null;
  cuscode: string | null;
  type: TxnType;
  payoption: PayOption | null;
  lines: TxnLineInput[];
}

export interface CreatedTransaction {
  wth_refno: number;
  wth_docno: string;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<CreatedTransaction> {
  const { transaction } = await api.post<{ transaction: CreatedTransaction }>(
    "/api/transactions",
    input,
  );
  return transaction;
}
