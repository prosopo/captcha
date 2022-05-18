import React from 'react';

type Props = {
  imageUrl: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  mainBackground?: boolean;
};

function HorizontalCard({ imageUrl, title, subtitle, actions, mainBackground = false }: Props) {
  return (
    <div className={'pb-5'}>
      <div
        className={`relative rounded-lg ${
          mainBackground ? 'bg-main' : 'bg-secondary'
        } px-2 py-4 shadow-sm flex items-center space-x-3 hover:border-gray-400 `}
      >
        <div className="flex-shrink-0">
          <img className="w-16 h-16 border-2 border-gray-700 rounded-full" src={imageUrl} alt="" />
        </div>
        <div className="flex flex-col flex-1 min-w-0 md:flex-row md:justify-between">
          <div>
            <span className="absolute inset-0" aria-hidden="true" />
            <p className="font-bold text-white">{title}</p>
            {subtitle && <div className="pt-2 text-sm font-medium text-gray-700 truncate">{subtitle}</div>}
          </div>
          {actions && <div className={'flex mt-2 sm:mt-0 justify-end pr-2'}>{actions}</div>}
        </div>
      </div>
    </div>
  );
}
export default HorizontalCard;
