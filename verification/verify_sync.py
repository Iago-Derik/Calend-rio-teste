from playwright.sync_api import sync_playwright

def verify_sync_and_features(p):
    browser = p.chromium.launch()

    # Context 1 (Client A)
    context1 = browser.new_context()
    page1 = context1.new_page()
    page1.goto("http://localhost:3000")

    # Clean Data First
    # Handle dialogs
    page1.on("dialog", lambda dialog: dialog.accept())

    # Click Clear Data if it exists
    if page1.get_by_role("button", name="Limpar Tudo").is_visible():
        page1.get_by_role("button", name="Limpar Tudo").click()
        page1.wait_for_timeout(1000)

    # Context 2 (Client B)
    context2 = browser.new_context()
    page2 = context2.new_page()
    page2.goto("http://localhost:3000")
    page2.on("dialog", lambda dialog: dialog.accept())

    # 1. Client A adds a person
    page1.fill("#personInput", "Alice")
    page1.click("#addPersonBtn")
    page1.wait_for_timeout(500)

    # Verify Client B sees it
    # Use exact=True or scoped
    assert page2.locator("#peopleList").get_by_text("Alice").first.is_visible()
    print("Sync: Person added syncs successfully")

    # 2. Client B adds a task (only definition)
    page2.fill("#taskInput", "SyncTest")
    page2.select_option("#taskType", "even")
    page2.click("#addTaskBtn")
    page2.wait_for_timeout(500)

    # Verify Client A sees it in Task List
    assert page1.locator("#taskList").get_by_text("SyncTest").first.is_visible()
    print("Sync: Task added syncs successfully")

    # 3. Client A distributes tasks
    # Need to have at least one person and one task
    page1.get_by_role("button", name="Distribuir Tarefas (Mês Atual)").click()
    page1.wait_for_timeout(1000)

    # Verify Client B sees assignments
    # Checking for task-item presence
    assert page2.locator(".task-item").count() > 0
    print("Sync: Distribution syncs successfully")

    # 4. Edit Feature
    # Client A clicks on a task to edit
    page1.locator(".task-item").first.click()
    page1.wait_for_selector("#editModal", state="visible")

    # Change name
    page1.fill("#modalTaskName", "EditedTask")
    page1.click("#saveEditBtn")
    page1.wait_for_timeout(500)

    # Verify Client B sees change
    # Check in calendar grid
    assert page2.locator("#calendarGrid").get_by_text("EditedTask").first.is_visible()
    print("Edit: Task name update syncs successfully")

    # 5. Clear Month
    page1.get_by_role("button", name="Limpar Mês").click()
    page1.wait_for_timeout(1000)

    # Verify B sees empty calendar
    assert page2.locator(".task-item").count() == 0
    print("Clear Month: Syncs successfully")

    # Screenshot for Mobile Layout Verification (Client A)
    page1.set_viewport_size({"width": 375, "height": 812})
    page1.wait_for_timeout(500)
    page1.screenshot(path="verification/mobile_layout.png")
    print("Mobile screenshot taken")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as p:
        try:
            verify_sync_and_features(p)
        except Exception as e:
            print(f"Test Failed: {e}")
            import traceback
            traceback.print_exc()
