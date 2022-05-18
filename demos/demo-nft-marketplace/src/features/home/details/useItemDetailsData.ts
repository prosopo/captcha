import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { itemDetailsTabs } from './utils';

export function useItemDetailsData() {
  const router = useRouter();
  const { tab = itemDetailsTabs[0] } = router.query;
  const activeTab = itemDetailsTabs.findIndex((t) => t === tab) || 0;

  const setActiveTab = useCallback(
    async (index) => {
      if (typeof window !== 'undefined') {
        const tab = itemDetailsTabs[index];
        router.push(
          {
            pathname: window.location.pathname,
            query: { ...router.query, tab },
          },
          `/item/${router.query['nft-item-details']}?tab=${tab}`,
          { scroll: false, shallow: true }
        );
      }
    },
    [router]
  );

  const isHistoryTab = tab === 'History';
  // const isBidsTab = tab === 'Bids';
  const isOwnersTab = tab === 'Owners';
  const isDetailsTab = tab === 'Details';

  return {
    activeTab,
    setActiveTab,
    tabs: itemDetailsTabs,
    isHistoryTab,
    // isBidsTab,
    isOwnersTab,
    isDetailsTab,
  };
}
