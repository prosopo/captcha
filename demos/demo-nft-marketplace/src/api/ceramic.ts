import { useQuery } from 'react-query';

import { Core } from '@self.id/core';

import type { BasicProfile, AlsoKnownAsAccount } from '@ceramicstudio/idx-constants';
import { addrToCaip } from 'utils/caip10';
import { useEffect } from 'react';

// init

const core = new Core({ ceramic: 'mainnet-gateway' });

async function getDID(ethAddress: string | null): Promise<string | null> {
  return ethAddress ? core.getAccountDID(ethAddress) : null;
}

async function getProfileInfo(did: string): Promise<BasicProfile | null> {
  const basicProfileInfo = await core.get('basicProfile', did);
  return basicProfileInfo;
}

async function getSocials(did: string): Promise<AlsoKnownAsAccount[]> {
  const socials = await core.get('alsoKnownAs', did);
  return socials?.accounts || []; // FIXME: parse this into a type the UI can understand
}

export function useProfile(ethAddress: string | null): {
  basicProfileInfo: BasicProfile | null;
  loading: boolean;
  error: unknown;
} {
  const {
    data: did,
    error: didError,
    isLoading: didLoading,
    refetch: refetchDID,
  } = useQuery(['did', 'eth', ethAddress], ({ queryKey: [_did, _eth, ethAddress] }) =>
    ethAddress ? getDID(addrToCaip.eth(ethAddress.toLowerCase())) : undefined
  );

  useEffect(() => {
    refetchDID();
  }, [ethAddress]);

  const {
    data,
    isLoading,
    error,
    refetch: refetchProfile,
  } = useQuery(['profile', did], ({ queryKey: [_profile, did] }) => (did ? getProfileInfo(did) : undefined));

  useEffect(() => {
    refetchProfile();
  }, [did]);

  return {
    basicProfileInfo: data,
    loading: isLoading || didLoading,
    error: error || didError,
  };
}

export function useSocials(ethAddress: string | null): {
  socials: AlsoKnownAsAccount[]; // id = username, host = website's hostname, protocol = https
  loading: boolean;
  error: unknown;
} {
  const {
    data: did,
    error: didError,
    isLoading: didLoading,
    refetch: refetchDID,
  } = useQuery(
    ['did', 'eth', ethAddress],
    ({ queryKey: [_did, _eth, ethAddress] }): Promise<string | undefined> =>
      ethAddress ? getDID(addrToCaip.eth(ethAddress.toLowerCase())) : undefined
  );

  useEffect(() => {
    refetchDID();
  }, [ethAddress]);

  const {
    data,
    isLoading,
    error,
    refetch: refetchSocials,
  } = useQuery(['socials', did], ({ queryKey: [_socials, did] }) => (did ? getSocials(did) : undefined));

  useEffect(() => {
    refetchSocials();
  }, [did]);

  return {
    socials: data,
    loading: isLoading || didLoading,
    error: error || didError,
  };
}
