# Performance Testing Scripts

This directory contains scripts to test navigation speed and data loading performance for the application.

## Available Scripts

### 1. Basic Performance Test (`performance-test.js`)

Tests page navigation and API response times using Node.js fetch API.

**Usage:**
```bash
npm run test:perf
```

**Environment Variables:**
- `TEST_BASE_URL` - Base URL for testing (default: `http://localhost:3000`)
- `TEST_COOKIES` - Cookie string for authenticated requests (optional)
- `TEST_AUTH_TOKEN` - Bearer token for API authentication (optional)

**Example:**
```bash
TEST_BASE_URL=http://localhost:3000 npm run test:perf
```

### 2. Browser Performance Test (`browser-performance-test.js`)

Tests page navigation using Puppeteer (if available) for more accurate browser-based metrics including:
- Total page load time
- DOM Content Loaded
- First Contentful Paint (FCP)
- Page size

**Usage:**
```bash
npm run test:perf:browser
```

**Install Puppeteer (optional, for better metrics):**
```bash
npm install --save-dev puppeteer
```

**Environment Variables:**
- `TEST_BASE_URL` - Base URL for testing (default: `http://localhost:3000`)
- `TEST_COOKIES` - Cookie string for authenticated requests (optional)

**Example:**
```bash
TEST_BASE_URL=http://localhost:3000 npm run test:perf:browser
```

## What Gets Tested

### Pages Tested:
- **Auth Pages**: `/login`, `/signup`
- **Admin Pages**: `/admin/dashboard`, `/admin/taxonomy`, `/admin/users`, `/admin/students`, `/admin/year-groups`, `/admin/departments`, `/admin/classes`, `/admin/schedule`, `/admin/analytics`, `/admin/reports`
- **Teacher Pages**: `/teacher/dashboard`, `/teacher/classes`, `/teacher/analytics`, `/teacher/change-password`

### API Routes Tested:
- `/api/analytics`
- `/api/classes`
- `/api/students`
- `/api/users`
- `/api/departments`
- `/api/year-groups`
- `/api/schedules`

### Navigation Sequences:
- Admin navigation sequence (all admin pages in order)
- Teacher navigation sequence (all teacher pages in order)

## Reports

Both scripts generate markdown reports:
- `performance-report.md` - Basic performance test results
- `browser-performance-report.md` - Browser performance test results

Reports include:
- Summary statistics (average load times, success rates)
- Fastest/slowest pages and APIs
- Detailed performance metrics for each route
- Performance recommendations

## Running Tests

### Prerequisites

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Run performance tests in another terminal:**
   ```bash
   # Basic test
   npm run test:perf
   
   # Browser test (requires Puppeteer)
   npm run test:perf:browser
   ```

### Testing Authenticated Routes

To test authenticated routes, you'll need to provide cookies:

1. **Get cookies from browser:**
   - Log in to your application
   - Open browser DevTools → Application/Storage → Cookies
   - Copy the cookie values

2. **Run test with cookies:**
   ```bash
   TEST_COOKIES="your-cookie-string" npm run test:perf
   ```

## Interpreting Results

### Performance Benchmarks

- **Page Load Time:**
  - Excellent: < 500ms
  - Good: 500-1000ms
  - Needs Improvement: > 1000ms

- **API Response Time:**
  - Excellent: < 200ms
  - Good: 200-500ms
  - Needs Improvement: > 500ms

- **First Contentful Paint (FCP):**
  - Excellent: < 1000ms
  - Good: 1000-2000ms
  - Needs Improvement: > 2000ms

### Common Issues

1. **Slow Pages (>1000ms):**
   - Check database queries (add indexes, optimize queries)
   - Consider adding caching
   - Review data fetching strategies

2. **Slow APIs (>500ms):**
   - Optimize database queries
   - Add query limits/pagination
   - Consider caching API responses

3. **Large Pages (>500KB):**
   - Implement code splitting
   - Lazy load heavy components
   - Optimize images and assets

## Notes

- Tests run sequentially to avoid overwhelming the server
- Some routes may return 401/403 if not authenticated - this is expected
- Browser tests provide more accurate metrics but require Puppeteer
- Reports are saved in the project root directory

