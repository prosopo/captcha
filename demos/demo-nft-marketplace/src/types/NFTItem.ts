export type NFTItem = {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
  //TODO: figure out what enpoint returns this
  createdQuantity: number;
  availableQuantity: number;
  likes: number;
  price: number;
  ownerUsername: string;
  ownerProfileImageUrl: string;
  userVerified?: boolean;
};
