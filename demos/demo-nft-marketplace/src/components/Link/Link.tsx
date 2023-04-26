import NextLink from 'next/link';
import React, { FC, ReactNode, useCallback } from 'react';

//TODO: add other types
export enum LinkType {
  Main = 'text-white font-bold',
  Secondary = 'text-gray-600 font-semibold',
  Primary = 'text-transparent bg-clip-text bg-gradient-to-b from-primary-start to-primary-stop hover:from-primary-stop ',
}

type Props = {
  to?: string;
  title?: string;
  type?: LinkType;
  onClick?: (e?: any) => void;
  children?: ReactNode;
};

const Link: FC<Props> = ({ to, title = '', type = LinkType.Primary, children, onClick }) => {
  const renderComponent = useCallback(() => {
    return <a className={`${type}`}>{children ?? title}</a>;
  }, [children, type, title]);
  if (onClick) {
    return (
      (
        <div onClick={onClick} className={`${type}`}>
          {children ?? title}
        </div>
      ) ?? renderComponent()
    );
  }
  return (
    <NextLink href={to} passHref>
      {renderComponent()}
    </NextLink>
  );
};
export default Link;
