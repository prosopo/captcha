/**
 * Procaptcha configuration options
 */
export interface ProcaptchaConfig {
  /**
   * Your Prosopo site key
   */
  siteKey: string;
  
  /**
   * The theme of the captcha
   */
  theme?: 'light' | 'dark';
  
  /**
   * The type of captcha to display
   */
  captchaType?: string;
  
  /**
   * The size of the captcha
   */
  size?: 'normal' | 'compact';
  
  /**
   * The tabindex of the captcha
   */
  tabindex?: number;
  
  /**
   * Callback function called when the captcha is verified
   */
  callback?: (token: string) => void;
  
  /**
   * Callback function called when the captcha token expires
   */
  'expired-callback'?: () => void;
  
  /**
   * Callback function called when the captcha verification fails
   */
  'failed-callback'?: () => void;
} 