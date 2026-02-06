document.addEventListener('DOMContentLoaded', () => {
    // === CONFIGURAÇÃO SUPABASE (INSIRA SEUS DADOS AQUI) ===
    const SUPABASE_URL = 'https://iobpyyzaechoxawhcesz.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvYnB5eXphZWNob3hhd2hjZXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDE4MjksImV4cCI6MjA4NTkxNzgyOX0.GuWWYKvEHChowEGa9-iDA6D3Pc8a1R-jCEfm4q_cKVg';
    // =====================================================

    let currentDate = new Date();
    let people = [];
    let tasks = [];
    let assignments = {};
    let isSyncActive = localStorage.getItem('isSyncActive') !== 'false';

    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const fixedHolidays = { '01-01': 'Ano Novo', '04-21': 'Tiradentes', '05-01': 'Dia do Trabalho', '09-07': 'Independência', '10-12': 'Aparecida', '11-02': 'Finados', '11-15': 'República', '12-25': 'Natal' };

    // DOM Elements
    const syncToggle = document.getElementById('syncToggle');
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
    const editModal = document.getElementById('editModal');
    const closeModalSpan = document.querySelector('.close-modal');
    const saveEditBtn = document.getElementById('saveEditBtn');

    let supabase = null;

    init();

    async function init() {
        initTheme();
        populateMonthSelect();
        setupEventListeners();
        setupModalListeners();
        
        syncToggle.checked = isSyncActive;
        
        if (isSyncActive && SUPABASE_URL !== 'https://SEU_PROJETO.supabase.co') {
            connectSupabase();
        } else {
            loadLocalData();
        }
    }

    // --- LOGICA DE DADOS (SUPABASE & LOCAL) ---

    function connectSupabase() {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            loadCloudData();
            setupRealtime();
        } catch (e) {
            console.error("Erro Supabase:", e);
            loadLocalData();
        }
    }

    async function loadCloudData() {
        try {
            const { data, error } = await supabase.from('calendar_data').select('data').eq('id', 1).single();
            if (data && data.data) applyData(data.data);
            else saveState(); // Cria o primeiro registro se estiver vazio
        } catch (e) { console.log("Erro ao carregar nuvem, usando local."); loadLocalData(); }
    }

    function loadLocalData() {
        const localData = JSON.parse(localStorage.getItem('offline_calendar_data'));
        if (localData) applyData(localData);
        else render();
    }

    function applyData(data) {
        people = data.people || [];
        tasks = data.tasks || [];
        assignments = data.assignments || {};
        render();
    }

    async function saveState() {
        const stateData = { people, tasks, assignments };
        localStorage.setItem('offline_calendar_data', JSON.stringify(stateData));
        if (isSyncActive && supabase) {
            await supabase.from('calendar_data').upsert({ id: 1, data: stateData });
        }
    }

    function setupRealtime() {
        if (!isSyncActive || !supabase) return;
        supabase.channel('public:calendar_data')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_data', filter: 'id=eq.1' }, (payload) => {
                if (payload.new && payload.new.data) applyData(payload.new.data);
            }).subscribe();
    }

    // --- LOGICA DO CALENDÁRIO ---

    function render() {
        monthSelect.value = currentDate.getMonth();
        yearDisplay.textContent = currentDate.getFullYear();
        renderCalendar();
        renderSidebarLists();
        renderLegend();
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
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const el = document.createElement('div');
            el.className = 'calendar-day empty';
            calendarGrid.appendChild(el);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateKey = formatDate(date);
            const holidayKey = `${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            const el = document.createElement('div');
            el.className = 'calendar-day';
            if (fixedHolidays[holidayKey]) {
                el.classList.add('holiday');
                el.title = fixedHolidays[holidayKey];
            }

            el.innerHTML = `<div class="day-number">${d}</div>`;

            if (assignments[dateKey]) {
                assignments[dateKey].forEach((assign, index) => {
                    const taskEl = document.createElement('div');
                    taskEl.className = 'task-item';
                    taskEl.style.backgroundColor = assign.color;
                    taskEl.textContent = `${assign.title} (${assign.personName})`;
                    taskEl.onclick = (e) => { e.stopPropagation(); openEditModal(dateKey, index, assign); };
                    el.appendChild(taskEl);
                });
            }
            calendarGrid.appendChild(el);
        }
    }

    // --- AÇÕES ---

    function addPerson() {
        const name = personInput.value.trim();
        if (name && !people.includes(name)) {
            people.push(name);
            personInput.value = '';
            saveState();
            render();
        }
    }

    function addTask() {
        const title = taskInput.value.trim();
        if (!title || people.length === 0) return alert("Adicione pessoas e dê um título à tarefa.");
        const newTask = { id: Date.now(), title, color: taskColor.value, type: taskType.value };
        tasks.push(newTask);
        distributeTask(newTask);
        taskInput.value = '';
        saveState();
        render();
    }

    function distributeTask(task) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let lastPerson = null;

        for (let d = 1; d <= daysInMonth; d++) {
            if ((task.type === 'even' && d % 2 !== 0) || (task.type === 'odd' && d % 2 === 0)) continue;
            
            const dateKey = formatDate(new Date(year, month, d));
            let available = people.filter(p => {
                const isBusy = assignments[dateKey] && assignments[dateKey].some(a => a.personName === p);
                return !isBusy && p !== lastPerson;
            });

            if (available.length === 0) available = people.filter(p => !(assignments[dateKey] && assignments[dateKey].some(a => a.personName === p)));

            if (available.length > 0) {
                const chosen = available[Math.floor(Math.random() * available.length)];
                if (!assignments[dateKey]) assignments[dateKey] = [];
                assignments[dateKey].push({ taskId: task.id, title: task.title, color: task.color, personName: chosen });
                lastPerson = chosen;
            }
        }
    }

    function redistributeTasks() {
        if (!confirm("Redistribuir tudo este mês?")) return;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        for (let d = 1; d <= 31; d++) delete assignments[formatDate(new Date(year, month, d))];
        tasks.forEach(t => distributeTask(t));
        saveState();
        render();
    }

    // --- AUXILIARES E UI ---

    function setupEventListeners() {
        syncToggle.addEventListener('change', (e) => {
            localStorage.setItem('isSyncActive', e.target.checked);
            location.reload();
        });
        prevMonthBtn.onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); render(); };
        nextMonthBtn.onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); render(); };
        monthSelect.onchange = (e) => { currentDate.setMonth(parseInt(e.target.value)); render(); };
        addPersonBtn.onclick = addPerson;
        addTaskBtn.onclick = addTask;
        redistributeBtn.onclick = redistributeTasks;
        clearDataBtn.onclick = () => { if(confirm("Limpar tudo?")) { people=[]; tasks=[]; assignments={}; saveState(); render(); }};
        themeToggle.onclick = toggleTheme;
    }

    function renderSidebarLists() {
        peopleList.innerHTML = people.map(p => `<li>${p} <button onclick="window.removePerson('${p}')" style="background:none; border:none; color:red; cursor:pointer">❌</button></li>`).join('');
        taskList.innerHTML = tasks.map(t => `<li><span style="background:${t.color}; width:10px; height:10px; display:inline-block"></span> ${t.title}</li>`).join('');
    }

    window.removePerson = (name) => { people = people.filter(p => p !== name); saveState(); render(); };

    function renderLegend() {
        legendContainer.innerHTML = tasks.map(t => `<div class="legend-item"><div class="color-box" style="background:${t.color}"></div><span>${t.title}</span></div>`).join('');
    }

    function formatDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

    function populateMonthSelect() { monthSelect.innerHTML = months.map((m, i) => `<option value="${i}">${m}</option>`).join(''); }

    function initTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    }

    function toggleTheme() {
        const now = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', now);
        localStorage.setItem('theme', now);
        themeToggle.textContent = now === 'light' ? '🌙' : '☀️';
    }

    function setupModalListeners() {
        closeModalSpan.onclick = () => editModal.style.display = "none";
        window.onclick = (e) => { if(e.target == editModal) editModal.style.display = "none"; };
    }
    
    function openEditModal(dateKey, index, assign) {
        document.getElementById('editDateKey').value = dateKey;
        document.getElementById('editIndex').value = index;
        document.getElementById('editTaskTitle').value = assign.title;
        document.getElementById('editPersonName').value = assign.personName;
        document.getElementById('editColor').value = assign.color;
        editModal.style.display = "block";
    }

    saveEditBtn.onclick = () => {
        const dKey = document.getElementById('editDateKey').value;
        const idx = document.getElementById('editIndex').value;
        assignments[dKey][idx].title = document.getElementById('editTaskTitle').value;
        assignments[dKey][idx].personName = document.getElementById('editPersonName').value;
        assignments[dKey][idx].color = document.getElementById('editColor').value;
        saveState(); render(); editModal.style.display = "none";
    };
});
    
    // ... restante das funções (addTask, redistribute, renderCalendar, etc)
});
