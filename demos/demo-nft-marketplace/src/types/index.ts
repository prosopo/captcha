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
