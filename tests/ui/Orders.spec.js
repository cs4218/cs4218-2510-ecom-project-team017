import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const TEST_USER = {
  email: "cs4218@test.com",
  password: "cs4218@test.com",
};

test.describe("Orders Page - UI Tests", () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.getByRole("textbox", { name: "Enter Your Email" }).click();
    await page
      .getByRole("textbox", { name: "Enter Your Email" })
      .fill("cs4218@test.com");
    await page.getByRole("textbox", { name: "Enter Your Password" }).click();
    await page
      .getByRole("textbox", { name: "Enter Your Password" })
      .fill("cs4218@test.com");
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL("http://localhost:3000/");

    await page.getByRole("button", { name: "CS 4218 Test Account" }).click();
    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.getByRole("link", { name: "Orders" }).click();
  });

  test('Renders "All Orders" heading when page loads', async ({ page }) => {
    await expect(page.locator("h1")).toContainText("All Orders");
  });

  test('should display "No orders found" message when user has no orders', async ({
    page,
  }) => {
    const noOrdersMessage = page.locator("p.text-center.text-muted");
    const isVisible = await noOrdersMessage.isVisible().catch(() => false);

    if (isVisible) {
      await expect(noOrdersMessage).toHaveText("No orders found.");
    }
  });

  test("should display order table with correct headers when orders exist", async ({
    page,
  }) => {
    // Check if order table exists
    const table = page.locator("table.table").first();
    const hasOrders = await table.isVisible().catch(() => false);

    if (hasOrders) {
      // Verify all expected table headers
      await expect(page.locator('th:has-text("#")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Buyer")')).toBeVisible();
      await expect(page.locator('th:has-text("Date")')).toBeVisible();
      await expect(page.locator('th:has-text("Payment")')).toBeVisible();
      await expect(page.locator('th:has-text("Quantity")')).toBeVisible();
    }
  });

  test("should display order details including status, buyer name, date, payment status, and quantity", async ({
    page,
  }) => {
    const firstOrder = page.locator(".border.shadow").first();
    const hasOrders = await firstOrder.isVisible().catch(() => false);

    if (hasOrders) {
      // Check that order details are displayed
      const table = firstOrder.locator("table tbody tr");

      // Verify the row has multiple cells (order data)
      const cells = table.locator("td");
      await expect(cells).toHaveCount(6);

      // Verify payment status shows either Success or Failed
      const paymentCell = cells.nth(4);
      const paymentText = await paymentCell.textContent();
      expect(["Success", "Failed"]).toContain(paymentText);
    }
  });

  test("should display product cards with images, names, descriptions, and prices for each order", async ({
    page,
  }) => {
    const firstOrder = page.locator(".border.shadow").first();
    const hasOrders = await firstOrder.isVisible().catch(() => false);

    if (hasOrders) {
      // Check for product cards within the order
      const productCards = firstOrder.locator(".row.mb-2.p-3.card.flex-row");
      const productCount = await productCards.count();

      if (productCount > 0) {
        const firstProduct = productCards.first();

        // Verify product image exists
        const productImage = firstProduct.locator("img.card-img-top");
        await expect(productImage).toBeVisible();

        // Verify product details are present
        const productDetails = firstProduct.locator(".col-md-8 p");
        await expect(productDetails.first()).toBeVisible(); // Product name

        // Check that price is displayed
        const priceText = await productDetails.last().textContent();
        expect(priceText).toContain("Price :");
      }
    }
  });

  test("should display UserMenu component in sidebar", async ({ page }) => {
    // Locate the sidebar with UserMenu
    const sidebar = page.locator(".col-md-3");

    // Assert sidebar is visible
    await expect(sidebar).toBeVisible();

    // Verify it contains navigation/menu items
    // (specific selectors depend on UserMenu implementation)
    const menuExists = (await sidebar.locator("*").count()) > 0;
    expect(menuExists).toBeTruthy();
  });

  test("should display multiple orders when user has more than one order", async ({
    page,
  }) => {
    // Count the number of order containers
    const orders = page.locator(".border.shadow");
    const orderCount = await orders.count();
    console.log(`User has ${orderCount} orders.`);

    // This test verifies the component can handle multiple orders
    // The assertion will vary based on test data
    if (orderCount > 1) {
      expect(orderCount).toBeGreaterThan(1);

      // Verify each order has its own table
      for (let i = 0; i < Math.min(orderCount, 3); i++) {
        const order = orders.nth(i);
        await expect(order.locator("table")).toBeVisible();
      }
    }
  });
});

test.describe("Orders Page - End-to-End User Scenarios", () => {
  test("login -> navigate to orders -> view order details", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.getByRole("textbox", { name: "Enter Your Email" }).click();
    await page
      .getByRole("textbox", { name: "Enter Your Email" })
      .fill("cs4218@test.com");
    await page.getByRole("textbox", { name: "Enter Your Password" }).click();
    await page
      .getByRole("textbox", { name: "Enter Your Password" })
      .fill("cs4218@test.com");
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL("http://localhost:3000/");
    await page.goto(`${BASE_URL}/dashboard/user`);
    await page.waitForURL(`${BASE_URL}/dashboard/user`);
    await page.click("text=Orders");

    // Verify on the orders page
    await expect(page).toHaveURL(/orders/);
    await expect(page.locator('h1:has-text("All Orders")')).toBeVisible();

    // Verify order information is displayed
    const hasOrders = await page
      .locator(".border.shadow")
      .isVisible()
      .catch(() => false);

    if (hasOrders) {
      await expect(page.locator("table.table").first()).toBeVisible();
    } else {
      await expect(page.locator("text=No orders found.")).toBeVisible();
    }
  });
});
