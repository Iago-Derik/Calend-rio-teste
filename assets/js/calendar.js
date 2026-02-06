document.addEventListener('DOMContentLoaded', () => {
    // === CONFIGURAÇÃO SUPABASE (INSIRA SEUS DADOS AQUI) ===
    const SUPABASE_URL = 'https://iobpyyzaechoxawhcesz.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_QrtY2qU7e3AFvKigYdXLtg_oKeJsyD9';
    // =====================================================

    let currentDate = new Date();
    let people = [];
    let tasks = [];
    let assignments = {};
    let isSyncActive = localStorage.getItem('isSyncActive') !== 'false'; // Padrão true

    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const fixedHolidays = { '01-01': 'Ano Novo', '04-21': 'Tiradentes', '05-01': 'Dia do Trabalho', '09-07': 'Independência', '10-12': 'Aparecida', '11-02': 'Finados', '11-15': 'República', '12-25': 'Natal' };

    // DOM Elements
    const syncToggle = document.getElementById('syncToggle');
    const calendarGrid = document.getElementById('calendarGrid');
    // ... (restante dos elementos que você já tem)
    const monthSelect = document.getElementById('monthSelect');
    const yearDisplay = document.getElementById('yearDisplay');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
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
        
        // Configura o estado inicial do interruptor de nuvem
        syncToggle.checked = isSyncActive;
        
        if (isSyncActive) {
            connectSupabase();
        } else {
            loadLocalData();
        }
    }

    function connectSupabase() {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            loadCloudData();
            setupRealtime();
        } catch (e) {
            console.error("Erro ao conectar Supabase:", e);
        }
    }

    // Carrega dados da nuvem
    async function loadCloudData() {
        const { data, error } = await supabase.from('calendar_data').select('data').eq('id', 1).single();
        if (data) {
            applyData(data.data);
        }
    }

    // Carrega dados locais (quando nuvem está OFF)
    function loadLocalData() {
        const localData = JSON.parse(localStorage.getItem('offline_calendar_data'));
        if (localData) applyData(localData);
    }

    function applyData(data) {
        people = data.people || [];
        tasks = data.tasks || [];
        assignments = data.assignments || {};
        render();
    }

    async function saveState() {
        const stateData = { people, tasks, assignments };
        
        // Sempre salva um backup local
        localStorage.setItem('offline_calendar_data', JSON.stringify(stateData));

        if (isSyncActive && supabase) {
            await supabase.from('calendar_data').upsert({ id: 1, data: stateData });
        }
    }

    function setupEventListeners() {
        // Toggle de Sincronização
        syncToggle.addEventListener('change', (e) => {
            isSyncActive = e.target.checked;
            localStorage.setItem('isSyncActive', isSyncActive);
            if (isSyncActive) {
                connectSupabase();
            } else {
                location.reload(); // Recarrega para limpar instâncias do Supabase Realtime
            }
        });

        prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); render(); });
        nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); render(); });
        monthSelect.addEventListener('change', (e) => { currentDate.setMonth(parseInt(e.target.value)); render(); });
        addPersonBtn.addEventListener('click', addPerson);
        addTaskBtn.addEventListener('click', addTask);
        redistributeBtn.addEventListener('click', redistributeTasks);
        clearDataBtn.addEventListener('click', clearData);
        themeToggle.addEventListener('click', toggleTheme);
    }

    // ... (Mantenha as suas funções de renderização, addPerson, addTask, redistributeTasks exatamente como estavam)
    // Apenas garanta que todas chamem saveState() ao final.

    function setupRealtime() {
        if (!isSyncActive) return;
        supabase.channel('public:calendar_data')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_data', filter: 'id=eq.1' }, (payload) => {
                if (payload.new && payload.new.data) {
                    applyData(payload.new.data);
                }
            })
            .subscribe();
    }

    // Funções auxiliares de UI
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.textContent = newTheme === 'light' ? '🌙' : '☀️';
    }

    function populateMonthSelect() {
        monthSelect.innerHTML = '';
        months.forEach((m, i) => {
            const opt = document.createElement('option');
            opt.value = i; opt.textContent = m;
            monthSelect.appendChild(opt);
        });
    }

    function render() {
        monthSelect.value = currentDate.getMonth();
        yearDisplay.textContent = currentDate.getFullYear();
        renderCalendar();
        renderSidebarLists();
        renderLegend();
    }

    // Copie aqui suas funções de lógica que faltam (renderCalendar, addPerson, etc) 
    // do seu arquivo original para manter a funcionalidade.
    
    // EX:
    function addPerson() {
        const name = personInput.value.trim();
        if (name && !people.includes(name)) {
            people.push(name);
            personInput.value = '';
            saveState();
            render();
        }
    }
    
    // ... restante das funções (addTask, redistribute, renderCalendar, etc)
});
