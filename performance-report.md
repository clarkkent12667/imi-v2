# Performance Test Report

**Generated:** 2025-11-16T14:19:47.861Z
**Base URL:** http://localhost:3000

## Summary

- **Total Pages Tested:** 30
- **Successful Pages:** 30
- **Failed Pages:** 0
- **Average Page Load Time:** 135.1ms

- **Total APIs Tested:** 7
- **Successful APIs:** 0
- **Failed APIs:** 7
- **Average API Response Time:** 0ms

### Fastest Page
- **Route:** /admin/departments
- **Time:** 49.81ms
- **Size:** 30.39 KB

### Slowest Page
- **Route:** /login
- **Time:** 1391.23ms
- **Size:** 30.39 KB

## Page Performance Details

| Route | Status | Duration (ms) | Size (KB) |
|-------|--------|---------------|----------|
| /login | ✅ 200 | 1391.23 | 30.39 |
| /signup | ✅ 200 | 1013.53 | 33.30 |
| /admin/students | ✅ 200 | 75.16 | 30.38 |
| /admin/dashboard | ✅ 200 | 74.39 | 30.38 |
| /admin/users | ✅ 200 | 67.64 | 30.38 |
| /admin/year-groups | ✅ 200 | 65.97 | 30.39 |
| /admin/dashboard | ✅ 200 | 64.87 | 30.38 |
| /teacher/dashboard | ✅ 200 | 62.29 | 30.38 |
| /admin/taxonomy | ✅ 200 | 61.25 | 30.39 |
| /admin/classes | ✅ 200 | 60.24 | 30.39 |
| /admin/schedule | ✅ 200 | 59.94 | 30.39 |
| /admin/year-groups | ✅ 200 | 59.34 | 30.38 |
| /teacher/analytics | ✅ 200 | 59.28 | 30.38 |
| /teacher/classes | ✅ 200 | 58.7 | 30.38 |
| /admin/reports | ✅ 200 | 58.59 | 30.39 |
| /admin/analytics | ✅ 200 | 57.28 | 30.39 |
| /admin/departments | ✅ 200 | 56.87 | 30.39 |
| /teacher/change-password | ✅ 200 | 56.78 | 30.39 |
| /admin/analytics | ✅ 200 | 56.63 | 30.38 |
| /admin/users | ✅ 200 | 56.59 | 30.39 |
| /teacher/analytics | ✅ 200 | 55.2 | 30.37 |
| /admin/classes | ✅ 200 | 55.11 | 30.38 |
| /admin/taxonomy | ✅ 200 | 55.1 | 30.39 |
| /admin/schedule | ✅ 200 | 54.67 | 30.38 |
| /admin/reports | ✅ 200 | 54.6 | 30.39 |
| /teacher/classes | ✅ 200 | 53.86 | 30.39 |
| /teacher/dashboard | ✅ 200 | 53.63 | 30.38 |
| /teacher/change-password | ✅ 200 | 52.61 | 30.39 |
| /admin/students | ✅ 200 | 51.87 | 30.39 |
| /admin/departments | ✅ 200 | 49.81 | 30.39 |

## API Performance Details

| Route | Method | Status | Duration (ms) | Size (KB) |
|-------|--------|--------|---------------|----------|

## Performance Recommendations

### ⚠️ Slow Pages (>1000ms)
- **/login**: 1391.23ms - Consider optimizing data fetching or adding caching
- **/signup**: 1013.53ms - Consider optimizing data fetching or adding caching

