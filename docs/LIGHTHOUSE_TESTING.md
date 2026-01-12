# Lighthouse Testing Guide

## 📊 Visual Testing Process

This guide explains how the Lighthouse testing process works and how to view it visually.

## 🔍 Current Metrics

Based on the latest test run:

- **Performance**: 49/100 🔴 (Target: 95+)
- **Accessibility**: 87/100 🟡 (Target: 95+)
- **Best Practices**: 100/100 🟢
- **SEO**: 100/100 🟢

## 🎬 How the Test Works

### Step 1: Authentication

The test automatically:

1. Navigates to `/signin`
2. Fills in admin credentials:
   - Email: `admin1@example.com`
   - Password: `admin123`
3. Submits the form
4. Waits for redirect to `/admin/dashboard`

### Step 2: Lighthouse Audit

After authentication:

1. Captures cookies from the authenticated session
2. Runs Lighthouse CLI with the authenticated cookies
3. Generates HTML and JSON reports
4. Displays metrics in the console

## 👀 Viewing the Process Visually

### Option 1: Watch the Test Run (Non-Headless Mode)

To see the browser during test execution:

```bash
# Set HEADLESS=false to see the browser
$env:HEADLESS="false"; npm run test:lighthouse:dashboard
```

This will:

- Open a visible Chrome browser
- Show the signin process
- Show navigation to the admin dashboard
- Run Lighthouse audit (Lighthouse will open its own browser)

### Option 2: View the Lighthouse Report

After running the test, view the HTML report:

```bash
# Automatically opens the latest report
npm run test:lighthouse:dashboard:view
```

Or manually open the latest report from:

```
__tests__/lighthouse-reports/admin-dashboard-*.report.html
```

### Option 3: View in Browser

The Lighthouse HTML report includes:

- **Performance Metrics**: FCP, LCP, TBT, CLS, Speed Index, TTI
- **Accessibility Audit**: All accessibility issues and warnings
- **Opportunities**: Suggestions for improvement
- **Diagnostics**: Detailed performance analysis

## 📈 Key Performance Issues to Fix

### 1. Reduce Unused JavaScript (2400ms savings)

- **Issue**: Loading JavaScript that isn't used
- **Fix**: Code splitting, tree shaking, dynamic imports

### 2. Minify JavaScript (1200ms savings)

- **Issue**: JavaScript not minified in production
- **Fix**: Enable minification in Next.js build

### 3. Initial Server Response Time (542ms savings)

- **Issue**: Slow server response
- **Fix**: Optimize API routes, add caching

### 4. Eliminate Render-Blocking Resources (150ms savings)

- **Issue**: CSS/JS blocking page render
- **Fix**: Defer non-critical resources, inline critical CSS

## ♿ Accessibility Issues to Fix

Current score: 87/100 (need 95+)

Common issues to check:

- Missing alt text on images
- Insufficient color contrast
- Missing ARIA labels
- Keyboard navigation issues
- Focus management

## 🚀 Running the Test

```bash
# Standard test (headless)
npm run test:lighthouse:dashboard

# Visual test (see browser)
$env:HEADLESS="false"; npm run test:lighthouse:dashboard

# View latest report
npm run test:lighthouse:dashboard:view
```

## 📝 Test Output

The test outputs:

- Category scores (Performance, Accessibility, Best Practices, SEO)
- Performance metrics (FCP, LCP, TBT, CLS, etc.)
- Accessibility issues
- Opportunities for improvement
- Path to HTML report

## 🎯 Next Steps

1. **Fix Performance Issues**:
   - Enable JavaScript minification
   - Implement code splitting
   - Optimize server response time
   - Defer non-critical resources

2. **Fix Accessibility Issues**:
   - Review Lighthouse report for specific issues
   - Add missing alt text
   - Improve color contrast
   - Add ARIA labels where needed

3. **Re-run Test**:

   ```bash
   npm run test:lighthouse:dashboard
   ```

4. **Verify Scores**:
   - Performance: 95+
   - Accessibility: 95+
