from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Go to localhost
    try:
        page.goto("http://localhost:8080/index.html")
    except Exception as e:
        print(f"Error loading page: {e}")
        browser.close()
        return

    # Wait a bit for JS to load
    time.sleep(1)

    # Check title
    print(f"Title: {page.title()}")

    # Check if modal opens automatically (expected since no keys)
    modal = page.locator("#connectionModal")

    if modal.is_visible():
        print("Modal opened automatically (Correct behavior)")
    else:
        print("Modal NOT visible automatically. Clicking button...")
        # Check for the Cloud Config button
        cloud_btn = page.locator("#configCloudBtn")
        cloud_btn.click()
        # Wait for modal to be visible
        modal.wait_for(state="visible", timeout=2000)

    if modal.is_visible():
        print("Modal is visible now")

        # Check inputs
        url_input = page.locator("#supabaseUrl")
        key_input = page.locator("#supabaseKey")
        if url_input.is_visible() and key_input.is_visible():
             print("Inputs are visible")
    else:
        print("Modal failed to open")

    # Take screenshot of the modal
    page.screenshot(path="verification/screenshot.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
