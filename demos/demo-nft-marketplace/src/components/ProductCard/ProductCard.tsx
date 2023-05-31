import { CheckoutModal } from 'components/Modal'
import { Token, formatPrice } from 'api/demoApi'
import { shortAddress } from 'utils/itemUtils'
import { useRouter } from 'next/router'
import { useToggle } from 'hooks/useToggle'
import Avatar from 'components/Avatar/Avatar'
import Image from 'components/Image/Image'
import Link from 'components/Link'
import React, { FC, useCallback } from 'react'

type Props = {
    item: Token
}

const ProductCard: FC<Props> = ({ item }) => {
    const address = shortAddress(item.owner, 5, 4)
    const router = useRouter()

    const image = item.meta.image
    const [isCheckoutVisible, setCheckoutVisible] = useToggle(false)

    const onBuyNow = useCallback(
        async (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (address) {
                setCheckoutVisible(true)
            }
        },
        [address]
    )

    const price = formatPrice(item.price)

    return (
        <Link to={`/item/${item.id}`}>
            <li className="text-white bold hover:bg-gray-900">
                <div className="flex flex-col justify-between h-full px-4 py-3 space-y-1 border border-gray-600 rounded-md">
                    <Link to={`/profile/${item.owner}`}>
                        <div className="flex items-center space-x-4 group">
                            <Avatar username={item.owner} />
                            <div className="space-y-1 font-medium leading-6 text-small">
                                <h3 className="text-gray-700 cursor-pointer group-hover:text-white">{`${address}`}</h3>
                            </div>
                        </div>
                    </Link>

                    <div className="relative flex justify-center w-full overflow-hidden rounded-lg aspect-square">
                        {/* <img
              className="absolute self-center object-cover w-full h-full justify-self-center blur"
              src={image}
              alt=""
            /> */}
                        <Image
                            className="absolute self-center object-contain w-full justify-self-center aspect-square"
                            src={image}
                            alt=""
                        />
                    </div>

                    <div>
                        <div className="overflow-hidden font-bold leading-6">
                            <div className="text-lg truncate">{item?.meta?.name}</div>
                        </div>
                        <div className="flex items-end justify-between font-bold leading-6">
                            {item.onSale ? (
                                <>
                                    <span className="text-sm">{price}</span>
                                    <div className="flex-1 text-right cursor-pointer">
                                        <Link title="Buy Now" onClick={onBuyNow} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span className="text-base text-yellow-500">SOLD</span>
                                </>
                            )}
                            <CheckoutModal
                                id={item.id}
                                title={item.meta.name}
                                isOpen={isCheckoutVisible}
                                onClose={setCheckoutVisible}
                                price={item.price}
                                successCallback={() => router.push(`/item/${item.id}`)}
                            />
                        </div>
                    </div>
                </div>
            </li>
        </Link>
    )
}
export default ProductCard
