# Admin Dashboard Testing Guide

## Overview

This guide provides comprehensive instructions for running, writing, and maintaining tests for the Admin Dashboard feature. The test suite covers unit tests, integration tests, end-to-end tests, and accessibility testing.

## Test Structure

```
tests/admin-dashboard/
├── TEST_PLAN.md                    # Overall testing strategy
├── TESTING_GUIDE.md                # This file
├── setup/
│   └── test-setup.ts               # Common test utilities and configuration
├── unit/
│   ├── admin-dashboard-page.test.tsx    # Component unit tests
│   ├── dashboard-api.test.ts            # API route unit tests
│   └── dashboard-utils.test.ts          # Utility functions tests
├── integration/
│   └── dashboard-integration.test.tsx   # API-component integration tests
├── e2e/
│   └── dashboard-e2e.spec.ts           # End-to-end tests
└── accessibility/
    └── dashboard-accessibility.test.tsx # Accessibility compliance tests
```

## Running Tests

### Prerequisites

Ensure you have the required dependencies installed:

```bash
npm install
```

### Running All Dashboard Tests

```bash
# Run all dashboard tests
npm run test tests/admin-dashboard

# Run with coverage
npm run test:coverage tests/admin-dashboard

# Run in watch mode
npm run test:watch tests/admin-dashboard
```

### Running Specific Test Types

```bash
# Unit tests only
npm run test tests/admin-dashboard/unit

# Integration tests only
npm run test tests/admin-dashboard/integration

# E2E tests only
npm run test:e2e tests/admin-dashboard/e2e

# Accessibility tests only
npm run test tests/admin-dashboard/accessibility
```

### Running Individual Test Files

```bash
# Specific test file
npm run test tests/admin-dashboard/unit/admin-dashboard-page.test.tsx

# With specific test pattern
npm run test -- --testNamePattern="Authentication Flow"
```

## Test Environment Setup

### Local Development Setup

1. **Database Setup**
   ```bash
   # Setup test database
   npm run db:migrate
   npm run db:seed
   ```

2. **Environment Variables**
   Create a `.env.test` file with test-specific environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_test_service_key
   NODE_ENV=test
   ```

3. **Test Data**
   The test suite uses the seed data from `scripts/seed-data.ts`. You can customize this for your testing needs.

### CI/CD Setup

The tests are configured to run in GitHub Actions. Ensure your CI environment has:

- Node.js 18+
- Test database access
- Required environment variables
- Browser dependencies for E2E tests

## Writing Tests

### Test File Naming

- Unit tests: `*.test.tsx` or `*.test.ts`
- Integration tests: `*.test.tsx` or `*.test.ts`
- E2E tests: `*.spec.ts`
- Use descriptive names that indicate what's being tested

### Test Structure Best Practices

```typescript
describe('Feature Name', () => {
  // Setup and cleanup
  beforeEach(() => {
    // Test setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Specific Functionality', () => {
    it('should do something specific', () => {
      // Test implementation
    });

    it('should handle error case', () => {
      // Error testing
    });
  });
});
```

### Using Test Utilities

The test suite provides common utilities in `setup/test-setup.ts`:

```typescript
import { 
  createMockDashboardData, 
  testUtils, 
  mockImplementations 
} from '../setup/test-setup';

// Use mock data
const mockData = createMockDashboardData({ 
  active_games_count: 5 
});

// Use test utilities
await testUtils.waitForElement('.dashboard-grid');

// Use mock implementations
const mockRouter = mockImplementations.mockRouter;
```

## Test Categories

### Unit Tests

**Purpose**: Test individual components and functions in isolation.

**Coverage**:
- React component rendering
- State management
- Event handlers
- Utility functions
- API route handlers

**Example**:
```typescript
it('renders dashboard header correctly', () => {
  render(<AdminDashboardPage />);
  expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
});
```

### Integration Tests

**Purpose**: Test interaction between components and APIs.

**Coverage**:
- Component-API integration
- Data flow
- Error handling
- State synchronization

**Example**:
```typescript
it('loads and displays dashboard data from API', async () => {
  render(<AdminDashboardPage />);
  await waitFor(() => {
    expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
  });
});
```

### End-to-End Tests

**Purpose**: Test complete user workflows in a browser environment.

**Coverage**:
- Authentication flows
- User interactions
- Cross-page navigation
- Real browser behavior

**Example**:
```typescript
test('admin can login and view dashboard', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/dashboard/);
});
```

### Accessibility Tests

**Purpose**: Ensure the dashboard meets accessibility standards.

**Coverage**:
- ARIA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

**Example**:
```typescript
it('has no accessibility violations', async () => {
  const { container } = render(<AdminDashboardPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Common Testing Patterns

### Mocking API Calls

```typescript
// Mock successful API response
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: mockDashboardData }),
});

// Mock API error
global.fetch = jest.fn().mockResolvedValue({
  ok: false,
  status: 500,
});

// Mock network error
global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
```

### Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('handles button click', async () => {
  const user = userEvent.setup();
  render(<AdminDashboardPage />);
  
  const button = screen.getByLabelText('Crear nuevo partido');
  await user.click(button);
  
  expect(mockFunction).toHaveBeenCalled();
});
```

### Testing Async Operations

```typescript
it('shows loading state during data fetch', async () => {
  // Mock delayed response
  global.fetch = jest.fn().mockImplementation(
    () => new Promise(resolve => setTimeout(resolve, 100))
  );
  
  render(<AdminDashboardPage />);
  
  // Check for loading indicator
  expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  
  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('Dashboard Data')).toBeInTheDocument();
  });
});
```

### Testing Error States

```typescript
it('displays error message on API failure', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
  
  render(<AdminDashboardPage />);
  
  await waitFor(() => {
    expect(screen.getByText('Error al cargar datos')).toBeInTheDocument();
  });
});
```

## Performance Testing

### Measuring Render Performance

```typescript
it('renders efficiently with large datasets', async () => {
  const startTime = performance.now();
  
  render(<AdminDashboardPage />);
  await waitFor(() => {
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
  
  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(1000); // Should render in < 1s
});
```

### Memory Usage Testing

```typescript
it('does not have memory leaks', () => {
  const { unmount } = render(<AdminDashboardPage />);
  
  // Simulate component lifecycle
  unmount();
  
  // Check for cleanup (event listeners, timers, etc.)
  expect(/* cleanup verification */).toBeTruthy();
});
```

## Accessibility Testing

### Basic ARIA Testing

```typescript
it('has proper ARIA attributes', () => {
  render(<AdminDashboardPage />);
  
  expect(screen.getByRole('banner')).toBeInTheDocument(); // header
  expect(screen.getByRole('main')).toBeInTheDocument(); // main content
  expect(screen.getAllByRole('button')).toHaveLength.toBeGreaterThan(0);
});
```

### Keyboard Navigation Testing

```typescript
it('supports keyboard navigation', async () => {
  const user = userEvent.setup();
  render(<AdminDashboardPage />);
  
  // Tab through interactive elements
  await user.tab();
  expect(document.activeElement).toHaveAttribute('role', 'button');
  
  await user.tab();
  // Verify next element is focused
});
```

## Test Data Management

### Using Factories

```typescript
import { dataBuilders } from '../setup/test-setup';

const testGame = dataBuilders.game({
  title: 'Custom Test Game',
  max_players: 12,
});

const testRegistration = dataBuilders.registration({
  game_id: testGame.id,
  payment_status: 'pending',
});
```

### Seeded Test Data

The test suite uses consistent seed data for predictable testing:

```typescript
// Use predefined test data
const mockData = createMockDashboardData();

// Customize specific aspects
const customData = createMockDashboardData({
  active_games_count: 10,
  total_revenue_this_month: 100000,
});
```

## Debugging Tests

### Debugging Failed Tests

1. **Check Test Output**
   ```bash
   npm run test -- --verbose tests/admin-dashboard/unit/admin-dashboard-page.test.tsx
   ```

2. **Use Debug Mode**
   ```typescript
   import { screen, debug } from '@testing-library/react';
   
   // Debug rendered output
   debug();
   
   // Debug specific element
   debug(screen.getByTestId('dashboard-grid'));
   ```

3. **Check Console Output**
   ```typescript
   // Temporarily enable console output
   jest.spyOn(console, 'log').mockImplementation();
   ```

### Common Issues

1. **Timing Issues**
   ```typescript
   // Use waitFor for async operations
   await waitFor(() => {
     expect(screen.getByText('Expected Text')).toBeInTheDocument();
   });
   ```

2. **Mock Issues**
   ```typescript
   // Clear mocks between tests
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

3. **Environment Issues**
   ```typescript
   // Check environment setup
   beforeAll(() => {
     expect(process.env.NODE_ENV).toBe('test');
   });
   ```

## Continuous Integration

### GitHub Actions Configuration

```yaml
- name: Run Dashboard Tests
  run: |
    npm run test:unit tests/admin-dashboard
    npm run test:integration tests/admin-dashboard
    npm run test:e2e tests/admin-dashboard
```

### Coverage Requirements

The test suite aims for:
- Line Coverage: 90%
- Branch Coverage: 85%
- Function Coverage: 95%
- Statement Coverage: 90%

### Quality Gates

Tests must pass these criteria:
- No test failures
- Coverage thresholds met
- No accessibility violations
- Performance benchmarks met

## Maintenance

### Regular Tasks

1. **Update Test Data**
   - Review and update mock data quarterly
   - Ensure test data reflects current business logic

2. **Review Test Coverage**
   - Monthly coverage analysis
   - Identify and fill coverage gaps

3. **Performance Monitoring**
   - Track test execution time
   - Optimize slow tests

4. **Dependency Updates**
   - Keep testing libraries updated
   - Test compatibility with new versions

### Best Practices

1. **Keep Tests Simple**
   - Test one thing at a time
   - Use descriptive test names
   - Avoid complex test logic

2. **Maintain Test Data**
   - Use realistic test data
   - Keep data consistent across tests
   - Use factories for data generation

3. **Follow Patterns**
   - Use established testing patterns
   - Maintain consistent test structure
   - Share common utilities

4. **Document Changes**
   - Update tests when features change
   - Document test intentions
   - Maintain test documentation

## Resources

- [Testing Library Documentation](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Support

For questions about the test suite:
1. Check this documentation
2. Review existing test examples
3. Consult team members
4. Create issues for test infrastructure problems