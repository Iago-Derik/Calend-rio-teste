document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentDate = new Date();
    let people = JSON.parse(localStorage.getItem('calendar_people')) || [];
    let tasks = JSON.parse(localStorage.getItem('calendar_tasks')) || [];
    // assignments: { 'YYYY-MM-DD': [ { taskId, personName, color, title } ] }
    let assignments = JSON.parse(localStorage.getItem('calendar_assignments')) || {};

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // Holidays (Fixed for Brazil as example, can be expanded)
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
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const legendContainer = document.getElementById('legendContainer');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const themeToggle = document.getElementById('themeToggle');

    // Initialize
    init();

    function init() {
        initTheme();
        populateMonthSelect();
        render();
        setupEventListeners();
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
        clearDataBtn.addEventListener('click', clearData);

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

        // Save State
        saveState();

        // Render Components
        renderCalendar();
        renderSidebarLists();
        renderLegend();
    }

    function saveState() {
        localStorage.setItem('calendar_people', JSON.stringify(people));
        localStorage.setItem('calendar_tasks', JSON.stringify(tasks));
        localStorage.setItem('calendar_assignments', JSON.stringify(assignments));
    }

    function addPerson() {
        const name = personInput.value.trim();
        if (name && !people.includes(name)) {
            people.push(name);
            personInput.value = '';
            render();
        } else if (people.includes(name)) {
            alert('Essa pessoa já foi adicionada.');
        }
    }

    function addTask() {
        const title = taskInput.value.trim();
        const color = taskColor.value;
        const type = taskType.value; // 'even', 'odd', 'random'

        if (!title) {
            alert('Por favor, digite o nome da tarefa.');
            return;
        }

        if (people.length === 0) {
            alert('Adicione pelo menos uma pessoa antes de criar tarefas.');
            return;
        }

        const newTask = {
            id: Date.now(),
            title,
            color,
            type
        };

        tasks.push(newTask);
        distributeTask(newTask);
        
        taskInput.value = '';
        render();
    }

    function distributeTask(task) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
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
        
        // Days of week headers
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
            const dayKey = formatDateMonthDay(date); // MM-DD for holidays

            const el = document.createElement('div');
            el.className = 'calendar-day';
            
            // Holiday Check
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
                assignments[dateKey].forEach(assign => {
                    const taskEl = document.createElement('div');
                    taskEl.className = 'task-item';
                    taskEl.style.backgroundColor = assign.color;
                    taskEl.textContent = `${assign.title} (${assign.personName})`;
                    taskEl.title = `${assign.title} - ${assign.personName}`;
                    el.appendChild(taskEl);
                });
            }

            calendarGrid.appendChild(el);
        }
    }

    function renderSidebarLists() {
        // People
        peopleList.innerHTML = '';
        people.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p;
            const btn = document.createElement('button');
            btn.textContent = 'X';
            btn.onclick = () => {
                people = people.filter(person => person !== p);
                // Also remove assignments for this person to keep data clean?
                // Or keep history. Let's keep history but maybe warn.
                // For this request, I'll just remove person from list.
                render();
            };
            li.appendChild(btn);
            peopleList.appendChild(li);
        });

        // Tasks (definitions)
        taskList.innerHTML = '';
        tasks.forEach(t => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="width: 10px; height: 10px; display: inline-block; background: ${t.color}; margin-right: 5px; border-radius: 2px;"></span> ${t.title} [${t.type === 'random' ? 'Todos os dias' : (t.type === 'even' ? 'Pares' : 'Ímpares')}]`;

            const btn = document.createElement('button');
            btn.textContent = 'X';
            btn.style.marginLeft = 'auto'; // push to right
            btn.style.color = 'red';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
            btn.style.cursor = 'pointer';
            btn.onclick = () => {
                tasks = tasks.filter(task => task.id !== t.id);
                // Remove assignments for this task
                for (let key in assignments) {
                    assignments[key] = assignments[key].filter(a => a.taskId !== t.id);
                    if (assignments[key].length === 0) delete assignments[key];
                }
                render();
            };
            li.appendChild(btn);

            taskList.appendChild(li);
        });
    }

    function renderLegend() {
        legendContainer.innerHTML = '';
        
        // Holiday Legend
        const holidayItem = document.createElement('div');
        holidayItem.className = 'legend-item';
        holidayItem.innerHTML = `<div class="color-box" style="background-color: var(--holiday-bg)"></div> <span style="color: var(--holiday-text); font-weight: bold;">Feriado</span>`;
        legendContainer.appendChild(holidayItem);

        // Tasks Legend
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
        if(confirm('Tem certeza que deseja limpar todos os dados (pessoas, tarefas e calendário)?')) {
            // Keep theme
            const theme = localStorage.getItem('theme');
            localStorage.clear();
            if(theme) localStorage.setItem('theme', theme);
            location.reload();
        }
    }
});
