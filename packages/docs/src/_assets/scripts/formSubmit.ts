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
// extend the global Window interface to include the various handlers
declare global {
    interface Window {
        hiddenElemDisplay: { [key: string]: string }
        loader: boolean
    }
}

function showElem(element: HTMLElement) {
    element.style.display = window.hiddenElemDisplay[element.id] || 'inherit'
    element.classList.remove('invisible')
    element.style.display = 'inherit'
}

function setElemText(id: string, text: string) {
    const elem = document.getElementById(id)
    if(elem) {
        const successMsgSpan = elem.querySelector('span')
        if(successMsgSpan) {
            successMsgSpan.innerHTML = text
            elem.classList.remove('invisible')
            elem.classList.remove('h-0')
        }
    }
}

function hideElem(element: HTMLElement) {
    if (!element) return
    window.hiddenElemDisplay[element.id] = getComputedStyle(element).display
    // since we set visibility to hidden in .njk files for first renders, we need to revert that here
    element.style.visibility = 'visible'
    element.style.display = 'none'
    element.classList.add('invisible')
}

function setEmailError(err: string, formErrorId: string) {
    const errorContainer = getFormElement(formErrorId)
    showElem(errorContainer)
    const errorMsgSpan = errorContainer.querySelector('span')
    if(errorMsgSpan) {
        errorMsgSpan.innerHTML = err
        errorContainer.classList.remove('h-0')
    }
}

export function getForm(formId: string) {
    const form = <HTMLFormElement | null>document.getElementById(formId)
    if(!form) {
        throw new Error('Signup form not found')
    }
    return form
}

function getFormSubmitButton(form: HTMLFormElement) {
    const submitButton = <HTMLButtonElement | null>form.querySelector('BUTTON[type="submit"]')
    if(!submitButton) {
        throw new Error('Submit button not found')
    }
    return submitButton
}

function getFormElement(elementId: string) {
    const formElement = document.getElementById(elementId)
    if(!formElement) {
        throw new Error(`Element not found: ${elementId}`)
    }
    return formElement
}

export const submitForm = async function (event: Event, formId: string, formLoaderId: string, formSuccessId: string, formErrorId: string, formFunction: string, analyticsEvent: string, originUrl: string) {
    event.preventDefault()
    const form = getForm(formId)
    const formSubmitButton = getFormSubmitButton(form)
    const formErrorElement = getFormElement(formErrorId)
    const formSuccessElement = getFormElement(formSuccessId)
    const formLoaderElement = getFormElement(formLoaderId)
    try {

        hideElem(formSubmitButton)
        hideElem(formErrorElement)
        hideElem(formSuccessElement)
        showElem(formLoaderElement)
        window.loader = true

        const inputs = <(HTMLInputElement|HTMLTextAreaElement)[]>Array.from(form.querySelectorAll('INPUT,TEXTAREA'))
        const formData: { [key: string]: string } = {}
        inputs.forEach((input) => {
            if (input.name.length > 0) {
                formData[input.name] = input.value
            }
        })

        // add current URL
        formData['originUrl'] = originUrl
        const res = await fetch(`/.netlify/functions/${formFunction}`, {
            body: JSON.stringify(formData),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        // 499 - set as Mongo error on backend
        if (res.status === 404 || res.status === 499) {
            throw new Error('Something went wrong! Please try again later!')
        }

        const json = await res.json()
        if (res.status !== 200) {
            throw new Error(json.error || json.message || 'Unknown error')
        }

        setElemText(formSuccessId, json.message)
        hideElem(formLoaderElement)
        showElem(formSuccessElement)

        // submit event
        window.plausible(analyticsEvent, {props: {email: formData.email}})

    } catch (err) {
        setEmailError(err.message || err['errorMessage'] || err['error'] || 'Unknown error', formErrorId)
        showElem(formSubmitButton)
        hideElem(formLoaderElement)
        return { success: false, error: err }
    }
    hideElem(formLoaderElement)
    return { success: true }
}


