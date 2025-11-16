#!/usr/bin/env node
/**
 * Browser-based Performance Testing Script
 * Uses Puppeteer (if available) for more accurate navigation testing
 * Falls back to fetch-based testing if Puppeteer is not available
 */

const { performance } = require('perf_hooks')
const fs = require('fs').promises
const path = require('path')

let puppeteer = null
try {
  puppeteer = require('puppeteer')
} catch (e) {
  console.log('⚠️  Puppeteer not found. Install it for browser-based testing: npm install --save-dev puppeteer')
}

class BrowserPerformanceTester {
  constructor(config) {
    this.config = config
    this.results = []
    this.browser = null
    this.page = null
  }

  async init() {
    if (puppeteer) {
      console.log('🌐 Launching browser...')
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      this.page = await this.browser.newPage()
      
      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 })
      
      // Set cookies if provided
      if (this.config.cookies) {
        const cookieStrings = this.config.cookies.split(';').map(c => c.trim())
        const cookies = cookieStrings.map(cookie => {
          const [name, value] = cookie.split('=')
          return {
            name: name.trim(),
            value: value ? value.trim() : '',
            domain: new URL(this.config.baseUrl).hostname,
            path: '/',
          }
        })
        await this.page.setCookie(...cookies)
      }
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
  }

  async testPageRoute(route) {
    const url = `${this.config.baseUrl}${route}`
    
    if (puppeteer && this.page) {
      return await this.testPageWithBrowser(url, route)
    } else {
      return await this.testPageWithFetch(url, route)
    }
  }

  async testPageWithBrowser(url, route) {
    const startTime = performance.now()
    
    try {
      // Navigate and wait for network idle
      const response = await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      // Get performance metrics
      const metrics = await this.page.metrics()
      const navigationTiming = await this.page.evaluate(() => {
        const perfData = window.performance.timing
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
          loadComplete: perfData.loadEventEnd - perfData.navigationStart,
          firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        }
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      // Get page size
      const content = await this.page.content()
      const size = Buffer.byteLength(content, 'utf8')

      return {
        route,
        type: 'page',
        method: 'GET',
        status: response.status(),
        duration: Math.round(duration * 100) / 100,
        size,
        metrics: {
          domContentLoaded: navigationTiming.domContentLoaded,
          loadComplete: navigationTiming.loadComplete,
          firstPaint: navigationTiming.firstPaint,
          firstContentfulPaint: navigationTiming.firstContentfulPaint,
        },
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
        error: error.message,
      }
    }
  }

  async testPageWithFetch(url, route) {
    const startTime = performance.now()
    
    try {
      const headers = {
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
        error: error.message,
      }
    }
  }

  async testNavigationSequence(routes) {
    const results = []
    
    console.log(`\n🧪 Testing navigation sequence (${routes.length} pages)...`)
    
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]
      console.log(`  [${i + 1}/${routes.length}] Testing ${route}...`)
      
      const result = await this.testPageRoute(route)
      results.push(result)
      
      const statusEmoji = result.status >= 200 && result.status < 400 ? '✅' : '❌'
      const metricsInfo = result.metrics 
        ? ` (DOM: ${result.metrics.domContentLoaded}ms, FCP: ${result.metrics.firstContentfulPaint ? Math.round(result.metrics.firstContentfulPaint) : 'N/A'}ms)`
        : ''
      console.log(`    ${statusEmoji} ${result.status} - ${result.duration}ms${metricsInfo}`)
      
      // Small delay between requests
      if (i < routes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }

  async runAllTests() {
    await this.init()
    
    try {
      console.log('🚀 Starting Browser Performance Tests')
      console.log(`📍 Base URL: ${this.config.baseUrl}`)
      console.log(`📊 Testing ${this.config.routes.pages.length} pages\n`)

      // Test pages individually
      console.log('📄 Testing Pages Individually...')
      for (const route of this.config.routes.pages) {
        console.log(`  Testing ${route}...`)
        const result = await this.testPageRoute(route)
        this.results.push(result)
        const statusEmoji = result.status >= 200 && result.status < 400 ? '✅' : '❌'
        const metricsInfo = result.metrics 
          ? ` (DOM: ${result.metrics.domContentLoaded}ms, FCP: ${result.metrics.firstContentfulPaint ? Math.round(result.metrics.firstContentfulPaint) : 'N/A'}ms)`
          : ''
        console.log(`    ${statusEmoji} ${result.status} - ${result.duration}ms${metricsInfo}`)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Test navigation sequences
      console.log('\n🔄 Testing Navigation Sequences...')
      
      // Admin navigation sequence
      const adminRoutes = this.config.routes.pages.filter(r => r.startsWith('/admin'))
      if (adminRoutes.length > 0) {
        console.log('\n  Admin Navigation Sequence:')
        const adminResults = await this.testNavigationSequence(adminRoutes)
        this.results.push(...adminResults)
      }

      // Teacher navigation sequence
      const teacherRoutes = this.config.routes.pages.filter(r => r.startsWith('/teacher'))
      if (teacherRoutes.length > 0) {
        console.log('\n  Teacher Navigation Sequence:')
        const teacherResults = await this.testNavigationSequence(teacherRoutes)
        this.results.push(...teacherResults)
      }
    } finally {
      await this.cleanup()
    }
  }

  generateReport() {
    const pages = this.results.filter(r => r.type === 'page')
    const successfulPages = pages.filter(p => p.status >= 200 && p.status < 400)

    const avgPageTime = successfulPages.length > 0
      ? successfulPages.reduce((sum, p) => sum + p.duration, 0) / successfulPages.length
      : 0

    const avgDomTime = successfulPages.filter(p => p.metrics).length > 0
      ? successfulPages
          .filter(p => p.metrics)
          .reduce((sum, p) => sum + (p.metrics.domContentLoaded || 0), 0) / successfulPages.filter(p => p.metrics).length
      : 0

    const avgFcpTime = successfulPages
      .filter(p => p.metrics && p.metrics.firstContentfulPaint)
      .length > 0
      ? successfulPages
          .filter(p => p.metrics && p.metrics.firstContentfulPaint)
          .reduce((sum, p) => sum + p.metrics.firstContentfulPaint, 0) / successfulPages.filter(p => p.metrics && p.metrics.firstContentfulPaint).length
      : 0

    const fastestPage = successfulPages.length > 0
      ? successfulPages.reduce((fastest, p) => p.duration < fastest.duration ? p : fastest)
      : null

    const slowestPage = successfulPages.length > 0
      ? successfulPages.reduce((slowest, p) => p.duration > slowest.duration ? p : slowest)
      : null

    let report = `# Browser Performance Test Report\n\n`
    report += `**Generated:** ${new Date().toISOString()}\n`
    report += `**Base URL:** ${this.config.baseUrl}\n`
    report += `**Testing Method:** ${puppeteer ? 'Puppeteer (Browser)' : 'Fetch API'}\n\n`
    
    report += `## Summary\n\n`
    report += `- **Total Pages Tested:** ${pages.length}\n`
    report += `- **Successful Pages:** ${successfulPages.length}\n`
    report += `- **Failed Pages:** ${pages.length - successfulPages.length}\n`
    report += `- **Average Page Load Time:** ${Math.round(avgPageTime * 100) / 100}ms\n`
    if (avgDomTime > 0) {
      report += `- **Average DOM Content Loaded:** ${Math.round(avgDomTime * 100) / 100}ms\n`
    }
    if (avgFcpTime > 0) {
      report += `- **Average First Contentful Paint:** ${Math.round(avgFcpTime * 100) / 100}ms\n`
    }
    report += `\n`

    if (fastestPage) {
      report += `### Fastest Page\n`
      report += `- **Route:** ${fastestPage.route}\n`
      report += `- **Time:** ${fastestPage.duration}ms\n`
      if (fastestPage.metrics) {
        report += `- **DOM Content Loaded:** ${fastestPage.metrics.domContentLoaded}ms\n`
        if (fastestPage.metrics.firstContentfulPaint) {
          report += `- **First Contentful Paint:** ${Math.round(fastestPage.metrics.firstContentfulPaint)}ms\n`
        }
      }
      report += `- **Size:** ${fastestPage.size ? `${(fastestPage.size / 1024).toFixed(2)} KB` : 'N/A'}\n\n`
    }

    if (slowestPage) {
      report += `### Slowest Page\n`
      report += `- **Route:** ${slowestPage.route}\n`
      report += `- **Time:** ${slowestPage.duration}ms\n`
      if (slowestPage.metrics) {
        report += `- **DOM Content Loaded:** ${slowestPage.metrics.domContentLoaded}ms\n`
        if (slowestPage.metrics.firstContentfulPaint) {
          report += `- **First Contentful Paint:** ${Math.round(slowestPage.metrics.firstContentfulPaint)}ms\n`
        }
      }
      report += `- **Size:** ${slowestPage.size ? `${(slowestPage.size / 1024).toFixed(2)} KB` : 'N/A'}\n\n`
    }

    report += `## Page Performance Details\n\n`
    if (puppeteer) {
      report += `| Route | Status | Total (ms) | DOM (ms) | FCP (ms) | Size (KB) |\n`
      report += `|-------|--------|------------|----------|----------|----------|\n`
      successfulPages
        .sort((a, b) => b.duration - a.duration)
        .forEach(page => {
          const sizeKB = page.size ? (page.size / 1024).toFixed(2) : 'N/A'
          const statusEmoji = page.status >= 200 && page.status < 300 ? '✅' : '⚠️'
          const dom = page.metrics ? page.metrics.domContentLoaded : 'N/A'
          const fcp = page.metrics && page.metrics.firstContentfulPaint 
            ? Math.round(page.metrics.firstContentfulPaint) 
            : 'N/A'
          report += `| ${page.route} | ${statusEmoji} ${page.status} | ${page.duration} | ${dom} | ${fcp} | ${sizeKB} |\n`
        })
    } else {
      report += `| Route | Status | Duration (ms) | Size (KB) |\n`
      report += `|-------|--------|---------------|----------|\n`
      successfulPages
        .sort((a, b) => b.duration - a.duration)
        .forEach(page => {
          const sizeKB = page.size ? (page.size / 1024).toFixed(2) : 'N/A'
          const statusEmoji = page.status >= 200 && page.status < 300 ? '✅' : '⚠️'
          report += `| ${page.route} | ${statusEmoji} ${page.status} | ${page.duration} | ${sizeKB} |\n`
        })
    }

    report += `\n## Performance Recommendations\n\n`
    
    const slowPages = successfulPages.filter(p => p.duration > 1000)
    if (slowPages.length > 0) {
      report += `### ⚠️ Slow Pages (>1000ms)\n`
      slowPages.forEach(page => {
        report += `- **${page.route}**: ${page.duration}ms - Consider optimizing data fetching or adding caching\n`
      })
      report += `\n`
    }

    const slowFcpPages = successfulPages.filter(p => p.metrics && p.metrics.firstContentfulPaint && p.metrics.firstContentfulPaint > 2000)
    if (slowFcpPages.length > 0) {
      report += `### ⚠️ Slow First Contentful Paint (>2000ms)\n`
      slowFcpPages.forEach(page => {
        report += `- **${page.route}**: ${Math.round(page.metrics.firstContentfulPaint)}ms - Consider optimizing initial render\n`
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

  async saveReport(filename = 'browser-performance-report.md') {
    const report = this.generateReport()
    const reportPath = path.join(process.cwd(), filename)
    await fs.writeFile(reportPath, report, 'utf-8')
    console.log(`\n📊 Report saved to: ${reportPath}`)
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 BROWSER PERFORMANCE TEST SUMMARY')
    console.log('='.repeat(60))
    
    const pages = this.results.filter(r => r.type === 'page')
    const successfulPages = pages.filter(p => p.status >= 200 && p.status < 400)

    const avgPageTime = successfulPages.length > 0
      ? successfulPages.reduce((sum, p) => sum + p.duration, 0) / successfulPages.length
      : 0

    console.log(`\n📄 Pages: ${successfulPages.length}/${pages.length} successful`)
    console.log(`   Average Load Time: ${Math.round(avgPageTime * 100) / 100}ms`)

    if (puppeteer) {
      const pagesWithMetrics = successfulPages.filter(p => p.metrics)
      if (pagesWithMetrics.length > 0) {
        const avgDom = pagesWithMetrics.reduce((sum, p) => sum + (p.metrics.domContentLoaded || 0), 0) / pagesWithMetrics.length
        const avgFcp = pagesWithMetrics
          .filter(p => p.metrics.firstContentfulPaint)
          .reduce((sum, p) => sum + p.metrics.firstContentfulPaint, 0) / pagesWithMetrics.filter(p => p.metrics.firstContentfulPaint).length
        
        console.log(`   Average DOM Content Loaded: ${Math.round(avgDom)}ms`)
        if (avgFcp > 0) {
          console.log(`   Average First Contentful Paint: ${Math.round(avgFcp)}ms`)
        }
      }
    }

    const slowPages = successfulPages.filter(p => p.duration > 1000)
    if (slowPages.length > 0) {
      console.log(`\n⚠️  Slow Pages (>1000ms):`)
      slowPages.forEach(page => {
        console.log(`   - ${page.route}: ${page.duration}ms`)
      })
    }

    console.log('\n' + '='.repeat(60))
  }
}

// Main execution
async function main() {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000'
  
  const config = {
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
    },
  }

  if (process.env.TEST_COOKIES) {
    config.cookies = process.env.TEST_COOKIES
  }

  const tester = new BrowserPerformanceTester(config)
  
  try {
    await tester.runAllTests()
    tester.printSummary()
    await tester.saveReport()
  } catch (error) {
    console.error('❌ Error running browser performance tests:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { BrowserPerformanceTester }

