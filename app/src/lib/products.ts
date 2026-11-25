import { api } from "./api";
import type { Fulfillment, WaterProduct } from "@/types/product";

export async function listWaterProducts(): Promise<WaterProduct[]> {
  const { products } = await api.get<{ products: WaterProduct[] }>(
    "/api/products/water",
  );
  return products;
}

export function unitPriceFor(
  product: WaterProduct,
  mode: Fulfillment,
  qty: number,
): number {
  const usePickupPricing = mode === "pickup" || mode === "walkin";
  const base = usePickupPricing
    ? product.wr_pup_uprice
    : product.wr_del_uprice;
  const volPrice = usePickupPricing
    ? product.wr_vol_pup_uprice
    : product.wr_vol_del_uprice;
  if (
    product.wr_vol_minqty &&
    volPrice !== null &&
    qty >= product.wr_vol_minqty
  ) {
    return Number(volPrice);
  }
  return Number(base);
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
