import { getActivityHistory } from 'api/raribleApi';
import { ActivityHistoryFilter } from 'api/raribleRequestTypes';
import { ReloadIcon } from 'assets';
import ActivityCard from 'components/ActivityCard/ActivityCard';
import Button, { ButtonType } from 'components/Button';
import React, { useCallback, useEffect, useState } from 'react';
import { mapActivityHistory } from 'utils/raribleApiUtils';

export interface Props {
  address: string;
}

const ActivityHistoryTab: React.FunctionComponent<Props> = ({ address }) => {
  const [items, setItems] = useState<any[]>([]);
  const [continuation, setContinuation] = useState<string>(undefined);

  const fetchData = useCallback(async () => {
    const newItems = await getActivityHistory({
      address,
      filterBy: ActivityHistoryFilter.BY_USER,
      sort: 'LATEST_FIRST',
      size: 10,
      continuation,
    });

    if (continuation !== undefined && continuation === newItems.continuation) {
      setContinuation(null);
      return;
    }
    const mappedItems = mapActivityHistory(newItems.items);

    setItems([...items, ...mappedItems]);
    setContinuation(newItems.continuation ?? null);
  }, [address, continuation]);
  useEffect(() => {
    if (address) {
      fetchData();
    }
  }, [address]);
  return (
    <div className="px-4 py-3 mx-auto max-w-screen-lg sm:px-6 lg:px-6 lg:py-6">
      {items.map((item, id) => (
        <ActivityCard key={id} item={item} address={address} />
      ))}
      {continuation && (
        <div className="flex justify-center">
          <Button
            type={ButtonType.Main}
            title="Load more"
            customClasses="px-7 py-3"
            icon={ReloadIcon}
            onClick={fetchData}
          />
        </div>
      )}
    </div>
  );
};
export default ActivityHistoryTab;
