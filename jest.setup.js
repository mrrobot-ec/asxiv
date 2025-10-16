import '@testing-library/jest-dom';
import React from 'react';

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
}

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...rest }) =>
    React.createElement('img', { src, alt, ...rest })
}));
