document.addEventListener('DOMContentLoaded', () => {
    // === CONFIGURAÇÃO SUPABASE ===
    const SUPABASE_URL = 'https://iobpyyzaechoxawhcesz.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvYnB5eXphZWNob3hhd2hjZXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDE4MjksImV4cCI6MjA4NTkxNzgyOX0.GuWWYKvEHChowEGa9-iDA6D3Pc8a1R-jCEfm4q_cKVg';

    let currentDate = new Date();
    let people = [];
    let tasks = [];
    let assignments = {};
    let isSyncActive = localStorage.getItem('isSyncActive') === 'true';

    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    // Elementos DOM
    const syncToggle = document.getElementById('syncToggle');
    const taskTypeSelect = document.getElementById('taskType');
    const calendarGrid = document.getElementById('calendarGrid');

    // Inicialização
    init();

    async function init() {
        initTheme();
        populateMonthSelect();
        setupEventListeners();
        
        syncToggle.checked = isSyncActive;
        
        if (isSyncActive) {
            connectSupabase();
        } else {
            loadLocalData();
        }
        
        // Pinta os dias inicialmente com base na seleção padrão
        setTimeout(highlightDistributionDays, 500);
    }

    function connectSupabase() {
        try {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            loadCloudData();
            setupRealtime();
        } catch (e) {
            console.error("Erro Supabase:", e);
            loadLocalData();
        }
    }

    async function loadCloudData() {
        const { data } = await window.supabaseClient.from('calendar_data').select('data').eq('id', 1).single();
        if (data) applyData(data.data);
    }

    function loadLocalData() {
        const local = localStorage.getItem('offline_calendar_data');
        if (local) applyData(JSON.parse(local));
        else render();
    }

    function applyData(data) {
        people = data.people || [];
        tasks = data.tasks || [];
        assignments = data.assignments || {};
        render();
    }

    async function saveState() {
        const state = { people, tasks, assignments };
        localStorage.setItem('offline_calendar_data', JSON.stringify(state));
        if (isSyncActive && window.supabaseClient) {
            await window.supabaseClient.from('calendar_data').upsert({ id: 1, data: state });
        }
    }

    // Função para destacar dias Pares/Ímpares
    function highlightDistributionDays() {
        const type = taskTypeSelect.value;
        const days = document.querySelectorAll('.calendar-day:not(.empty)');
        
        days.forEach(dayEl => {
            const dayNum = parseInt(dayEl.querySelector('.day-number').textContent);
            dayEl.classList.remove('highlight-dist');

            if (type === 'even' && dayNum % 2 === 0) dayEl.classList.add('highlight-dist');
            if (type === 'odd' && dayNum % 2 !== 0) dayEl.classList.add('highlight-dist');
            if (type === 'random') dayEl.classList.add('highlight-dist');
        });
    }

    function setupEventListeners() {
        // Toggle de Sincronização
        syncToggle.addEventListener('change', (e) => {
            isSyncActive = e.target.checked;
            localStorage.setItem('isSyncActive', isSyncActive);
            location.reload(); // Recarrega para ativar/desativar conexão
        });

        // Ouvinte para mudar a "pintura" dos dias ao trocar a opção
        taskTypeSelect.addEventListener('change', highlightDistributionDays);

        // Seus outros botões (simplificado para brevidade, mantenha suas lógicas originais)
        document.getElementById('addPersonBtn').onclick = () => {
            const val = document.getElementById('personInput').value.trim();
            if(val) { people.push(val); document.getElementById('personInput').value=''; saveState(); render(); }
        };

        document.getElementById('addTaskBtn').onclick = () => {
            // ... sua lógica de addTask aqui ...
            // Ao final, chame saveState() e render()
            saveState();
            render();
        };

        document.getElementById('prevMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth()-1); render(); };
        document.getElementById('nextMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth()+1); render(); };
        // Mantenha os binds dos outros botões conforme seu código original...
    }

    function render() {
        renderCalendar();
        // Chame aqui suas outras funções de renderização (sidebar, legendas, etc)
        highlightDistributionDays(); // Garante que a pintura se mantenha após o render
    }

    function renderCalendar() {
        // Sua lógica de renderCalendar original aqui...
        // No loop de criação dos dias, certifique-se de manter a estrutura:
        // const el = document.createElement('div'); el.className = 'calendar-day';
        // el.innerHTML = `<div class="day-number">${d}</div>`;
    }

    // Mantenha o restante das suas funções auxiliares (formatDate, Realtime, etc)
});
