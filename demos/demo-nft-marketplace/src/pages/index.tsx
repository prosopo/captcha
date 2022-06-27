import demoApi, { Token } from 'api/demoApi';
import { ProductList } from 'components/ProductCard';
import React, { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE = 20;
export interface HomeProps {
  tokens: Token[];
}

const Home: React.FunctionComponent<HomeProps> = ({ tokens: _tokens }) => {
  const [tokens, setTokens] = useState(_tokens);
  const [canLoadMore, setCanLoadMore] = useState(_tokens.length % PAGE_SIZE == 0);
  const loadMore = useCallback(async () => {
    const newTokens = await demoApi.getTokens(PAGE_SIZE, tokens.length);

    if (newTokens.length == 0 || newTokens.length % PAGE_SIZE > 0) {
      setCanLoadMore(false);
    }

    setTokens([...tokens, ...newTokens]);
  }, [tokens]);

  return (
    <div className="py-8">
      <ProductList onLoadMore={canLoadMore ? loadMore : null} tokens={tokens} />
    </div>
  );
};
export async function getServerSideProps(): Promise<{ props: HomeProps }> {
  const tokens = await demoApi.getTokens(PAGE_SIZE);

  return {
    props: { tokens },
  };
}

export default Home;
