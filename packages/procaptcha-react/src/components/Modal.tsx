// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow:
            'rgba(0, 0, 0, 0.2) 0px 11px 15px -7px, rgba(0, 0, 0, 0.14) 0px 24px 38px 3px, rgba(0, 0, 0, 0.12) 0px 9px 46px 8px,',
    }

    return (
        <div className="modalOuter" style={ModalOuterDivCss}>
            <div className="modalBackground" style={ModalBackgroundCSS}></div>
            <div className="modalInner" style={ModalInnerDivCSS}>
                {children}
            </div>
        </div>
    )
})

export default ModalComponent
