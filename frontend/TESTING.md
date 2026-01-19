# Testing Documentation

This document describes the testing infrastructure and how to write and run tests for the frontend application.

## Testing Stack

- **Vitest** - Unit testing framework (works seamlessly with Vite)
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom DOM matchers
- **@testing-library/user-event** - User interaction simulation
- **jsdom** - DOM environment for tests

## Running Tests

### Watch Mode (Development)
```bash
npm test
```
Runs tests in watch mode, automatically re-running when files change.

### Single Run
```bash
npm run test:run
```
Runs all tests once and exits.

### UI Mode
```bash
npm run test:ui
```
Opens Vitest UI in the browser for interactive test running and debugging.

### Coverage Report
```bash
npm run test:coverage
```
Runs tests and generates a coverage report in multiple formats (text, HTML, JSON).

## Test File Organization

Test files should be placed next to the files they test, using one of these naming conventions:
- `*.test.ts` or `*.test.tsx` - Unit and component tests
- `*.spec.ts` or `*.spec.tsx` - Alternative naming convention

Example:
```
src/
  components/
    AlbumGrid/
      AlbumGrid.tsx
      AlbumGrid.test.tsx
  utils/
    dataLoader.ts
    dataLoader.test.ts
```

## Writing Tests

### Component Tests

Use the custom `render` function from `test-utils.tsx`:

```typescript
import { render, screen } from '@/test-utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Unit Tests

For utility functions, import directly:

```typescript
import { describe, it, expect } from 'vitest';
import { myUtility } from './myUtility';

describe('myUtility', () => {
  it('does something', () => {
    expect(myUtility('input')).toBe('output');
  });
});
```

### Async Testing

Use `waitFor` for async operations:

```typescript
import { render, screen, waitFor } from '@/test-utils';

it('loads data asynchronously', async () => {
  render(<AsyncComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### Mocking Fetch

The test setup includes a global `fetch` mock. Use it like this:

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => mockData,
  } as Response);
});
```

### User Interactions

Use `userEvent` for simulating user interactions:

```typescript
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';

it('handles button click', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  await user.click(screen.getByRole('button'));
  expect(screen.getByText('Clicked')).toBeInTheDocument();
});
```

## Mock Data

Mock data is located in `src/__mocks__/mockData.ts`. This file contains:

- `mockAlbum` - Example album item
- `mockPhoto` - Example photo item
- `mockChildren` - Array of mixed albums and photos
- `mockAlbums` - Array of albums only
- `mockPhotos` - Array of photos only
- `mockEmptyChildren` - Empty array for testing empty states

All mock data matches the `Child` interface structure from the root `types.ts`.

Example usage:

```typescript
import { mockChildren, mockAlbum } from '@/__mocks__/mockData';

it('displays albums', () => {
  render(<AlbumGrid albums={mockChildren} />);
  expect(screen.getByText(mockAlbum.title)).toBeInTheDocument();
});
```

## Test Utilities

### Custom Render Function

The `test-utils.tsx` file exports a custom `render` function that can be extended with providers (Theme, Router, etc.) as needed. Currently, it's a simple wrapper around React Testing Library's render, but it's designed to be extensible.

### Available Utilities

All utilities from `@testing-library/react` are re-exported from `test-utils.tsx`:
- `render` - Custom render function
- `screen` - Screen queries
- `waitFor` - Async waiting utilities
- `userEvent` - User interaction simulation
- And all other React Testing Library utilities

## Code Coverage

Coverage reports are generated in multiple formats:
- **Text** - Console output
- **HTML** - Interactive HTML report (in `coverage/` directory)
- **JSON** - Machine-readable format

Coverage excludes:
- `node_modules/`
- `dist/`
- Type definition files
- Config files
- Test files and mocks

## Testing Patterns

### Component Rendering
- Test that components render without errors
- Test that expected content is displayed
- Test conditional rendering based on props/state

### User Interactions
- Test button clicks, form submissions
- Test keyboard navigation
- Test accessibility features

### Async Operations
- Test loading states
- Test error states
- Test successful data loading
- Mock fetch/API calls appropriately

### Edge Cases
- Test empty states
- Test error boundaries
- Test invalid input handling
- Test boundary conditions

## Best Practices

1. **Test behavior, not implementation** - Focus on what users see and do, not internal implementation details
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Keep tests simple** - Each test should verify one thing
4. **Use descriptive test names** - Test names should clearly describe what is being tested
5. **Mock external dependencies** - Mock fetch, localStorage, etc.
6. **Clean up after tests** - The setup file handles cleanup automatically
7. **Test accessibility** - Use semantic queries that encourage accessible code

## Path Aliases in Tests

Path aliases configured in `vite.config.ts` work in tests:
- `@/components` → `src/components`
- `@/utils` → `src/utils`
- `@/types` → `src/types`
- `@/hooks` → `src/hooks`
- `@/pages` → `src/pages`
- `@/styles` → `src/styles`
- `@/contexts` → `src/contexts`
- `@/` → `src/`

## CI/CD Considerations

For CI/CD pipelines, use:
```bash
npm run test:run -- --coverage
```

This runs tests once with coverage reporting, suitable for automated builds.

## Troubleshooting

### Tests not finding modules
- Ensure path aliases are correctly configured in `vitest.config.ts`
- Check that test files are included in `tsconfig.json`

### fetch is not defined
- The test setup file mocks `fetch` globally
- If issues persist, check `src/test/setup.ts`

### Type errors in tests
- Ensure `vitest/globals` and `@testing-library/jest-dom` are in `tsconfig.json` types
- Check that test files are included in TypeScript compilation
