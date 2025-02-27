import { isPlatformBrowser } from '@angular/common';
// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { ProcaptchaConfig } from './procaptcha.types';

declare global {
  interface Window {
    procaptcha: {
      render: (element: HTMLElement, params: ProcaptchaConfig) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string | null) => string | null;
    };
    procaptchaOnLoad: () => void;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ProcaptchaService {
  private readonly SCRIPT_URL = 'https://js.prosopo.io/js/procaptcha.bundle.js';
  private scriptPromise: Promise<void> | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Loads the Procaptcha script
   */
  loadScript(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = this.SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.id = 'procaptcha-script';
      
      script.onload = () => {
        resolve();
        if (typeof window.procaptchaOnLoad === 'function') {
          window.procaptchaOnLoad();
        }
      };
      
      script.onerror = (event: Event | string) => {
        reject(event);
      };
      
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }

  /**
   * Renders the captcha in the specified element
   */
  render(element: HTMLElement, params: ProcaptchaConfig): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    if (!window.procaptcha || !window.procaptcha.render) {
      console.error('Procaptcha script not loaded yet');
      return '';
    }

    return window.procaptcha.render(element, params);
  }

  /**
   * Resets the captcha with the specified widget ID
   */
  reset(widgetId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!window.procaptcha || !window.procaptcha.reset) {
      console.error('Procaptcha script not loaded yet');
      return;
    }

    window.procaptcha.reset(widgetId);
  }

  /**
   * Gets the response token from the captcha
   */
  getResponse(widgetId: string | null): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    if (!window.procaptcha || !window.procaptcha.getResponse) {
      console.error('Procaptcha script not loaded yet');
      return null;
    }

    return window.procaptcha.getResponse(widgetId);
  }
} 