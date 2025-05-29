// Import jest-dom additions for DOM element assertions
import '@testing-library/jest-dom';

// Mock browser APIs that are not available in Jest
// This helps when testing components that use these APIs
if (typeof window !== 'undefined') {
  // Mock idle callback
  window.requestIdleCallback = (cb) => {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  };
  
  window.cancelIdleCallback = (id) => {
    clearTimeout(id);
  };
  
  // Mock IntersectionObserver
  window.IntersectionObserver = class IntersectionObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      return null;
    }
    unobserve() {
      return null;
    }
    disconnect() {
      return null;
    }
  };

  // Mock ResizeObserver
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Suppress React 18 console errors/warnings
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    /Warning.*not wrapped in act/i.test(args[0]) ||
    /Warning: ReactDOM.render is no longer supported/i.test(args[0]) ||
    /Warning: An update to .* inside a test was not wrapped in act/i.test(args[0])
  ) {
    return;
  }
  originalConsoleError(...args);
};
