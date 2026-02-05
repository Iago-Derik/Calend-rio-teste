from playwright.sync_api import sync_playwright

def verify_calendar(page):
    page.goto("http://localhost:8000")

    # Check title
    print(page.title())

    # Add Person A
    page.fill("#personInput", "Alice")
    page.click("#addPersonBtn")

    # Add Person B
    page.fill("#personInput", "Bob")
    page.click("#addPersonBtn")

    # Add Task (Even Days)
    page.fill("#taskInput", "Cleaning")
    page.select_option("#taskType", "even")
    page.click("#addTaskBtn")

    # Wait for calendar to populate (implicit via render)
    page.wait_for_timeout(500)

    # Toggle Theme to Dark
    page.click("#themeToggle")
    page.wait_for_timeout(500) # Wait for transition

    # Screenshot
    page.screenshot(path="verification/calendar_dark.png")
    print("Screenshot taken")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_calendar(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
