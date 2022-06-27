export const shortAddress = (address: string, before: number, after: number): string =>
  address ? `${address.slice(0, before)}...${address.slice(address.length - after, address.length)}` : '';
