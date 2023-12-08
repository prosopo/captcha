import React, { useMemo } from 'react'
import styled from '@emotion/styled'

type ModalProps = {
    show: boolean
    children: React.ReactNode
}

const ModalComponent = React.memo(
    (props: ModalProps, nextProps: ModalProps) => {
        const show = useMemo(() => props.show, [show])
        const children = useMemo(() => props.children, [children])
        console.log('rendering modal with show: ', show)
        const showHideClassName = show ? 'modal display-block' : 'modal display-none'
        const ModalDiv = styled.div`
            .modal {
                overflow: auto;
                width: 100%;
                max-width: 500px;
                max-height: 100%;
                position: fixed;
                top: 0;
                left: 0;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                z-index: 2147483646;
                transition: all 0.5s;
            }

            .modal-main {
                position: fixed;
                background: white;
                height: auto;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 2147483647;
                transition: all 0.5s;
            }

            .display-block {
                display: block;
            }

            .display-none {
                display: none;
            }
        `
        return (
            <ModalDiv className={showHideClassName}>
                <section className="modal-main">{children}</section>
            </ModalDiv>
        )
    }
    // (prevProps, nextProps): boolean => {
    //     return prevProps.show === nextProps.show
    // }
)

export default ModalComponent
