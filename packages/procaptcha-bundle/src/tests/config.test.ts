import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { getProcaptchaScript, extractParams } from '../util/config.js';

describe('Config utility functions', () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://example.com' });
    global.document = dom.window.document;
  });

  afterEach(() => {
    delete (global as any).document;
  });

  describe('getProcaptchaScript', () => {
    it('should return null when no matching script is found', () => {
      const result = getProcaptchaScript('nonexistent');
      expect(result).toBeNull();
    });

    it('should return the script element when a matching script is found', () => {
      const script = document.createElement('script');
      script.src = 'https://example.com/procaptcha.js';
      document.body.appendChild(script);

      const result = getProcaptchaScript('procaptcha');
      expect(result).toBe(script);
    });
  });

  describe('extractParams', () => {
    it('should return undefined values when no matching script is found', () => {
      const result = extractParams('nonexistent');
      expect(result).toEqual({ onloadUrlCallback: undefined, renderExplicit: undefined });
    });

    it('should extract parameters from the script URL', () => {
      const script = document.createElement('script');
      script.src = 'https://example.com/procaptcha.js?onload=onloadCallback&render=explicit';
      document.body.appendChild(script);

      const result = extractParams('procaptcha');
      expect(result).toEqual({ onloadUrlCallback: 'onloadCallback', renderExplicit: 'explicit' });
    });

    it('should return undefined for missing parameters', () => {
      const script = document.createElement('script');
      script.src = 'https://example.com/procaptcha.js?onload=onloadCallback';
      document.body.appendChild(script);

      const result = extractParams('procaptcha');
      expect(result).toEqual({ onloadUrlCallback: 'onloadCallback', renderExplicit: undefined });
    });

    it('should handle scripts without query parameters', () => {
      const script = document.createElement('script');
      script.src = 'https://example.com/procaptcha.js';
      document.body.appendChild(script);

      const result = extractParams('procaptcha');
      expect(result).toEqual({ onloadUrlCallback: undefined, renderExplicit: undefined });
    });
  });
});