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
import {ProcaptchaOutput} from '@prosopo/types'

// extend the global Window interface to include the various handlers
declare global {
    interface Window {
        onCaptchaHuman: (payload: ProcaptchaOutput, formId: string) => void
        onCaptchaFailed: () => void
        onCaptchaError: () => void
        onCaptchaExpired: () => void
        onCaptchaClose: () => void
        onCaptchaChalexpired: () => void
        onCaptchaOpen: () => void
        checkForm: (formId: string, fieldsTypes?: { id: string, type: string }[], procaptchaContainer?: string) => void
        checkBox: (formId: string) => void
        onClickFormElement: (el: HTMLInputElement) => void,
        plausible: (event: string, props?: any) => void
    }
}

window.onCaptchaHuman = async function (payload, formId) {
    // get form
    const form = document.getElementById(formId)
    // add a listener to the onSubmit event of the form
    if (form) {
        // add the payload to the form
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = 'procaptcha-response'
        input.value = JSON.stringify(payload)
        form.appendChild(input)
        // recheck the form and enable the submit button if everything is filled
        window.checkForm(formId)
    }

    // submit onHuman event
    window.plausible('Captcha Success', { props: { payload } })
}

window.onCaptchaFailed = function () {
    // submit onFailed event
    window.plausible('Captcha Failed')
}

window.onCaptchaError = function () {
    // submit onError event
    window.plausible('Captcha Error')
}

window.onCaptchaExpired = function () {
    // submit onExpired event
    window.plausible('Captcha Expired')
    window.location.reload()
}

window.onCaptchaClose = function () {
    // submit onClose event
    window.plausible('Captcha Close')
}

window.onCaptchaChalexpired = function () {
    // submit onChalexpired event
    window.plausible('Captcha Challenge Expired')
}

window.onCaptchaOpen = function () {
    // submit onOpen event
    window.plausible('Captcha Open')
}

// email validator
const validateEmail = function (email) {
    const re = /\S[^\s@]*@\S+\.\S+/
    return re.test(email)
}

// url validator
const validateUrl = function (url) {
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const re = /^(?:https?:\/\/)?[\da-z.-]+\.[a-z.]{2}[/\w .-]*$/
    return re.test(url)
}

// Check the form elements are all filled before enabling the submit button
window.checkForm = function (formId, fieldsTypes, procaptchaContainerClass='.procaptcha' ) {
    const form = document.getElementById(formId)
    if(form) {
        if(typeof(fieldsTypes) === "undefined") {
            fieldsTypes = [
                { id: 'email', type: 'email' },
                { id: 'url', type: 'url' },
            ]
        }

        const inputs = <HTMLInputElement[]>Array.from(form.getElementsByTagName('INPUT'))
        const submit = document.querySelector('button[type="submit"]')
        const isFilled = inputs.every((input) => input.value.length > 0)
        let isValid = false
        for (const field of fieldsTypes) {
            const input: HTMLInputElement | null = <HTMLInputElement>document.getElementById(field.id)
            if (input) {
                isValid = field.type === 'email' ? validateEmail(input.value) : field.type === 'url' ? validateUrl(input.value) : true
                if (!isValid) {
                    break
                }
            }
        }
        const procaptchaCheckbox = form.querySelector(procaptchaContainerClass)?.querySelector('input')
        if(procaptchaCheckbox) {
            const isHumanChecked = procaptchaCheckbox.checked
            console.log("checked", procaptchaCheckbox.checked)
            console.log(procaptchaCheckbox.getAttribute('checked'))
            // Disabled logic commented out until bug is fixed
            // submit.disabled = !(isFilled && isValid)
        }
    }
}

window.checkBox = function (formId) {
    const checkbox = <HTMLInputElement | null>document.getElementById('procaptchaCheckbox')
    const spinner = <HTMLDivElement | null>document.getElementById('procaptchaLoadingSpinner')
    if(checkbox && spinner) {
        checkbox.style.display = 'none'
        spinner.style.display = 'flex'
        spinner.classList.remove('invisible')
        spinner.classList.remove('w-0')
        // wait 2000ms then hide the spinner and show the checkbox, checking the checkbox
        setTimeout(() => {
            // set the checked property
            checkbox.style.display = 'flex'
            checkbox.setAttribute('checked', 'checked')
            checkbox.style.setProperty('display', 'flex', 'important')
            checkbox.style.setProperty('appearance', 'auto', 'important')
            spinner.style.display = 'none'
            spinner.classList.add('invisible')
            spinner.classList.add('w-0')
            checkbox.checked = true
            window.checkForm(formId)
        }, 2000)
    }
}

window.onClickFormElement = function (el) {
    window.plausible(`Click ${el.name[0].toUpperCase()}${el.name.slice(1)}`)
}

export {};
