import { CoverPhoto } from 'assets';
import React, { useCallback, useState } from 'react';
import Avatar from 'components/Avatar/Avatar';
import demoApi, { PAGE_SIZE, Token } from 'api/demoApi';
import { ProductList } from 'components/ProductCard';
import { NextPageContext } from 'next';

export interface ProfileProps {
  userId: string;
  tokens: Token[];
}

const Profile: React.FunctionComponent<ProfileProps> = ({ tokens: _tokens, userId }) => {
  const [tokens, setTokens] = useState(_tokens);
  const [canLoadMore, setCanLoadMore] = useState(_tokens.length % PAGE_SIZE == 0);
  const loadMore = useCallback(async () => {
    const newTokens = await demoApi.getTokens(PAGE_SIZE, tokens.length, userId).catch(() => []);

    if (newTokens.length == 0 || newTokens.length % PAGE_SIZE > 0) {
      setCanLoadMore(false);
    }

    setTokens([...tokens, ...newTokens]);
  }, [tokens]);

  return (
    <>
      <div className="flex flex-col items-center m-auto text-lg text-white max-w-screen-2xl">
        <img className="overflow-hidden " src={CoverPhoto} />
        <div className="relative flex flex-col items-center w-11/12 bg-secondary lg:w-2/3 sm:w-10/12 md:-top-16 -top-4">
          <div className="transform -translate-y-1/2">
            <Avatar sizeClasses="w-20 h-20 lg:w-48 lg:h-48" username={userId} disableHoverEffects />
          </div>
          <h1 className="relative text-sm font-bold sm:text-lg md:text-xl xl:text-2xl -top-4 ">{userId}</h1>
        </div>
      </div>
      <div className="py-4 bg-secondary">
        <ProductList tokens={tokens} onLoadMore={canLoadMore ? loadMore : null} />
      </div>
    </>
  );
};

export async function getServerSideProps(context: NextPageContext): Promise<{ props: ProfileProps }> {
  const userId = context.query.id as string;

  const tokens = await demoApi.getTokens(PAGE_SIZE, 0, userId).catch(() => []);

  return {
    props: {
      tokens,
      userId,
    },
  };
}

export default Profile;
