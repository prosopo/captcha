import { FeaturesEnum } from '@prosopo/types';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import { getCaptchaType } from '../util/captchaType.js';

describe('getCaptchaType', () => {
      beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document;
  });
  it('should return the correct captcha type when a valid type is set', () => {
    const element = document.createElement('div');
    element.setAttribute('data-captcha-type', FeaturesEnum.Pow);
    
    const result = getCaptchaType([element]);
    
    expect(result).toBe(FeaturesEnum.Pow);
  });

  it('should return "frictionless" when no captcha type is set', () => {
    const element = document.createElement('div');
    
    const result = getCaptchaType([element]);
    
    expect(result).toBe('frictionless');
  });

  it('should return "frictionless" when an invalid captcha type is set', () => {
    const element = document.createElement('div');
    element.setAttribute('data-captcha-type', 'invalid-type');
    
    const result = getCaptchaType([element]);
    
    expect(result).toBe('frictionless');
  });

  it('should work with all valid FeaturesEnum values', () => {
    const element = document.createElement('div');
    
    Object.values(FeaturesEnum).forEach(feature => {
      element.setAttribute('data-captcha-type', feature);
      const result = getCaptchaType([element]);
      expect(result).toBe(feature);
    });
  });
});