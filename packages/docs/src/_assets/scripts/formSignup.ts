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
import {getForm, submitForm} from "./formSubmit";

declare global {
    interface Window {
        loader: boolean
        hiddenElemDisplay: { [key: string]: string }
    }
}

export const SIGNUP_FORM_ID = 'signup-form'

document.addEventListener('DOMContentLoaded', () => {
    window.hiddenElemDisplay = {}
    const contactForm = getForm(SIGNUP_FORM_ID)
    const originUrl = window.location.href
    contactForm.addEventListener('submit', (event) => {
        submitForm(event, SIGNUP_FORM_ID, 'signup-loader', 'signup-success', 'signup-error', 'subscribe', 'Signup', originUrl).then(
            () => {
                window.loader = false
            }
        )
    })
})
export {}
