/**
 * Playwright E2E smoke tests — IT Asset Management System
 *
 * Prerequisites: both backend (port 8080) and frontend (port 5173) must be
 * running before executing these tests (handled by CI workflow via `wait-on`).
 *
 * Covers:
 *  - Login page renders and shows correct title
 *  - Login with invalid credentials shows error
 *  - Login with valid admin credentials redirects to Dashboard
 *  - Authenticated user can navigate to Assets page
 *  - Asset list view toggle switches to list mode
 *  - Logout clears session and redirects to Login
 */

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:5173';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@company.com';
const ADMIN_PASS  = process.env.E2E_ADMIN_PASS  || 'Admin@123';

// ── helpers ──────────────────────────────────────────────────────────────────

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

// ── tests ─────────────────────────────────────────────────────────────────────

test.describe('Login page', () => {
  test('displays correct page title', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page).toHaveTitle(/sign in/i);
  });

  test('has accessible email and password fields', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password/i)).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await login(page, 'wrong@test.com', 'wrongpass');
    // Error message should appear (role=alert or visible text)
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Authenticated flows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASS);
    // Wait for redirect away from /login
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 10_000 });
  });

  test('Dashboard page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/dashboard/i);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('navigates to Assets page via Navbar link', async ({ page }) => {
    await page.getByRole('link', { name: /assets/i }).click();
    await page.waitForURL(`${BASE}/assets`, { timeout: 5000 });
    await expect(page).toHaveURL(/\/assets/);
    await expect(page.getByRole('heading', { name: /asset inventory/i })).toBeVisible();
  });

  test('Asset list — list view toggle switches to table mode', async ({ page }) => {
    await page.goto(`${BASE}/assets`);
    // Wait for assets to load
    await page.waitForSelector('article, [role="row"]', { timeout: 8000 });
    // Click the List toggle button
    await page.getByRole('button', { name: /list/i }).click();
    // Table header should be visible in list mode
    await expect(page.getByText(/serial #/i)).toBeVisible({ timeout: 3000 });
  });

  test('Admin can navigate to Admin Dashboard', async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page).toHaveTitle(/admin dashboard/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Logout clears session and redirects to login', async ({ page }) => {
    // Find and click logout (in Navbar dropdown)
    const logoutBtn = page.getByRole('button', { name: /logout/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      // May be hidden in a dropdown
      await page.getByRole('button', { name: /account|profile|menu/i }).click();
      await page.getByRole('button', { name: /logout/i }).click();
    }
    await page.waitForURL(`${BASE}/login`, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Accessibility smoke', () => {
  test('Login page has a skip link', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    // Skip link may be visually hidden — check it exists in DOM
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveCount(1);
  });

  test('Dashboard has an id=main-content landmark', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL(`${BASE}/dashboard`);
    const main = page.locator('#main-content');
    await expect(main).toHaveCount(1);
  });
});
