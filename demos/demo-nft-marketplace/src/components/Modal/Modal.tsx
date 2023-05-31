import { Dialog, Transition } from '@headlessui/react'
import React, { Fragment } from 'react'

export type ModalProps = {
    title: string
    description: string
    isOpen: boolean
    onClose?: () => void
    children?: React.ReactNode
    large?: boolean
}

function Modal({ isOpen, onClose, title, description, children, large }: ModalProps) {
    return isOpen ? (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={onClose}>
                <div className="min-h-screen px-4 text-center">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0" />
                    </Transition.Child>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span className="inline-block h-screen align-middle" aria-hidden="true">
                        &#8203;
                    </span>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <div
                            className={`inline-block w-full ${
                                large ? 'max-w-screen-md' : 'max-w-md'
                            } px-6 py-8 my-8 overflow-hidden text-left align-middle transition-all transform border-2 border-gray-700 rounded-md shadow-2xl bg-secondary`}
                        >
                            <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-white">
                                {title}
                            </Dialog.Title>
                            <div className="mt-4">
                                <p className="text-sm font-semibold text-white">{description}</p>
                            </div>
                            <div className="mt-4">{children}</div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    ) : null
}
export default Modal
