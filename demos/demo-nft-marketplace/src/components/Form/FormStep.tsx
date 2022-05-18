import React, { FC, ReactNode } from 'react';

type Props = { title: string; footer?: ReactNode };

const FormStep: FC<Props> = ({ title, footer, children }) => (
  <div className="px-6 py-4 max-w-screen-lg space-y-8 sm:space-y-5 bg-secondary">
    <div>
      <div>
        <h3 className="py-4 text-lg font-medium text-white border-b border-gray-600 leading-6 ">{title}</h3>
      </div>
      <div className={'pt-8'}>{children}</div>
    </div>
    <div className="flex justify-end">{footer}</div>
  </div>
);

export default FormStep;
