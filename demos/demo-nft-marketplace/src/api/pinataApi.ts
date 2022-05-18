import { PINATA_API_KEY, PINATA_API_SECRET } from 'utils/constants';

import FormData from 'form-data';

const pinataCommonRequest = {
  method: 'POST',
  headers: {
    pinata_api_key: PINATA_API_KEY,
    pinata_secret_api_key: PINATA_API_SECRET,
  },
};
export async function pinFileToIPFS(file) {
  const data = new FormData();
  const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

  //TODO consider adding pinata metadata
  data.append('file', file);
  return (
    await fetch(url, {
      ...pinataCommonRequest,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      body: data,
    })
  ).json();
}

export async function pinJSONToIpfs(body) {
  const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

  return (
    await fetch(url, {
      ...pinataCommonRequest,
      headers: { ...pinataCommonRequest.headers, 'Content-Type': 'application/json' },
      body,
    })
  ).json();
}
