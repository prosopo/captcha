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
import { useEffect, useState } from 'react'

const addHoneypotField = (form: HTMLFormElement, honeypotName: string, setHoneypotValue: (value: string) => void) => {
    const honeypotField = document.createElement('input')
    honeypotField.type = 'text'
    honeypotField.name = honeypotName
    honeypotField.id = honeypotName
    honeypotField.style.position = 'absolute'
    honeypotField.style.left = '-9999px'
    honeypotField.style.width = '70px'
    honeypotField.style.height = '20px'
    honeypotField.autocomplete = 'on'
    honeypotField.tabIndex = -1
    honeypotField.onchange = (e) => {
        const target = e.target as HTMLInputElement
        setHoneypotValue(target.value)
    }

    form.appendChild(honeypotField)
}

export const Honeypot = () => {
    const [honeypotValue, setHoneypotValue] = useState<string>('')
    const commonFields = [
        'firstname',
        'lastname',
        'fullname',
        'name',
        'email',
        'password',
        'age',
        'birthday',
        'date',
        'address',
        'tel_number',
    ]

    const processForm = (form: HTMLFormElement) => {
        const inputArray = Array.from(form.querySelectorAll('input'))
        for (const commonField of commonFields) {
            if (!inputArray.some((input) => input.name === commonField || input.id === commonField)) {
                addHoneypotField(form, commonField, setHoneypotValue)
                break
            }
        }
    }

    useEffect(() => {
        const forms = Array.from(document.getElementsByTagName('form'))
        forms.forEach(processForm)
    }, [])

    return honeypotValue
}
