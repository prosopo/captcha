import { 
  Component, 
  ElementRef, 
  EventEmitter, 
  Input, 
  NgZone, 
  OnDestroy, 
  OnInit, 
  Output, 
  ViewChild 
} from '@angular/core';
import { ProcaptchaService } from './procaptcha.service';
import { ProcaptchaConfig } from './procaptcha.types';

declare global {
  interface Window {
    procaptchaOnLoad: () => void;
  }
}

@Component({
  selector: 'prosopo-captcha',
  template: `<div #captchaContainer class="procaptcha-container"></div>`,
  styles: [`.procaptcha-container { min-height: 78px; }`],
  standalone: true
})
export class ProcaptchaComponent implements OnInit, OnDestroy {
  @ViewChild('captchaContainer', { static: true }) captchaContainer!: ElementRef;
  
  @Input() siteKey!: string;
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() captchaType: string = 'image';
  @Input() size: 'normal' | 'compact' = 'normal';
  @Input() tabIndex: number = 0;
  
  @Output() verified = new EventEmitter<string>();
  @Output() expired = new EventEmitter<void>();
  @Output() failed = new EventEmitter<void>();
  @Output() loaded = new EventEmitter<void>();
  
  private widgetId: string | null = null;
  private scriptLoaded = false;
  
  constructor(
    private procaptchaService: ProcaptchaService,
    private zone: NgZone
  ) {}
  
  ngOnInit(): void {
    if (!this.siteKey) {
      throw new Error('ProcaptchaComponent: siteKey is required');
    }
    
    this.loadProcaptchaScript();
  }
  
  ngOnDestroy(): void {
    this.reset();
  }
  
  /**
   * Gets the response token from the captcha
   */
  getResponse(): string | null {
    return this.procaptchaService.getResponse(this.widgetId);
  }
  
  /**
   * Resets the captcha
   */
  reset(): void {
    if (this.widgetId) {
      this.procaptchaService.reset(this.widgetId);
    }
  }
  
  /**
   * Loads the Procaptcha script and initializes the captcha
   */
  private loadProcaptchaScript(): void {
    if (this.scriptLoaded) {
      this.renderCaptcha();
      return;
    }
    
    window.procaptchaOnLoad = () => {
      this.zone.run(() => {
        this.scriptLoaded = true;
        this.loaded.emit();
        this.renderCaptcha();
      });
    };
    
    this.procaptchaService.loadScript().then(() => {
      // Script loaded, will call procaptchaOnLoad
    }).catch((error: Error) => {
      console.error('Error loading Procaptcha script:', error);
    });
  }
  
  /**
   * Renders the captcha in the container
   */
  private renderCaptcha(): void {
    if (!this.scriptLoaded) {
      return;
    }
    
    const params: ProcaptchaConfig = {
      siteKey: this.siteKey,
      theme: this.theme,
      captchaType: this.captchaType,
      size: this.size,
      tabindex: this.tabIndex,
      callback: (token: string) => {
        this.zone.run(() => {
          this.verified.emit(token);
        });
      },
      'expired-callback': () => {
        this.zone.run(() => {
          this.expired.emit();
        });
      },
      'failed-callback': () => {
        this.zone.run(() => {
          this.failed.emit();
        });
      }
    };
    
    this.widgetId = this.procaptchaService.render(this.captchaContainer.nativeElement, params);
  }
} 