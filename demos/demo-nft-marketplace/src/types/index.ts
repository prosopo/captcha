export enum Currency {
  ETH = 'ETH',
  RARI = 'RARI',
}

export class Currencies {
  static all() {
    return [Currency.ETH, Currency.RARI];
  }
}

export type BidItem = {
  createdAt: Date;
  createdByName: string;
  createdByImageUrl: string;
  price: string;
  currency: Currency;
  quantity: number;
};

export type NFTOwner = {
  avatarUrl: string;
  name: string;
  quantity?: number;
  price?: string;
  currency?: Currency;
};

export type NFTTransaction = {
  quantity: number;
  price: string;
  currency: Currency;
  createdBy: NFTOwner;
  createdAt: Date;
};

export type NFTItem = {
  name: string;
  description: string;
  imageUrls: string[];
  price: string;
  currency: Currency;
  totalQuantity: number;
  availableQuantity: number;
  royalties: number;
};

// todo mock
export type NFTItemOrder = {
  '@type': 'transfer' | 'mint';
  quantity: number;
  price: string;
  currency: Currency;
  createdBy: NFTOwner;
  createdAt: Date;
};
