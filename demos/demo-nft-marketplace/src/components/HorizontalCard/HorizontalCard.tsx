import Image from 'components/Image/Image'
import Link from 'components/Link'
import React from 'react'

type Props = {
    imageUrl: string
    title: React.ReactNode
    subtitle?: React.ReactNode
    actions?: React.ReactNode
    mainBackground?: boolean
    linkTo?: string
}

function HorizontalCard({ imageUrl, title, subtitle, actions, mainBackground = false, linkTo }: Props) {
    const Wrapper = linkTo ? ({ children }) => <Link to={linkTo}>{children}</Link> : ({ children }) => <>{children}</>

    return (
        <div className={'pb-5'}>
            <Wrapper>
                <div
                    className={`relative rounded-lg ${
                        mainBackground ? 'bg-main border-main' : 'bg-secondary border-secondary'
                    } px-2 py-4 shadow-sm flex items-center space-x-3 hover:border-gray-400 border-2`}
                >
                    <div className="flex-shrink-0">
                        <Image className="w-16 h-16 border-2 border-gray-700 rounded-full" src={imageUrl} alt="" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 md:flex-row md:justify-between">
                        <div>
                            <span className="absolute inset-0" aria-hidden="true" />
                            <p className="font-bold text-white">{title}</p>
                            {subtitle && (
                                <div className="pt-2 text-sm font-medium text-gray-700 truncate">{subtitle}</div>
                            )}
                        </div>
                        {actions && <div className={'flex mt-2 sm:mt-0 justify-end pr-2'}>{actions}</div>}
                    </div>
                </div>
            </Wrapper>
        </div>
    )
}
export default HorizontalCard
