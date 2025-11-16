#!/usr/bin/env node
/**
 * Performance Testing Script
 * Tests navigation speed between pages and data loading times
 */

import { performance } from 'perf_hooks'
import fs from 'fs/promises'
import path from 'path'

interface PerformanceResult {
  route: string
  type: 'page' | 'api'
  method: string
  status: number
  duration: number
  size?: number
  timestamp: string
}

interface TestConfig {
  baseUrl: string
  authToken?: string
  cookies?: string
  routes: {
    pages: string[]
    apis: Array<{ path: string; method: string }>
  }
}

class PerformanceTester {
  private results: PerformanceResult[] = []
  private config: TestConfig

  constructor(config: TestConfig) {
    this.config = config
  }

  async testPageRoute(route: string): Promise<PerformanceResult> {
    const startTime = performance.now()
    const url = `${this.config.baseUrl}${route}`
    
    try {
      const headers: HeadersInit = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }

      if (this.config.cookies) {
        headers['Cookie'] = this.config.cookies
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        redirect: 'follow',
      })

      const endTime = performance.now()
      const duration = endTime - startTime
      const content = await response.text()
      const size = Buffer.byteLength(content, 'utf8')

      return {
        route,
        type: 'page',
        method: 'GET',
        status: response.status,
        duration: Math.round(duration * 100) / 100,
        size,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      return {
        route,
        type: 'page',
        method: 'GET',
        status: 0,
        duration: Math.round(duration * 100) / 100,
        timestamp: new Date().toISOString(),
      }
    }
  }

  async testApiRoute(path: string, method: string = 'GET'): Promise<PerformanceResult> {
    const startTime = performance.now()
    const url = `${this.config.baseUrl}${path}`
    
    try {
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }

      if (this.config.cookies) {
        headers['Cookie'] = this.config.cookies
      }

      if (this.config.authToken) {
        headers['Authorization'] = `Bearer ${this.config.authToken}`
      }

      const response = await fetch(url, {
        method,
        headers,
        redirect: 'follow',
      })

      const endTime = performance.now()
      const duration = endTime - startTime
      const content = await response.text()
      const size = Buffer.byteLength(content, 'utf8')

      return {
        route: path,
        type: 'api',
        method,
        status: response.status,
        duration: Math.round(duration * 100) / 100,
        size,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      return {
        route: path,
        type: 'api',
        method,
        status: 0,
        duration: Math.round(duration * 100) / 100,
        timestamp: new Date().toISOString(),
      }
    }
  }

  async testNavigationSequence(routes: string[]): Promise<PerformanceResult[]> {
    const results: PerformanceResult[] = []
    
    console.log(`\n🧪 Testing navigation sequence (${routes.length} pages)...`)
    
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]
      console.log(`  [${i + 1}/${routes.length}] Testing ${route}...`)
      
      const result = await this.testPageRoute(route)
      results.push(result)
      
      // Small delay between requests to avoid overwhelming the server
      if (i < routes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    return results
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Performance Tests')
    console.log(`📍 Base URL: ${this.config.baseUrl}`)
    console.log(`📊 Testing ${this.config.routes.pages.length} pages and ${this.config.routes.apis.length} API routes\n`)

    // Test pages
    console.log('📄 Testing Pages...')
    for (const route of this.config.routes.pages) {
      console.log(`  Testing ${route}...`)
      const result = await this.testPageRoute(route)
      this.results.push(result)
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    // Test APIs
    console.log('\n🔌 Testing API Routes...')
    for (const api of this.config.routes.apis) {
      console.log(`  Testing ${api.method} ${api.path}...`)
      const result = await this.testApiRoute(api.path, api.method)
      this.results.push(result)
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    // Test navigation sequences
    console.log('\n🔄 Testing Navigation Sequences...')
    
    // Admin navigation sequence
    const adminRoutes = this.config.routes.pages.filter(r => r.startsWith('/admin'))
    if (adminRoutes.length > 0) {
      const adminResults = await this.testNavigationSequence(adminRoutes)
      this.results.push(...adminResults)
    }

    // Teacher navigation sequence
    const teacherRoutes = this.config.routes.pages.filter(r => r.startsWith('/teacher'))
    if (teacherRoutes.length > 0) {
      const teacherResults = await this.testNavigationSequence(teacherRoutes)
      this.results.push(...teacherResults)
    }
  }

  generateReport(): string {
    const pages = this.results.filter(r => r.type === 'page')
    const apis = this.results.filter(r => r.type === 'api')
    
    const successfulPages = pages.filter(p => p.status >= 200 && p.status < 400)
    const successfulApis = apis.filter(a => a.status >= 200 && a.status < 400)

    const avgPageTime = successfulPages.length > 0
      ? successfulPages.reduce((sum, p) => sum + p.duration, 0) / successfulPages.length
      : 0

    const avgApiTime = successfulApis.length > 0
      ? successfulApis.reduce((sum, a) => sum + a.duration, 0) / successfulApis.length
      : 0

    const fastestPage = successfulPages.length > 0
      ? successfulPages.reduce((fastest, p) => p.duration < fastest.duration ? p : fastest)
      : null

    const slowestPage = successfulPages.length > 0
      ? successfulPages.reduce((slowest, p) => p.duration > slowest.duration ? p : slowest)
      : null

    const fastestApi = successfulApis.length > 0
      ? successfulApis.reduce((fastest, a) => a.duration < fastest.duration ? a : fastest)
      : null

    const slowestApi = successfulApis.length > 0
      ? successfulApis.reduce((slowest, a) => a.duration > slowest.duration ? a : slowest)
      : null

    let report = `# Performance Test Report\n\n`
    report += `**Generated:** ${new Date().toISOString()}\n`
    report += `**Base URL:** ${this.config.baseUrl}\n\n`
    
    report += `## Summary\n\n`
    report += `- **Total Pages Tested:** ${pages.length}\n`
    report += `- **Successful Pages:** ${successfulPages.length}\n`
    report += `- **Failed Pages:** ${pages.length - successfulPages.length}\n`
    report += `- **Average Page Load Time:** ${Math.round(avgPageTime * 100) / 100}ms\n\n`
    
    report += `- **Total APIs Tested:** ${apis.length}\n`
    report += `- **Successful APIs:** ${successfulApis.length}\n`
    report += `- **Failed APIs:** ${apis.length - successfulApis.length}\n`
    report += `- **Average API Response Time:** ${Math.round(avgApiTime * 100) / 100}ms\n\n`

    if (fastestPage) {
      report += `### Fastest Page\n`
      report += `- **Route:** ${fastestPage.route}\n`
      report += `- **Time:** ${fastestPage.duration}ms\n`
      report += `- **Size:** ${fastestPage.size ? `${(fastestPage.size / 1024).toFixed(2)} KB` : 'N/A'}\n\n`
    }

    if (slowestPage) {
      report += `### Slowest Page\n`
      report += `- **Route:** ${slowestPage.route}\n`
      report += `- **Time:** ${slowestPage.duration}ms\n`
      report += `- **Size:** ${slowestPage.size ? `${(slowestPage.size / 1024).toFixed(2)} KB` : 'N/A'}\n\n`
    }

    if (fastestApi) {
      report += `### Fastest API\n`
      report += `- **Route:** ${fastestApi.route}\n`
      report += `- **Method:** ${fastestApi.method}\n`
      report += `- **Time:** ${fastestApi.duration}ms\n\n`
    }

    if (slowestApi) {
      report += `### Slowest API\n`
      report += `- **Route:** ${slowestApi.route}\n`
      report += `- **Method:** ${slowestApi.method}\n`
      report += `- **Time:** ${slowestApi.duration}ms\n\n`
    }

    report += `## Page Performance Details\n\n`
    report += `| Route | Status | Duration (ms) | Size (KB) |\n`
    report += `|-------|--------|---------------|----------|\n`
    successfulPages
      .sort((a, b) => b.duration - a.duration)
      .forEach(page => {
        const sizeKB = page.size ? (page.size / 1024).toFixed(2) : 'N/A'
        const statusEmoji = page.status >= 200 && page.status < 300 ? '✅' : '⚠️'
        report += `| ${page.route} | ${statusEmoji} ${page.status} | ${page.duration} | ${sizeKB} |\n`
      })

    report += `\n## API Performance Details\n\n`
    report += `| Route | Method | Status | Duration (ms) | Size (KB) |\n`
    report += `|-------|--------|--------|---------------|----------|\n`
    successfulApis
      .sort((a, b) => b.duration - a.duration)
      .forEach(api => {
        const sizeKB = api.size ? (api.size / 1024).toFixed(2) : 'N/A'
        const statusEmoji = api.status >= 200 && api.status < 300 ? '✅' : '⚠️'
        report += `| ${api.route} | ${api.method} | ${statusEmoji} ${api.status} | ${api.duration} | ${sizeKB} |\n`
      })

    report += `\n## Performance Recommendations\n\n`
    
    const slowPages = successfulPages.filter(p => p.duration > 1000)
    if (slowPages.length > 0) {
      report += `### ⚠️ Slow Pages (>1000ms)\n`
      slowPages.forEach(page => {
        report += `- **${page.route}**: ${page.duration}ms - Consider optimizing data fetching or adding caching\n`
      })
      report += `\n`
    }

    const slowApis = successfulApis.filter(a => a.duration > 500)
    if (slowApis.length > 0) {
      report += `### ⚠️ Slow APIs (>500ms)\n`
      slowApis.forEach(api => {
        report += `- **${api.method} ${api.route}**: ${api.duration}ms - Consider optimizing database queries or adding caching\n`
      })
      report += `\n`
    }

    const largePages = successfulPages.filter(p => p.size && p.size > 500 * 1024)
    if (largePages.length > 0) {
      report += `### 📦 Large Pages (>500KB)\n`
      largePages.forEach(page => {
        const sizeMB = page.size ? (page.size / (1024 * 1024)).toFixed(2) : 'N/A'
        report += `- **${page.route}**: ${sizeMB}MB - Consider code splitting or lazy loading\n`
      })
      report += `\n`
    }

    return report
  }

  async saveReport(filename: string = 'performance-report.md'): Promise<void> {
    const report = this.generateReport()
    const reportPath = path.join(process.cwd(), filename)
    await fs.writeFile(reportPath, report, 'utf-8')
    console.log(`\n📊 Report saved to: ${reportPath}`)
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 PERFORMANCE TEST SUMMARY')
    console.log('='.repeat(60))
    
    const pages = this.results.filter(r => r.type === 'page')
    const apis = this.results.filter(r => r.type === 'api')
    
    const successfulPages = pages.filter(p => p.status >= 200 && p.status < 400)
    const successfulApis = apis.filter(a => a.status >= 200 && a.status < 400)

    const avgPageTime = successfulPages.length > 0
      ? successfulPages.reduce((sum, p) => sum + p.duration, 0) / successfulPages.length
      : 0

    const avgApiTime = successfulApis.length > 0
      ? successfulApis.reduce((sum, a) => sum + a.duration, 0) / successfulApis.length
      : 0

    console.log(`\n📄 Pages: ${successfulPages.length}/${pages.length} successful`)
    console.log(`   Average Load Time: ${Math.round(avgPageTime * 100) / 100}ms`)
    
    console.log(`\n🔌 APIs: ${successfulApis.length}/${apis.length} successful`)
    console.log(`   Average Response Time: ${Math.round(avgApiTime * 100) / 100}ms`)

    const slowPages = successfulPages.filter(p => p.duration > 1000)
    if (slowPages.length > 0) {
      console.log(`\n⚠️  Slow Pages (>1000ms):`)
      slowPages.forEach(page => {
        console.log(`   - ${page.route}: ${page.duration}ms`)
      })
    }

    const slowApis = successfulApis.filter(a => a.duration > 500)
    if (slowApis.length > 0) {
      console.log(`\n⚠️  Slow APIs (>500ms):`)
      slowApis.forEach(api => {
        console.log(`   - ${api.method} ${api.route}: ${api.duration}ms`)
      })
    }

    console.log('\n' + '='.repeat(60))
  }
}

// Main execution
async function main() {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000'
  
  const config: TestConfig = {
    baseUrl,
    routes: {
      pages: [
        // Auth pages
        '/login',
        '/signup',
        
        // Admin pages
        '/admin/dashboard',
        '/admin/taxonomy',
        '/admin/users',
        '/admin/students',
        '/admin/year-groups',
        '/admin/departments',
        '/admin/classes',
        '/admin/schedule',
        '/admin/analytics',
        '/admin/reports',
        
        // Teacher pages
        '/teacher/dashboard',
        '/teacher/classes',
        '/teacher/analytics',
        '/teacher/change-password',
      ],
      apis: [
        // Analytics
        { path: '/api/analytics', method: 'GET' },
        
        // Classes
        { path: '/api/classes', method: 'GET' },
        
        // Students
        { path: '/api/students', method: 'GET' },
        
        // Users
        { path: '/api/users', method: 'GET' },
        
        // Departments
        { path: '/api/departments', method: 'GET' },
        
        // Year Groups
        { path: '/api/year-groups', method: 'GET' },
        
        // Schedules
        { path: '/api/schedules', method: 'GET' },
      ],
    },
  }

  // Check if cookies/auth token provided via env
  if (process.env.TEST_COOKIES) {
    config.cookies = process.env.TEST_COOKIES
  }

  if (process.env.TEST_AUTH_TOKEN) {
    config.authToken = process.env.TEST_AUTH_TOKEN
  }

  const tester = new PerformanceTester(config)
  
  try {
    await tester.runAllTests()
    tester.printSummary()
    await tester.saveReport()
  } catch (error) {
    console.error('❌ Error running performance tests:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { PerformanceTester, PerformanceResult, TestConfig }

