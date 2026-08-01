import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

// The one and only test. It proves the app renders. That's it.

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})) // never resolves: panels stay in loading state
  );
});

test('app renders the mission control shell', () => {
  render(<App />);
  expect(screen.getByText(/Establishing uplink/i)).toBeTruthy();
  expect(screen.getByText(/training playground/i)).toBeTruthy();
});
