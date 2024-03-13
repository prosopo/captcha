import React, { type CSSProperties } from 'react'
type ModalProps = {
    show: boolean
    children: React.ReactNode
}

const ModalComponent = React.memo((props: ModalProps, nextProps: ModalProps) => {
    const { show, children } = props
    const display = show ? 'block' : 'none'
    const ModalOuterDivCss: CSSProperties = {
        position: 'fixed',
        zIndex: 2147483646,
        inset: 0,
        display,
    }

    const ModalBackgroundCSS: CSSProperties = {
        position: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        right: 0,
        bottom: 0,
        top: 0,
        left: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: -1,
    }
    const ModalInnerDivCSS: CSSProperties = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        backgroundColor: 'rgb(255, 255, 255)',
        border: 'none',
        boxShadow:
            'rgba(0, 0, 0, 0.2) 0px 11px 15px -7px, rgba(0, 0, 0, 0.14) 0px 24px 38px 3px, rgba(0, 0, 0, 0.12) 0px 9px 46px 8px,',
    }

    return (
        <div className='modalOuter' style={ModalOuterDivCss}>
            <div className='modalBackground' style={ModalBackgroundCSS} />
            <div className='modalInner' style={ModalInnerDivCSS}>
                {children}
            </div>
        </div>
    )
})

export default ModalComponent
