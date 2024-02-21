import '../style/Modal.css'
import React, { CSSProperties } from 'react'
type ModalProps = {
    show: boolean
    children: React.ReactNode
}

const ModalComponent = React.memo((props: ModalProps, nextProps: ModalProps) => {
    const { show, children } = props
    console.log('rendering modal with show: ', show)
    const display = show ? 'block' : 'none'
    const ModalOuterDivCss: CSSProperties = {
        display: display,
    }

    return (
        <div className="modalOuter" style={ModalOuterDivCss}>
            <div className="modalBackground"></div>
            <div className="modalInner">{children}</div>
        </div>
    )
})

export default ModalComponent
