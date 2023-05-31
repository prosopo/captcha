import { LoadingIcon } from 'assets'
import Image from 'components/Image/Image'
import React, { FC } from 'react'
// TODO: add  clicked, hover effects

const BASE_BUTTON =
    'max-h-10 text-white font-semibold outline-none rounded shadow font-normal focus:outline-none border border-transparent items-center py-2'

export enum ButtonType {
    Primary = 'bg-gradient-to-b from-primary-start to-primary-stop bg-origin-border',
    Secondary = 'bg-secondary border-gray-600',
    Main = 'bg-main border-gray-600',
}

type Props = {
    title?: string
    // TODO change type?
    icon?: string
    iconRight?: boolean
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    type?: ButtonType
    fullWidth?: boolean
    customClasses?: string
    equalPadding?: boolean
    loading?: boolean
}

const Button: FC<Props> = ({
    customClasses = '',
    onClick,
    icon,
    title,
    iconRight,
    fullWidth,
    equalPadding,
    type = ButtonType.Primary,
    loading,
}) => (
    <button
        onClick={onClick}
        disabled={loading}
        className={`${BASE_BUTTON} ${type} ${fullWidth ? 'w-full' : 'w-max'} inline-flex ${
            iconRight ? 'flex-row' : 'flex-row-reverse'
        } ${customClasses} ${equalPadding ? 'px-2' : 'px-4'}`}
    >
        {loading && <Image className="inline object-contain w-5 h-5 p-px animate-spin" src={LoadingIcon} />}
        {title && <span className={`w-full ${title && icon ? (iconRight ? 'pr-2' : 'pl-2') : ''}`}>{title}</span>}
        {icon && <Image className="inline p-px w-7 h-7" src={icon} />}
    </button>
)
export default Button
