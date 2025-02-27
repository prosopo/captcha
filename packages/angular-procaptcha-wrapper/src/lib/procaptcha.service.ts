import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ProcaptchaConfig } from './procaptcha.types';

declare global {
  interface Window {
    render: (element: HTMLElement, params: ProcaptchaConfig) => string;
    reset: (widgetId: string) => void;
    getResponse: (widgetId: string | null) => string | null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ProcaptchaService {
  private readonly SCRIPT_URL = 'https://procaptcha.prosopo.io/procaptcha.bundle.js';
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
      script.type = 'text/javascript';
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

    if (!window.render) {
      console.error('Procaptcha script not loaded yet');
      return '';
    }

    return window.render(element, params);
  }

  /**
   * Resets the captcha with the specified widget ID
   */
  reset(widgetId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!window.reset) {
      console.error('Procaptcha script not loaded yet');
      return;
    }

    window.reset(widgetId);
  }

  /**
   * Gets the response token from the captcha
   */
  getResponse(widgetId: string | null): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    if (!window.getResponse) {
      console.error('Procaptcha script not loaded yet');
      return null;
    }

    return window.getResponse(widgetId);
  }
} 