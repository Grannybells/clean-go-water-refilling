export interface CustomerType {
  id: number;
  customer_refno: string;
  type: string;
  description: string | null;
  created_by: number | null;
  created_at: string;
}

export interface Customer {
  cus_refno: number;
  cus_name: string;
  cus_address: string | null;
  cus_contactno: string | null;
  cus_email: string | null;
  cus_birthdate: string | null;
  cus_joindate: string | null;
  cus_type: string;
  cus_branch: string | null;
  cus_datecreated: string;
  cus_userid: number | null;
  cus_code: string;
}
