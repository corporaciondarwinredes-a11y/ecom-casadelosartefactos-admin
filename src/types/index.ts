export type ApplianceCategory =
  | 'TELEVISORES'
  | 'AUDIO'
  | 'LAVADORAS'
  | 'REFRIGERADORAS'
  | 'CONGELADORAS'
  | 'COCINAS_HORNOS'
  | 'CLIMATIZACION';

export interface ProductItem {
  id: string;
  name: string;
  brand: string;
  modelCode?: string | null;
  category: ApplianceCategory;
  slug: string;
  description: string;
  specifications?: string | null;
  warrantyMonths: number;
  energyRating?: string | null;
  voltage?: string | null;
  dimensions?: string | null;
  weightKg?: number | null;
  retailPrice: number;
  discountPrice?: number | null;
  price: number;
  stock: number;
  sku: string;
  barcode?: string | null;
  image: string;
  isFeatured: boolean;
  isAvailable: boolean;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
}
