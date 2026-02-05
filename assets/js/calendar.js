document.addEventListener('DOMContentLoaded', () => {
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
    const redistributeBtn = document.getElementById('redistributeBtn');
    const taskList = document.getElementById('taskList');
    const legendContainer = document.getElementById('legendContainer');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const themeToggle = document.getElementById('themeToggle');

    // Modal Elements
    const editModal = document.getElementById('editModal');
    const closeModalSpan = document.querySelector('.close-modal');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const editDateKeyInput = document.getElementById('editDateKey');
    const editIndexInput = document.getElementById('editIndex');
    const editTaskTitleInput = document.getElementById('editTaskTitle');
    const editPersonNameInput = document.getElementById('editPersonName');
    const editColorInput = document.getElementById('editColor');

    // Initialize
    init();

    function init() {
        try {
            initTheme();
            populateMonthSelect();
            setupEventListeners();
            setupModalListeners();

            // Check global variables safely
            if (window.isFirebaseInitialized && window.db) {
                setupFirebaseListeners();
            } else {
                console.log("Inicializando em modo LocalStorage (Firebase não ativo).");
                loadFromLocalStorage();
                render();
            }
        } catch (e) {
            console.error("Erro crítico na inicialização:", e);
            // Fallback de emergência para garantir que algo apareça
            loadFromLocalStorage();
            render();
        }
    }

    // --- DATA HANDLING (Firebase vs LocalStorage) ---

    function setupFirebaseListeners() {
        // Listen to 'calendar_data' collection, document 'main_v1'
        window.db.collection("calendar_data").doc("main_v1")
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    people = data.people || [];
                    tasks = data.tasks || [];
                    assignments = data.assignments || {};
                    render();
                } else {
                    // Document doesn't exist yet, initialize it
                    saveState();
                }
            }, (error) => {
                console.error("Erro ao receber dados do Firebase:", error);
                // Fallback se a conexão cair ou falhar
                loadFromLocalStorage();
                render();
            });
    }

    function loadFromLocalStorage() {
        people = JSON.parse(localStorage.getItem('calendar_people')) || [];
        tasks = JSON.parse(localStorage.getItem('calendar_tasks')) || [];
        assignments = JSON.parse(localStorage.getItem('calendar_assignments')) || {};
    }

    function saveState() {
        const dataToSave = {
            people,
            tasks,
            assignments
        };

        if (window.isFirebaseInitialized && window.db) {
            window.db.collection("calendar_data").doc("main_v1").set(dataToSave)
                .catch((error) => {
                    console.error("Erro ao salvar no Firebase:", error);
                    alert("Erro ao salvar online. Verifique o console.");
                });
        } else {
            localStorage.setItem('calendar_people', JSON.stringify(people));
            localStorage.setItem('calendar_tasks', JSON.stringify(tasks));
            localStorage.setItem('calendar_assignments', JSON.stringify(assignments));
        }
    }

    // --- UI LOGIC ---

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
        redistributeBtn.addEventListener('click', redistributeTasks);
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

    function setupModalListeners() {
        if (!closeModalSpan) return;

        closeModalSpan.onclick = () => {
            editModal.style.display = "none";
        };

        window.onclick = (event) => {
            if (event.target == editModal) {
                editModal.style.display = "none";
            }
        };

        saveEditBtn.onclick = () => {
            const dateKey = editDateKeyInput.value;
            const index = parseInt(editIndexInput.value);
            const newTitle = editTaskTitleInput.value.trim();
            const newPerson = editPersonNameInput.value.trim();
            const newColor = editColorInput.value;

            if (newTitle && newPerson && assignments[dateKey] && assignments[dateKey][index]) {
                assignments[dateKey][index].title = newTitle;
                assignments[dateKey][index].personName = newPerson;
                assignments[dateKey][index].color = newColor;
                saveState();
                render();
                editModal.style.display = "none";
            } else {
                alert("Por favor, preencha os campos corretamente.");
            }
        };
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
    }

    function addPerson() {
        const name = personInput.value.trim();
        if (name && !people.includes(name)) {
            people.push(name);
            personInput.value = '';
            saveState();
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
        saveState();
        render();
    }

    function redistributeTasks() {
        if (tasks.length === 0) {
            alert("Não há tarefas criadas.");
            return;
        }
        if (people.length === 0) {
            alert("Não há pessoas adicionadas.");
            return;
        }

        if (confirm("Isso irá redistribuir todas as tarefas para este mês. As atribuições automáticas existentes neste mês serão substituídas. Continuar?")) {
            clearAssignmentsForMonth();
            tasks.forEach(task => distributeTask(task));
            saveState();
            render();
        }
    }

    function clearAssignmentsForMonth() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateKey = formatDate(date);
            if (assignments[dateKey]) {
                delete assignments[dateKey];
            }
        }
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
                assignments[dateKey].forEach((assign, index) => {
                    const taskEl = document.createElement('div');
                    taskEl.className = 'task-item';
                    taskEl.style.backgroundColor = assign.color;
                    taskEl.textContent = `${assign.title} (${assign.personName})`;
                    taskEl.title = `${assign.title} - ${assign.personName}`;

                    // Click to Edit
                    taskEl.onclick = (e) => {
                        e.stopPropagation();
                        openEditModal(dateKey, index, assign);
                    };

                    el.appendChild(taskEl);
                });
            }

            calendarGrid.appendChild(el);
        }
    }

    function openEditModal(dateKey, index, assign) {
        editDateKeyInput.value = dateKey;
        editIndexInput.value = index;
        editTaskTitleInput.value = assign.title;
        editPersonNameInput.value = assign.personName;
        editColorInput.value = assign.color;

        editModal.style.display = "block";
    }

    function removeTaskFromMonth(taskId) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let changed = false;
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateKey = formatDate(date);
            if (assignments[dateKey]) {
                const initialLen = assignments[dateKey].length;
                assignments[dateKey] = assignments[dateKey].filter(a => a.taskId !== taskId);
                if (assignments[dateKey].length !== initialLen) changed = true;
                if (assignments[dateKey].length === 0) delete assignments[dateKey];
            }
        }

        if (changed) {
            saveState();
            render();
        }
    }

    function deleteTaskGlobal(taskId) {
        tasks = tasks.filter(task => task.id !== taskId);
        // Remove assignments for this task everywhere
        for (let key in assignments) {
            assignments[key] = assignments[key].filter(a => a.taskId !== taskId);
            if (assignments[key].length === 0) delete assignments[key];
        }
        saveState();
        render();
    }

    function editPersonName(oldName, newName) {
        // Update list
        const idx = people.indexOf(oldName);
        if (idx !== -1) people[idx] = newName;

        // Update assignments
        for (let key in assignments) {
            assignments[key].forEach(a => {
                if (a.personName === oldName) {
                    a.personName = newName;
                }
            });
        }
        saveState();
        render();
    }

    function editTaskTitle(taskId, newTitle) {
        const task = tasks.find(t => t.id === taskId);
        if (task) task.title = newTitle;

        // Update assignments title
        for (let key in assignments) {
            assignments[key].forEach(a => {
                if (a.taskId === taskId) {
                    a.title = newTitle;
                }
            });
        }
        saveState();
        render();
    }

    function renderSidebarLists() {
        // People
        peopleList.innerHTML = '';
        people.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p;

             const actionsDiv = document.createElement('div');
            actionsDiv.style.marginLeft = 'auto';
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '5px';

            // Edit Person
            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.title = "Editar Nome";
            editBtn.style.border = 'none';
            editBtn.style.background = 'transparent';
            editBtn.style.cursor = 'pointer';
            editBtn.onclick = () => {
                const newName = prompt('Novo nome para ' + p, p);
                if (newName && newName.trim() !== '' && newName !== p) {
                    editPersonName(p, newName.trim());
                }
            };

            const btn = document.createElement('button');
            btn.textContent = '❌';
            btn.style.color = 'red';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
            btn.style.cursor = 'pointer';
            btn.onclick = () => {
                people = people.filter(person => person !== p);
                saveState();
                render();
            };

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(btn);
            li.appendChild(actionsDiv);
            peopleList.appendChild(li);
        });

        // Tasks (definitions)
        taskList.innerHTML = '';
        tasks.forEach(t => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="width: 10px; height: 10px; display: inline-block; background: ${t.color}; margin-right: 5px; border-radius: 2px;"></span> ${t.title} [${t.type === 'random' ? 'Todos os dias' : (t.type === 'even' ? 'Pares' : 'Ímpares')}]`;

            const actionsDiv = document.createElement('div');
            actionsDiv.style.marginLeft = 'auto';
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '5px';

            // Edit Task
            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.title = "Editar Tarefa";
            editBtn.style.border = 'none';
            editBtn.style.background = 'transparent';
            editBtn.style.cursor = 'pointer';
            editBtn.onclick = () => {
                const newTitle = prompt('Novo título para ' + t.title, t.title);
                if (newTitle && newTitle.trim() !== '' && newTitle !== t.title) {
                    editTaskTitle(t.id, newTitle.trim());
                }
            };

            // Remove from Month (X)
            const removeMonthBtn = document.createElement('button');
            removeMonthBtn.textContent = '❌';
            removeMonthBtn.title = "Remover atribuições deste mês";
            removeMonthBtn.style.color = 'red';
            removeMonthBtn.style.border = 'none';
            removeMonthBtn.style.background = 'transparent';
            removeMonthBtn.style.cursor = 'pointer';
            removeMonthBtn.onclick = () => {
                 if(confirm(`Remover tarefas "${t.title}" deste mês?`)) {
                    removeTaskFromMonth(t.id);
                 }
            };

            // Delete Global (Trash)
            const deleteGlobalBtn = document.createElement('button');
            deleteGlobalBtn.textContent = '🗑️';
            deleteGlobalBtn.title = "Apagar tarefa permanentemente";
            deleteGlobalBtn.style.border = 'none';
            deleteGlobalBtn.style.background = 'transparent';
            deleteGlobalBtn.style.cursor = 'pointer';
            deleteGlobalBtn.onclick = () => {
                 if(confirm(`Apagar tarefa "${t.title}" permanentemente?`)) {
                     deleteTaskGlobal(t.id);
                 }
            };

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(removeMonthBtn);
            actionsDiv.appendChild(deleteGlobalBtn);
            li.appendChild(actionsDiv);

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
            people = [];
            tasks = [];
            assignments = {};
            saveState(); // Sync clear to server
        }
    }
});
