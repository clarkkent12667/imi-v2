# Performance Testing Guide

This guide explains how to test navigation speed and data loading performance for your application.

## Quick Start

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Run performance tests:**
   ```bash
   # Basic performance test (uses fetch API)
   npm run test:perf
   
   # Browser-based test (more accurate, requires Puppeteer)
   npm run test:perf:browser
   ```

3. **View results:**
   - Check the console output for summary
   - Open `performance-report.md` or `browser-performance-report.md` for detailed results

## What Gets Tested

### Pages
- All admin pages (dashboard, taxonomy, users, students, etc.)
- All teacher pages (dashboard, classes, analytics, etc.)
- Auth pages (login, signup)

### API Routes
- Analytics API
- Classes API
- Students API
- Users API
- Departments API
- Year Groups API
- Schedules API

### Navigation Sequences
- Sequential navigation through all admin pages
- Sequential navigation through all teacher pages

## Performance Metrics

### Page Load Metrics
- **Total Load Time**: Time from request to complete page load
- **DOM Content Loaded**: Time until DOM is ready
- **First Contentful Paint (FCP)**: Time until first content is visible (browser test only)

### API Metrics
- **Response Time**: Time from request to response
- **Status Code**: HTTP status code
- **Response Size**: Size of the response body

## Understanding Results

### Performance Benchmarks

| Metric | Excellent | Good | Needs Improvement |
|--------|-----------|------|-------------------|
| Page Load | < 500ms | 500-1000ms | > 1000ms |
| API Response | < 200ms | 200-500ms | > 500ms |
| First Contentful Paint | < 1000ms | 1000-2000ms | > 2000ms |

### Report Sections

1. **Summary**: Overall statistics and averages
2. **Fastest/Slowest**: Best and worst performing routes
3. **Performance Details**: Complete breakdown of all routes
4. **Recommendations**: Suggestions for optimization

## Testing Authenticated Routes

Some routes require authentication. To test these:

1. **Get cookies from your browser:**
   - Log in to your application
   - Open DevTools → Application → Cookies
   - Copy the cookie string

2. **Run test with cookies:**
   ```bash
   TEST_COOKIES="sb-xxx-auth-token=..." npm run test:perf
   ```

## Troubleshooting

### Tests fail with connection errors
- Make sure your dev server is running (`npm run dev`)
- Check that `TEST_BASE_URL` matches your server URL

### Many 401/403 errors
- This is normal for protected routes without authentication
- Provide `TEST_COOKIES` to test authenticated routes

### Browser test doesn't work
- Install Puppeteer: `npm install --save-dev puppeteer`
- Or use the basic test: `npm run test:perf`

## Advanced Usage

### Custom Base URL
```bash
TEST_BASE_URL=https://your-production-url.com npm run test:perf
```

### Testing Specific Routes
Edit `scripts/performance-test.js` or `scripts/browser-performance-test.js` to modify the routes array.

### Continuous Testing
Run tests periodically to track performance over time:
```bash
# On Linux/Mac
while true; do npm run test:perf; sleep 3600; done
```

## Performance Optimization Tips

Based on test results:

1. **Slow Pages (>1000ms)**:
   - Optimize database queries
   - Add request-level caching
   - Implement pagination
   - Use server-side rendering efficiently

2. **Slow APIs (>500ms)**:
   - Add database indexes
   - Optimize queries
   - Implement API caching
   - Add query limits

3. **Large Pages (>500KB)**:
   - Code splitting
   - Lazy load components
   - Optimize images
   - Remove unused dependencies

4. **Slow First Contentful Paint**:
   - Optimize initial bundle size
   - Use Suspense boundaries
   - Lazy load heavy components
   - Optimize CSS

## Integration with CI/CD

You can integrate these tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Performance Tests
  run: |
    npm run build
    npm run start &
    sleep 10
    npm run test:perf
```

## See Also

- `scripts/README.md` - Detailed script documentation
- `PERFORMANCE_OPTIMIZATIONS.md` - Already applied optimizations

