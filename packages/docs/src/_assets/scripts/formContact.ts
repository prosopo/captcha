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
export const CONTACT_FORM_ID = 'contact-form'

document.addEventListener('DOMContentLoaded', () => {
    window.hiddenElemDisplay = {}
    const contactForm = getForm(CONTACT_FORM_ID)
    contactForm.addEventListener('submit', (event) => {
        const originUrl = window.location.href
        submitForm(event, CONTACT_FORM_ID, 'contact-loader', 'contact-success', 'contact-error', 'contact', 'Contact', originUrl).then(
            (result) => {
                window.loader = false
                const contactHeader = document.getElementById('contact-header')
                if(contactHeader && result.success) {
                    contactHeader.textContent = 'Thank you for reaching out!'
                }
            }
        )
    })
})
export {}
