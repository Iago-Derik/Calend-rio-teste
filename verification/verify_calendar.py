from playwright.sync_api import sync_playwright

def verify_calendar(page):
    # 1. Load page
    page.goto("http://localhost:3000/index.html")

    # Handle dialogs (confirms)
    page.on("dialog", lambda dialog: dialog.accept())

    # 2. Add Person
    page.fill("#personInput", "Alice")
    page.click("#addPersonBtn")
    page.wait_for_timeout(500)

    # 3. Add Task
    page.fill("#taskInput", "Cleaning")
    page.click("#addTaskBtn")
    page.wait_for_timeout(500)

    # 4. Redistribute
    page.click("#redistributeBtn")
    page.wait_for_timeout(500)

    # 5. Click an assignment to open modal
    task_item = page.locator(".task-item").first
    if task_item.count() > 0:
        task_item.click()
        page.wait_for_timeout(500)
    else:
        print("No task items found!")

    # 6. Screenshot
    page.screenshot(path="verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_calendar(page)
        finally:
            browser.close()
