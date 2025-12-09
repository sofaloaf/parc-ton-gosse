/**
 * Simple logger utility
 */

export const logger = {
  info: (...args) => console.log('ℹ️ ', ...args),
  success: (...args) => console.log('✅', ...args),
  warning: (...args) => console.warn('⚠️ ', ...args),
  error: (...args) => console.error('❌', ...args),
  debug: (...args) => {
    if (process.env.DEBUG === 'true') {
      console.log('🔍', ...args);
    }
  }
};

