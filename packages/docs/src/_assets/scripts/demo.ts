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
const EVENT_DEFS = [
    'click',
    'touchstart',
    'mousemove',
    'touchmove',
    'touchend',
    'mouseup',
    'mousedown',
    'touchcancel',
    'keydown',
    'keyup',
    'keypress',
    'scroll',
    'resize',
    'focus',
    'blur',
    'change',
    'submit',
    'reset',
    'select',
    'contextmenu',
    'dblclick',
    'wheel',
    'drag',
    'dragstart',
    'dragend',
    'dragover',
    'dragenter',
    'dragleave',
]

type progressGradient = {
    max: number;
    min: number;
    direction: number;
}

// extend the global Window interface to include the procaptcha object
declare global {
    interface Window {
        resizeScrolling: boolean;
        progressGradient: progressGradient;
        progressEventCount: number;
    }
}



document.addEventListener('DOMContentLoaded', () => {
    resetScroll({ duration: 500 });
    for (const eventName of EVENT_DEFS) {
        addEventListener(eventName, handleEvent)
        addEventListener(eventName, handleEventGradient)
    }
    window.progressGradient = {
        direction : 1,
        min : 50,
        max : 100,
    };
    window.progressEventCount = 0;
});

const resetScroll = ({ duration = 1000 }: { duration?: number }) => {
    window.resizeScrolling = true;  // set the flag to true when resizing triggers scrolling
    window.scroll({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        window.resizeScrolling = false;
    }, duration);
}

const getMaxEvents = () => {
    return 5
}

const getDemoSection = () => {
    const getSection = document.getElementById('demo-section');
    if (getSection) {
        return getSection;
    }
    throw new Error('Demo section not found');
}

const getCaptchaCheckBox = () => {
    const checkbox = document.getElementById("procaptchaCheckbox");
    if (checkbox) {
        return checkbox as HTMLInputElement;
    }
    throw new Error('Captcha checkbox not found');
}

const updateDemoSectionGradient = () => {

    const demoSection = getDemoSection()
    const oldValue = Number(demoSection.style.background.split(' ').slice(-1)[0].replace('%)', ''))
    window.progressGradient.direction = oldValue > window.progressGradient.max ? -1 : oldValue < window.progressGradient.min ? 1 : window.progressGradient.direction
    const appliedValue = oldValue + window.progressGradient.direction
    requestAnimationFrame(() =>demoSection.style.background = `radial-gradient(circle, rgba(78,67,159,96) 0%, rgba(235,66,126,100) ${appliedValue}%)`)

}

const handleEventGradient = () => {
    window.progressEventCount++;
    if (window.progressEventCount % 2 === 0) {
        updateDemoSectionGradient();
    }
    return void 0;
}

const handleEvent = () => {
    const spinner = <HTMLDivElement | null>document.getElementById('procaptchaLoadingSpinner');
    if ( spinner) {
        const maxEvents = getMaxEvents();
        const getCheckboxElement = getCaptchaCheckBox(); // get checkbox element
        if (window.progressEventCount > maxEvents) {
            setTimeout(() => {
                getCheckboxElement.disabled = true;
                getCheckboxElement.style.cssText = "cursor: pointer;";
                window.checkBox('procaptcha-demo');
                removeEventListeners();
              }, 100);
        } else {
             // disable the checkbox while the progress bar is in progress
             getCheckboxElement.disabled = true;
             getCheckboxElement.style.cssText = "cursor: not-allowed; background-color: rgb(227 227 227);";
             getCheckboxElement.style.display = 'none';
             spinner.style.display = 'flex';
             spinner.classList.remove('invisible');
        }
    }
    return void 0
}

const removeEventListeners = () => {
    for (const eventDef of EVENT_DEFS) {
        removeEventListener(eventDef, handleEvent)
    }

    const demoSection = getDemoSection();
    demoSection.classList.add('animate-fade');
}

export {};
