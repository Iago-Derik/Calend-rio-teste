document.addEventListener('DOMContentLoaded', () => {
    // Socket.io Connection
    const socket = io();

    // State
    let currentDate = new Date();
    let people = [];
    let tasks = [];
    // assignments: { 'YYYY-MM-DD': [ { taskId, personName, color, title } ] }
    let assignments = {};

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const fixedHolidays = {
        '01-01': 'Ano Novo',
        '04-21': 'Tiradentes',
        '05-01': 'Dia do Trabalho',
        '09-07': 'Independência do Brasil',
        '10-12': 'Nossa Senhora Aparecida',
        '11-02': 'Finados',
        '11-15': 'Proclamação da República',
        '12-25': 'Natal'
    };

    // DOM Elements
    const monthSelect = document.getElementById('monthSelect');
    const yearDisplay = document.getElementById('yearDisplay');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const calendarGrid = document.getElementById('calendarGrid');
    const personInput = document.getElementById('personInput');
    const addPersonBtn = document.getElementById('addPersonBtn');
    const peopleList = document.getElementById('peopleList');
    const taskInput = document.getElementById('taskInput');
    const taskColor = document.getElementById('taskColor');
    const taskType = document.getElementById('taskType');
    // Renamed ID in HTML later, assuming 'addTaskBtn' for "Adicionar" and separate for distribute
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const legendContainer = document.getElementById('legendContainer');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const themeToggle = document.getElementById('themeToggle');

    // New Controls (Will be added to HTML)
    let distributeMonthBtn;
    let clearMonthBtn;

    // Initialize
    init();

    function init() {
        initTheme();
        populateMonthSelect();

        // Wait for data from server
        socket.on('init', (data) => {
            people = data.people || [];
            tasks = data.tasks || [];
            assignments = data.assignments || {};
            render();
        });

        socket.on('dataUpdated', (data) => {
            people = data.people || [];
            tasks = data.tasks || [];
            assignments = data.assignments || {};
            render();
        });

        setupEventListeners();
    }

    function syncData() {
        socket.emit('updateData', {
            people,
            tasks,
            assignments
        });
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function updateThemeIcon(theme) {
        if (themeToggle) {
            themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
            themeToggle.setAttribute('aria-label', theme === 'light' ? 'Alternar para Escuro' : 'Alternar para Claro');
        }
    }

    function setupEventListeners() {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            render();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            render();
        });

        monthSelect.addEventListener('change', (e) => {
            currentDate.setMonth(parseInt(e.target.value));
            render();
        });

        addPersonBtn.addEventListener('click', addPerson);
        addTaskBtn.addEventListener('click', addTask);
        clearDataBtn.addEventListener('click', clearData); // This will now be "Reset System" or options

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateThemeIcon(newTheme);
            });
        }
    }

    function populateMonthSelect() {
        monthSelect.innerHTML = '';
        months.forEach((m, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = m;
            monthSelect.appendChild(option);
        });
    }

    function render() {
        // Update Header
        monthSelect.value = currentDate.getMonth();
        yearDisplay.textContent = currentDate.getFullYear();

        // Render Components
        renderCalendar();
        renderSidebarLists();
        renderLegend();

        // Dynamic Buttons (ensure they exist or re-render if we want)
        // I will assume the HTML is updated to include them or I inject them here if missing?
        // Better to update HTML in the Plan step.
    }

    function addPerson() {
        const name = personInput.value.trim();
        if (name && !people.includes(name)) {
            people.push(name);
            personInput.value = '';
            syncData();
        } else if (people.includes(name)) {
            alert('Essa pessoa já foi adicionada.');
        }
    }

    // Only creates the task definition
    function addTask() {
        const title = taskInput.value.trim();
        const color = taskColor.value;
        const type = taskType.value;

        if (!title) {
            alert('Por favor, digite o nome da tarefa.');
            return;
        }

        const newTask = {
            id: Date.now(),
            title,
            color,
            type
        };

        tasks.push(newTask);
        taskInput.value = '';
        syncData();
    }

    // Exposed to Global Scope or attached via listener if element exists
    window.distributeTasksForMonth = function() {
        if (tasks.length === 0 || people.length === 0) {
            alert('É preciso ter pessoas e tarefas cadastradas.');
            return;
        }

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Clear existing assignments for this month ONLY?
        // User said: "se eu clicar pra remover as tarefas ele remove de todos os outros" -> fixed by separate clear
        // But for distribution: usually we want to Fill holes or Overwrite.
        // Let's assume Overwrite for this month is the cleanest behavior for "Distribuir".
        // Or should we just add? If we just add, we might double up.
        // Let's Clear Month First implicitly? No, maybe warn.
        // Let's just calculate and overwrite conflicts, or clear month first logic.
        
        // To be safe: remove all assignments for this month before distributing.
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const key = formatDate(date);
            if (assignments[key]) delete assignments[key];
        }

        tasks.forEach(task => {
            distributeSingleTask(task, year, month, daysInMonth);
        });

        syncData();
    };

    window.clearMonthAssignments = function() {
        if(!confirm('Deseja limpar as tarefas deste mês?')) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const key = formatDate(date);
            if (assignments[key]) delete assignments[key];
        }
        syncData();
    };

    function distributeSingleTask(task, year, month, daysInMonth) {
        // Determine target days
        let targetDays = [];
        for (let d = 1; d <= daysInMonth; d++) {
            if (task.type === 'even' && d % 2 === 0) targetDays.push(d);
            if (task.type === 'odd' && d % 2 !== 0) targetDays.push(d);
            if (task.type === 'random') targetDays.push(d);
        }

        let lastPersonForThisTask = null;

        targetDays.forEach(day => {
            const date = new Date(year, month, day);
            const dateKey = formatDate(date);

            // Filter available people
            // Constraint 1: Person must NOT have an assignment on this dateKey (One task per person per day)
            // Constraint 2: Person must NOT be lastPersonForThisTask (Rotation/Consecutive Task Rule)
            
            let availablePeople = people.filter(p => {
                // Check if p is busy on dateKey
                const isBusy = assignments[dateKey] && assignments[dateKey].some(a => a.personName === p);
                if (isBusy) return false;

                // Check rotation (avoid same person doing same task consecutively)
                if (p === lastPersonForThisTask) return false;

                return true;
            });

            // Fallback: If no one is available due to rotation constraint, try allowing rotation but check busy
            if (availablePeople.length === 0) {
                 availablePeople = people.filter(p => {
                    const isBusy = assignments[dateKey] && assignments[dateKey].some(a => a.personName === p);
                    return !isBusy;
                });
            }

            // Assign if someone is available
            if (availablePeople.length > 0) {
                const randomPerson = availablePeople[Math.floor(Math.random() * availablePeople.length)];

                if (!assignments[dateKey]) assignments[dateKey] = [];
                assignments[dateKey].push({
                    taskId: task.id,
                    title: task.title,
                    color: task.color,
                    personName: randomPerson
                });

                lastPersonForThisTask = randomPerson;
            }
        });
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        
        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        daysOfWeek.forEach(day => {
            const el = document.createElement('div');
            el.className = 'calendar-day-name';
            el.textContent = day;
            calendarGrid.appendChild(el);
        });

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots
        for (let i = 0; i < firstDayOfMonth; i++) {
            const el = document.createElement('div');
            el.className = 'calendar-day empty';
            calendarGrid.appendChild(el);
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateKey = formatDate(date);
            const dayKey = formatDateMonthDay(date);

            const el = document.createElement('div');
            el.className = 'calendar-day';
            
            // Holiday
            if (fixedHolidays[dayKey]) {
                el.classList.add('holiday');
                el.title = fixedHolidays[dayKey];
            }

            const numberEl = document.createElement('div');
            numberEl.className = 'day-number';
            numberEl.textContent = d;
            el.appendChild(numberEl);

            // Tasks
            if (assignments[dateKey]) {
                assignments[dateKey].forEach((assign, idx) => {
                    const taskEl = document.createElement('div');
                    taskEl.className = 'task-item';
                    taskEl.style.backgroundColor = assign.color;
                    taskEl.textContent = `${assign.title} (${assign.personName})`;
                    taskEl.title = `Clique para editar`;
                    taskEl.style.cursor = 'pointer';

                    // Edit Click
                    taskEl.onclick = (e) => {
                        e.stopPropagation();
                        openEditModal(dateKey, idx, assign);
                    };

                    el.appendChild(taskEl);
                });
            }

            calendarGrid.appendChild(el);
        }
    }

    function renderSidebarLists() {
        // People
        peopleList.innerHTML = '';
        people.forEach((p, index) => {
            const li = document.createElement('li');
            li.textContent = p;

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '5px';

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.className = 'icon-btn';
            editBtn.onclick = () => {
                const newName = prompt('Novo nome:', p);
                if(newName && newName.trim() !== '') {
                    // Update global name
                    people[index] = newName.trim();
                    // Update all assignments for this person?
                    // Usually yes, if it's a rename.
                    for (let key in assignments) {
                        assignments[key].forEach(a => {
                            if (a.personName === p) a.personName = newName.trim();
                        });
                    }
                    syncData();
                }
            };

            const delBtn = document.createElement('button');
            delBtn.textContent = 'X';
            delBtn.className = 'icon-btn delete-btn';
            delBtn.onclick = () => {
                if(confirm('Remover pessoa?')) {
                    people = people.filter(person => person !== p);
                    syncData();
                }
            };

            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            li.appendChild(actions);
            peopleList.appendChild(li);
        });

        // Tasks
        taskList.innerHTML = '';
        tasks.forEach((t, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="width: 10px; height: 10px; display: inline-block; background: ${t.color}; margin-right: 5px; border-radius: 2px;"></span> ${t.title}`;

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '5px';

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.className = 'icon-btn';
            editBtn.onclick = () => {
                const newName = prompt('Novo nome da tarefa:', t.title);
                if(newName && newName.trim() !== '') {
                    tasks[index].title = newName.trim();
                    // Update assignments
                    for (let key in assignments) {
                        assignments[key].forEach(a => {
                            if (a.taskId === t.id) a.title = newName.trim();
                        });
                    }
                    syncData();
                }
            };

            const delBtn = document.createElement('button');
            delBtn.textContent = 'X';
            delBtn.className = 'icon-btn delete-btn';
            delBtn.onclick = () => {
                if(confirm('Remover tarefa?')) {
                    tasks = tasks.filter(task => task.id !== t.id);
                    // Remove assignments? Or keep history?
                    // User complained about "removes from other months".
                    // But if I delete the TASK DEFINITION, it implies it's gone.
                    // If they want to remove assignments, they use "Clear Month".
                    // I will remove assignments to be consistent with "Deleting a Task".
                    for (let key in assignments) {
                        assignments[key] = assignments[key].filter(a => a.taskId !== t.id);
                        if (assignments[key].length === 0) delete assignments[key];
                    }
                    syncData();
                }
            };

            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            li.appendChild(actions);

            taskList.appendChild(li);
        });
    }

    function renderLegend() {
        legendContainer.innerHTML = '';
        
        const holidayItem = document.createElement('div');
        holidayItem.className = 'legend-item';
        holidayItem.innerHTML = `<div class="color-box" style="background-color: var(--holiday-bg)"></div> <span style="color: var(--holiday-text); font-weight: bold;">Feriado</span>`;
        legendContainer.appendChild(holidayItem);

        tasks.forEach(t => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `<div class="color-box" style="background-color: ${t.color}"></div> <span>${t.title}</span>`;
            legendContainer.appendChild(item);
        });
    }

    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatDateMonthDay(date) {
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${m}-${d}`;
    }

    function clearData() {
        if(confirm('ATENÇÃO: Isso apagará TODOS os dados do sistema (Pessoas, Tarefas e Histórico). Continuar?')) {
            people = [];
            tasks = [];
            assignments = {};
            syncData();
        }
    }

    // Modal Logic
    const modal = document.getElementById('editModal');
    const modalClose = document.querySelector('.close');
    const editTaskSelect = document.getElementById('editTaskSelect'); // Need to change to Select for Task Name?
    // Or just Input text? User said "alterar o nome" (implies text) but if it's a task, maybe it should match a known task?
    // "abra a caixa com o nome da tarefa e tbm o nome da pessoa para que eu possa alterar os dois manuais".
    // I'll provide inputs/selects.
    const editPersonSelect = document.getElementById('editPersonSelect');
    const saveEditBtn = document.getElementById('saveEditBtn');
    let currentEdit = null; // { dateKey, index }

    if (modalClose) {
        modalClose.onclick = () => modal.style.display = "none";
        window.onclick = (event) => {
            if (event.target == modal) modal.style.display = "none";
        }
    }

    function openEditModal(dateKey, index, assignment) {
        currentEdit = { dateKey, index };
        const modal = document.getElementById('editModal');

        // Populate Inputs
        // We can use a dropdown for Person to make it easier, and Input for Task Title to allow custom?
        // Or strict? User said "alterar o nome".
        // Let's use Select for Person (from existing people) and Input for Task Name.

        const taskNameInput = document.getElementById('modalTaskName');
        const personSelect = document.getElementById('modalPersonSelect');

        taskNameInput.value = assignment.title;

        personSelect.innerHTML = '';
        people.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            if(p === assignment.personName) opt.selected = true;
            personSelect.appendChild(opt);
        });

        modal.style.display = "block";
    }

    if(saveEditBtn) {
        saveEditBtn.onclick = () => {
            if (currentEdit) {
                const { dateKey, index } = currentEdit;
                const newTaskName = document.getElementById('modalTaskName').value;
                const newPerson = document.getElementById('modalPersonSelect').value;

                if (assignments[dateKey] && assignments[dateKey][index]) {
                    assignments[dateKey][index].title = newTaskName;
                    assignments[dateKey][index].personName = newPerson;
                    syncData();
                    document.getElementById('editModal').style.display = "none";
                }
            }
        };
    }
});
