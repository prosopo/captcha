import React, { FC } from 'react';

type Props = { titles: string[]; active?: number; onChange?: (index: number) => void };
const Tabs: FC<Props> = ({ titles, active = 0, onChange }) => {
  return (
    <div className="flex justify-around w-11/12 pb-2 mx-auto text-gray-300 lg:w-2/3 sm:w-10/12  md:-top-16 max-w-screen-lg">
      {titles.map((title, index) => (
        <div key={index} className="border-none bg-gradient-to-tr from-primary-start to-primary-stop">
          <a
            onClick={(e) => {
              e.preventDefault();
              onChange(index);
            }}
            key={index}
            className={`${
              active === index ? 'border-transparent' : 'border-main'
            }  bg-main  hover:text-gray-700 hover:border-gray-700 bg-clip-padding	  whitespace-nowrap flex py-2 px-1 border-b-2 font-medium`}
          >
            {title}
          </a>{' '}
        </div>
      ))}
    </div>
  );
};

export default Tabs;
