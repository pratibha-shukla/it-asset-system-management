// Vitest / Testing Library global setup
import '@testing-library/jest-dom';

// Silence console.error spam from expected prop-type warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
    originalError(...args);
  };
});
afterAll(() => { console.error = originalError; });
