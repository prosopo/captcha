import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha-react <https://github.com/prosopo-io/procaptcha-react>.
//
// procaptcha-react is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha-react is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha-react.  If not, see <http://www.gnu.org/licenses/>.
import { useEffect, useContext, useReducer } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ProsopoCaptchaStateClient, captchaStateReducer } from "@prosopo/procaptcha";
import { CaptchaContextManager } from "./CaptchaManager";
import { CaptchaWidget } from "./CaptchaWidget";
import { useStyles } from "../styles";
export function CaptchaComponent({ clientInterface }) {
    const classes = useStyles();
    const manager = useContext(CaptchaContextManager);
    const [state, update] = useReducer(captchaStateReducer, { captchaIndex: 0, captchaSolution: [] });
    const { account, contractAddress } = manager.state;
    const { captchaChallenge, captchaIndex, captchaSolution } = state;
    const totalCaptchas = captchaChallenge?.captchas.length ?? 0;
    const stateClientInterface = new ProsopoCaptchaStateClient(clientInterface, { state, update });
    useEffect(() => {
        clientInterface.onLoad();
    }, []);
    useEffect(() => {
        const extension = clientInterface.getExtension();
        if (contractAddress && extension) {
            extension.setDefaultAccount();
            const defaultAccount = extension.getAccount();
            if (defaultAccount) {
                clientInterface.onAccountChange(defaultAccount);
            }
        }
    }, [contractAddress]);
    useEffect(() => {
        if (account && !captchaChallenge) {
            stateClientInterface.onLoadCaptcha()
                .catch(error => {
                clientInterface.status.update({ error });
            });
        }
    }, [account]);
    // https://www.npmjs.com/package/i18next
    return (_jsx(Box, { className: classes.root, children: account && captchaChallenge &&
            _jsxs(Box, { className: classes.captchasContainer, children: [_jsx(Box, { className: classes.captchasHeader, children: _jsxs(Typography, { className: classes.captchasHeaderLabel, children: ["Select all images containing a ", captchaChallenge.captchas[captchaIndex].captcha.target] }) }), _jsxs(Box, { className: classes.captchasBody, children: [_jsx(CaptchaWidget, { challenge: captchaChallenge.captchas[captchaIndex], solution: captchaSolution[captchaIndex] || [], onChange: stateClientInterface.onChange.bind(stateClientInterface) }), _jsx(Box, { className: classes.dotsContainer, children: captchaChallenge?.captchas.map((_, index) => _jsx(Box, { className: captchaIndex === index ? classes.dot : classes.dotActive }, index)) })] }), _jsxs(Box, { className: classes.captchasFooter, children: [_jsx(Button, { onClick: () => stateClientInterface.onCancel(), variant: "text", children: "Cancel" }), _jsx(Button, { onClick: () => stateClientInterface.onSubmit(), variant: "contained", children: captchaIndex + 1 < totalCaptchas ? "Next" : "Submit" })] })] }) }));
}
export default CaptchaComponent;
//# sourceMappingURL=CaptchaComponent.js.map