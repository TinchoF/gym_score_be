/**
 * Logger Utility Tests
 * Verifies conditional logging behavior based on NODE_ENV
 */

import logger from './logger';

describe('Logger Utility', () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe('logger.debug', () => {
    it('should log in development mode', () => {
      process.env.NODE_ENV = 'development';
      // Need to re-require to pick up env change
      jest.resetModules();
      const devLogger = require('./logger').default;
      
      devLogger.debug('test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should NOT log in production mode', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const prodLogger = require('./logger').default;
      
      prodLogger.debug('test message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('logger.info', () => {
    it('should always log regardless of environment', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const prodLogger = require('./logger').default;
      
      prodLogger.info('important info');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('logger.error', () => {
    it('should always log errors', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const prodLogger = require('./logger').default;
      
      prodLogger.error('error message');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
