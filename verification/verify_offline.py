from playwright.sync_api import sync_playwright

def verify_offline(page):
    # 1. Load the offline version of the page (no firebase scripts)
    page.goto("http://localhost:3000/test_offline.html")

    # Handle dialogs (confirms)
    page.on("dialog", lambda dialog: dialog.accept())

    # 2. Check if main elements exist (indicating init() ran successfully)
    if page.locator("#calendarGrid").count() > 0:
        print("Calendar Grid found.")
    else:
        raise Exception("Calendar Grid NOT found. Init failed.")

    # 3. Add Person (Test basic interaction)
    page.fill("#personInput", "OfflineUser")
    page.click("#addPersonBtn")
    page.wait_for_timeout(500)

    # 4. Screenshot
    page.screenshot(path="verification/verification_offline.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_offline(page)
        finally:
            browser.close()
