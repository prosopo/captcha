import React, { FC } from 'react';
// TODO: add  clicked, hover effects

const BASE_BUTTON =
  'max-h-10 text-white font-semibold outline-none rounded shadow font-normal focus:outline-none border border-transparent items-center py-2';

export enum ButtonType {
  Primary = 'bg-gradient-to-b from-primary-start to-primary-stop bg-origin-border',
  Secondary = 'bg-secondary border-gray-600',
  Main = 'bg-main border-gray-600',
}

type Props = {
  title?: string;
  // TODO change type?
  icon?: string;
  iconRight?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: ButtonType;
  fullWidth?: boolean;
  customClasses?: string;
  equalPadding?: boolean;
};

const Button: FC<Props> = ({
  customClasses = '',
  onClick,
  icon,
  title,
  iconRight,
  fullWidth,
  equalPadding,
  type = ButtonType.Primary,
}) => (
  <button
    onClick={onClick}
    className={`${BASE_BUTTON} ${type} ${fullWidth ? 'w-full' : 'w-max'} inline-flex ${
      iconRight ? 'flex-row' : 'flex-row-reverse'
    } ${customClasses} ${equalPadding ? 'px-2' : 'px-4'}`}
  >
    {title && <span className={`w-full ${title && icon ? (iconRight ? 'pr-2' : 'pl-2') : ''}`}>{title}</span>}
    {icon && <img className="inline p-px" src={icon} />}
  </button>
);
export default Button;
