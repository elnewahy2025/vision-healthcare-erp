import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads with form elements', async ({ page }) => {
    await page.goto('/login');

    // Page should render the login form
    await expect(page.locator('form')).toBeVisible();

    // Should have email/username input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    await expect(emailInput).toBeVisible();

    // Should have password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Should have a submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('login shows error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await emailInput.fill('nonexistent@test.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();

    // Should show an error message (toast, alert, or inline)
    const errorIndicator = page.locator('[role="alert"], .error, .toast-error, [data-testid="error"]');
    await expect(errorIndicator.first()).toBeVisible({ timeout: 10_000 });
  });

  test('login form prevents empty submission', async ({ page }) => {
    await page.goto('/login');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should still be on login page (form validation prevents submission)
    await expect(page).toHaveURL(/login/);
  });
});
