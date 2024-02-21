import React, { CSSProperties } from 'react'

type ModalProps = {
    show: boolean
    children: React.ReactNode
}

const ModalComponent = React.memo((props: ModalProps, nextProps: ModalProps) => {
    const { show, children } = props
    console.log('rendering modal with show: ', show)
    const display = show ? 'flex' : 'none'
    const ModalOuterDivCss: CSSProperties = {
        overflow: 'auto',
        width: '100%',
        maxHeight: '100%',
        position: 'fixed',
        top: '0',
        left: '0',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: '2147483646',
        transition: 'all 0.5s',
        display: display,
    }
    const ModalInnerDivCSS: CSSProperties = {
        maxWidth: '500px',
        margin: 'auto',
        position: 'fixed',
        background: 'white',
        height: '100%',
        maxHeight: '100%',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '2147483647',
        transition: 'all 0.5s',
    }

    return (
        <div style={ModalOuterDivCss}>
            <div style={ModalInnerDivCSS}>{children}</div>
        </div>
    )
})

export default ModalComponent
