import { RowDataPacket, pool } from '../config/database';

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

export const listWaterProducts = async (): Promise<WaterProduct[]> => {
  const [rows] = await pool.query<RowDataPacket>(
    `SELECT wr_refno, wr_desc, wr_pup_uprice, wr_del_uprice,
            wr_vol_minqty, wr_vol_pup_uprice, wr_vol_del_uprice,
            wr_code, wr_conttype
       FROM pdtitem_water
       ORDER BY wr_desc ASC`
  );
  return rows as WaterProduct[];
};
