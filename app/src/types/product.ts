export interface WaterProduct {
  wr_refno: number;
  wr_desc: string;
  wr_pup_uprice: number;
  wr_del_uprice: number;
  wr_vol_minqty: number | null;
  wr_vol_pup_uprice: number | null;
  wr_vol_del_uprice: number | null;
  wr_code: string;
  wr_conttype: string | null;
}

export type Fulfillment = "walkin" | "pickup" | "delivery";

export interface CartLine {
  product: WaterProduct;
  qty: number;
}
