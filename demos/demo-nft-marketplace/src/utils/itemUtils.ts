import { NftItemMeta } from 'api/raribleRequestTypes';

export const getImageOrAnimation = (meta: NftItemMeta, reverseOrder = false, animation = false) => {
  const attribute = animation ? 'animation' : 'image';
  if (!meta?.[attribute]) {
    return null;
  }
  const { url } = meta?.[attribute] ?? {};
  //TODO: improve xd
  const img = reverseOrder ? url?.PREVIEW ?? url?.ORIGINAL ?? url?.BIG : url?.BIG ?? url?.ORIGINAL ?? url?.PREVIEW;
  return img?.startsWith('ipfs') ? img.replace('ipfs://', 'https://ipfs.io/') : img;
};

export const shortAddress = (address: string, before: number, after: number): string =>
  address ? `${address.slice(0, before)}...${address.slice(address.length - after, address.length)}` : '';
