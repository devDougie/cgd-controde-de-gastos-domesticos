// ===== 🌐 VARIÁVEIS GLOBAIS =====
let expenses = [];
let expenseIdToPay = null;
let expenseIdToUpdate = null;
let expenseIdToEdit = null;
let expenseIdToDelete = null;

let currentExportFormat = "json";
let currentImportFormat = "json";
let currentImportMode = "replace";

let chartMonthlyTrend, chartByCategory, chartByStatus, chartByResponsible, chartTop5;

const currentFilters = {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    category: 'Todas',
    status: 'Todos',
    responsible: 'Todos',
    sort: 'Vencimento',
    paymentMethod: 'Todos'
};

const validationConfigs = {
    addExpense: {
        modalSelector: '#add-modal',
        fields: [
            { id: 'expenseDescription', type: 'text', minLength: 3, label: 'Descrição' },
            { id: 'expenseCategory', type: 'select', label: 'Categoria' },
            { id: 'expenseResponsible', type: 'text', minLength: 2, label: 'Responsável' },
            { id: 'expenseValue', type: 'number', label: 'Valor' },
            { id: 'expenseInstallments', type: 'number', maxValue: 100, label: 'Parcelas' }
        ]
    },
    editExpense: {
        modalSelector: '#edit-modal',
        fields: [
            { id: 'editExpenseDescription', type: 'text', minLength: 3, label: 'Descrição' },
            { id: 'editExpenseCategory', type: 'select', label: 'Categoria' },
            { id: 'editExpenseResponsible', type: 'text', minLength: 2, label: 'Responsável' },
            { id: 'editExpenseValue', type: 'number', label: 'Valor' },
            { id: 'editExpenseInstallments', type: 'number', maxValue: 100, label: 'Parcelas' }
        ]
    },
    updateExpense: {
        modalSelector: '#update-modal',
        fields: [
            { id: 'updateValue', type: 'number', label: 'Valor' },
            { id: 'updateInstallments', type: 'number', maxValue: 100, label: 'Parcelas' }
        ],
        customValidations: [
            () => {
                const expense = expenses.find(e => e.id === expenseIdToUpdate);
                if (!expense) {
                    return { valid: false, message: 'Despesa não encontrada' };
                }

                const originalDate = parseDate(expense.vencimento);
                const firstInput = document.querySelector('#updateInstallmentsTableBody input[type="date"]');

                if (firstInput) {
                    const firstNewDate = parseDate(firstInput.value);
                    if (firstNewDate <= originalDate) {
                        return {
                            valid: false,
                            message: 'A primeira parcela deve ter vencimento posterior à despesa original'
                        };
                    }
                }

                return { valid: true };
            }
        ]
    },
    payExpense: {
        modalSelector: '#payment-modal',
        fields: [
            { id: 'paymentMethodSelect', type: 'select', label: 'Forma de Pagamento' }
        ]
    }
};

// ===== 🔧 INICIALIZAÇÃO E TEMA DO SISTEMA =====
document.addEventListener('DOMContentLoaded', function () {
    initializeSystem();
});

function initializeSystem() {
    loadExpensesFromStorage();
    setCurrentDate();
    populateFilters();
    setupAllFiltersListeners();
    setupDateInputsValidation();
    setupModalListeners();
    updateSummary('dashboard');
    renderTable('dashboard');
    checkOverdueExpenses();

    if (expenses.length === 0) {
        showModal('welcomeModal');
    }
}

function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const modeText = document.getElementById('modeText');

    body.classList.toggle('dark-mode');
    themeToggle.classList.toggle('dark');

    if (body.classList.contains('dark-mode')) {
        modeText.textContent = '🌙 Modo Escuro';
        localStorage.setItem('theme', 'dark');
    } else {
        modeText.textContent = '☀️ Modo Claro';
        localStorage.setItem('theme', 'light');
    }

    updateSummary('dashboard');
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').classList.add('dark');
        document.getElementById('modeText').textContent = '🌙 Modo Escuro';
    }
}

// ===== 💰 FORMATAÇÃO E UTILITÁRIOS =====
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(value);
}

function formatDate(date) {
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split("-");
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    }
    return new Date(date).toLocaleDateString('pt-BR');
}

function parseDate(yyyyMMdd) {
    if (!yyyyMMdd) return null;
    const [year, month, day] = yyyyMMdd.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function dayAfter(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    return newDate;
}

function dayBefore(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    return newDate;
}

function toYMD(date) {
    return date.toISOString().split('T')[0];
}

// ===== 🧭 NAVEGAÇÃO E INTERFACE =====
function navigateTo(pageId) {
    document.querySelectorAll('.nav__item').forEach(item => item.classList.remove('nav__item--active'));
    const navItem = document.querySelector(`[data-page="${pageId}"]`);

    if (navItem) navItem.classList.add('nav__item--active');

    document.querySelectorAll('.page').forEach(page => page.classList.remove('page--active'));

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('page--active');
        targetPage.scrollTo(0, 0);
        window.scrollTo(0, 0);
    }

    if (pageId === 'dashboard-page') {
        clearFilters('dashboard');
        updateSummary('dashboard');
        renderTable('dashboard');
    } else if (pageId === 'edit-page') {
        clearFilters('edit');
        updateSummary('edit');
        renderTable('edit');
    } else if (pageId === 'payment-page') {
        clearFilters('pending');
        updateSummary('pending');
        renderTable('pending');
    } else if (pageId === 'backup-page') {
        updateSummary('backup');
        resetBackupForms();
        selectFormat('export', 'json');
        generateDefaultBackupFileName();
        selectFormat('import', 'json');
        selectImportMode("replace");
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
            const modalContent = modal.querySelector('.modal');
            if (modalContent) {
                modalContent.scrollTop = 0;
            }
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);

        if (modalId === 'add-modal') {
            resetNewExpenseForm();
        }
    }
}

function refreshCurrentPage() {
    const activePage = document.querySelector('.page.page--active');
    if (!activePage) return;

    populateFilters();
    const pageId = activePage.id;

    if (pageId === 'dashboard-page') {
        updateSummary('dashboard');
        renderTable('dashboard');
    } else if (pageId === 'edit-page') {
        updateSummary('edit');
        renderTable('edit');
    } else if (pageId === 'payment-page') {
        updateSummary('pending');
        renderTable('pending');
    } else if (pageId === 'backup-page') {
        updateSummary('backup');
    }
}

function confirmExit() {
    if (confirm('Tem certeza que deseja sair do sistema?')) {
        saveExpensesToStorage();
        alert('Sistema finalizado com segurança. Todos os dados foram salvos.');
        closeModal('exit-modal');
        window.close();
    }
}

// ===== 📊 GRÁFICOS E RESUMOS =====
function renderCharts(filteredExpenses, yearlyExpenses) {
    const validFilteredExpenses = filteredExpenses.filter(e => e.transferenciaEfetuda !== "sim");
    const validYearlyExpenses = yearlyExpenses.filter(e => e.transferenciaEfetuda !== "sim");

    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    const monthName = document.getElementById('monthSelect').options[document.getElementById('monthSelect').selectedIndex].text;
    const selectedYear = document.getElementById('yearSelect').value;
    const periodText = `${monthName}/${selectedYear}`;

    const isDarkMode = document.body.classList.contains('dark-mode');

    const legendTextColor = isDarkMode ? '#ffffff' : 'var(--color-dark-gray)';

    const titleTrend = document.querySelector('.chart--line .chart__title');
    if (titleTrend) titleTrend.textContent = `Evolução das Despesas Mensais (${selectedYear})`;
    const titleCategory = document.querySelector('.chart--doughnut .chart__title');
    if (titleCategory) titleCategory.textContent = `Distribuição por Categoria de Despesa (${periodText})`;
    const titleStatus = document.querySelector('.chart--status .chart__title');
    if (titleStatus) titleStatus.textContent = `Situação de Pagamentos de Despesas (${periodText})`;
    const titleResponsible = document.querySelector('.chart--column .chart__title');
    if (titleResponsible) titleResponsible.textContent = `Despesas por Responsável (${periodText})`;
    const titleTop5 = document.querySelector('.chart--top5 .chart__title');
    if (titleTop5) titleTop5.textContent = `Top 5 — Maiores Despesas (${periodText})`;
    const titleCalendar = document.querySelector('.chart--calendar .chart__title');
    if (titleCalendar) titleCalendar.textContent = `Calendário de Vencimentos (${periodText})`;

    const palette10 = [
        '#3b82f6', '#ef4444',
        '#10b981', '#f59e0b',
        '#fcd34d', '#8b5cf6',
        '#93c5fd', '#fca5a5',
        '#6ee7b7', '#c4b5fd'
    ];

    // --- 1. Evolução Mensal (Line) ---
    if (titleTrend) titleTrend.textContent = `Evolução das Despesas Mensais (${selectedYear})`;

    const monthlyTotals = Array(12).fill(0);
    validYearlyExpenses.forEach(e => {
        const d = parseDate(e.vencimento);
        if (d) monthlyTotals[d.getMonth()] += e.valorOriginal;
    });

    const ctxMonthly = document.getElementById('chartByMonthlyTrendContainer');
    if (chartMonthlyTrend) chartMonthlyTrend.destroy();

    const hasDataForYear = monthlyTotals.some(valor => valor > 0);

    if (!hasDataForYear) {
        ctxMonthly.innerHTML = `
            <div class="chart__placeholder" style="display:flex; align-items:center; justify-content:center; height:100%; color:#666;">
                Nenhuma despesa encontrada para os filtros selecionados.
            </div>`;
    } else {
        ctxMonthly.innerHTML = `<canvas id="chartMonthlyTrend"></canvas>`;
        const newCtx = document.getElementById('chartMonthlyTrend').getContext('2d');
        chartMonthlyTrend = new Chart(newCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{
                    label: 'Gastos Mensais',
                    data: monthlyTotals,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 4,
                    pointRadius: 6,
                    pointHoverRadius: 4,
                    pointBorderWidth: 2,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: false,
                            boxWidth: 16,
                            boxHeight: 2,
                            borderRadius: 4,
                            font: { size: 14, weight: 'bold' },
                            color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#444',
                            useBorderRadius: true,
                            borderColor: '#ffffff',
                            borderWidth: 2
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => 'R$ ' + context.parsed.y.toLocaleString('pt-BR')
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { display: true },
                        border: { display: false },
                        ticks: {
                            color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#444',
                            callback: (value) => 'R$ ' + value.toLocaleString('pt-BR')
                        }
                    },
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#444'
                        }
                    }
                }
            }
        });
    }

    // --- 2. Despesas por Categoria (Donut) ---
    const categoryTotals = {};
    validFilteredExpenses.forEach(e => {
        categoryTotals[e.categoria] = (categoryTotals[e.categoria] || 0) + e.valorOriginal;
    });

    const ctxCategory = document.getElementById('chartByCategoryContainer');
    if (chartByCategory) chartByCategory.destroy();

    if (Object.keys(categoryTotals).length === 0) {
        ctxCategory.innerHTML = `
            <div class="chart__placeholder" style="display:flex; align-items:center; justify-content:center; height:100%; color:#666;">
                Nenhuma despesa encontrada para os filtros selecionados.
            </div>`;
    } else {
        ctxCategory.innerHTML = `<canvas id="chartByCategory"></canvas>`;
        const newCtx = document.getElementById('chartByCategory').getContext('2d');
        chartByCategory = new Chart(newCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryTotals),
                datasets: [{
                    data: Object.values(categoryTotals),
                    backgroundColor: palette10.slice(0, Object.keys(categoryTotals).length),
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: false,
                            boxWidth: 16,
                            boxHeight: 16,
                            borderRadius: 4,
                            padding: 16,
                            font: { size: 14, weight: 'bold' },
                            color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#444',
                            useBorderRadius: true,
                            borderColor: '#ffffff',
                            borderWidth: 2
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const dataset = context.dataset;
                                const total = dataset.data.reduce((a, b) => a + b, 0);
                                const value = dataset.data[context.dataIndex];
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${percentage}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- 3. Distribuição por Status (Horizontal Bar) ---
    const statusTotals = { Pago: 0, Aberto: 0, Vencido: 0 };
    validFilteredExpenses.forEach(e => {
        const s = getExpenseStatus(e);
        if (s in statusTotals) statusTotals[s] += e.valorOriginal;
    });

    const ctxStatus = document.getElementById('chartByStatusContainer');
    if (chartByStatus) chartByStatus.destroy();

    const hasStatusData = Object.values(statusTotals).some(v => v > 0);
    if (!hasStatusData) {
        ctxStatus.innerHTML = `
            <div class="chart__placeholder" style="display:flex; align-items:center; justify-content:center; height:100%; color:#666;">
                Nenhuma despesa encontrada para os filtros selecionados.
            </div>`;
    } else {
        ctxStatus.innerHTML = `<canvas id="chartByStatus"></canvas>`;
        const newCtx = document.getElementById('chartByStatus').getContext('2d');
        chartByStatus = new Chart(newCtx, {
            type: 'bar',
            data: {
                labels: ['Pago', 'Aberto', 'Vencido'],
                datasets: [{
                    label: 'Valor (R$)',
                    data: [statusTotals.Pago, statusTotals.Aberto, statusTotals.Vencido],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderRadius: 6,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => 'R$ ' + ctx.parsed.x.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { display: true },
                        border: { display: false },
                        ticks: {
                            color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#444',
                            callback: (v) => 'R$ ' + v.toLocaleString('pt-BR')
                        }
                    },
                    y: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#444',
                            font: { size: 14, weight: 'bold' }
                        }
                    }
                }
            }
        });
    }

    // --- 4. Gasto por Responsável (Stacked Bar) ---
    function classifyPaymentGroup(formaPagamento) {
        if (!formaPagamento) return 'À Vista';
        const f = formaPagamento.toLowerCase();
        if (f.includes('crédito') || f.includes('credito')) return 'Crédito';
        if (f.includes('débito') || f.includes('debito')) return 'Débito';
        return 'À Vista';
    }

    const responsibleGrouped = {};
    validFilteredExpenses.forEach(e => {
        const resp = e.responsavel;
        const grupo = classifyPaymentGroup(e.formaPagamento);
        if (!responsibleGrouped[resp]) {
            responsibleGrouped[resp] = { 'À Vista': 0, 'Crédito': 0, 'Débito': 0 };
        }
        responsibleGrouped[resp][grupo] += e.valorOriginal;
    });

    const labelsResp = Object.keys(responsibleGrouped);
    const ctxResponsible = document.getElementById('chartByResponsibleContainer');
    if (chartByResponsible) chartByResponsible.destroy();

    if (labelsResp.length === 0) {
        ctxResponsible.innerHTML = `
            <div class="chart__placeholder" style="display:flex; align-items:center; justify-content:center; height:100%; color:#666;">
                Nenhuma despesa encontrada para os filtros selecionados.
            </div>`;
    } else {
        ctxResponsible.innerHTML = `<canvas id="chartByResponsible"></canvas>`;
        const newCtx = document.getElementById('chartByResponsible').getContext('2d');
        const isDark = document.body.classList.contains('dark-mode');
        const tickColor = isDark ? '#ffffff' : '#444';

        chartByResponsible = new Chart(newCtx, {
            type: 'bar',
            data: {
                labels: labelsResp,
                datasets: [
                    {
                        label: 'À Vista',
                        data: labelsResp.map(r => responsibleGrouped[r]['À Vista']),
                        backgroundColor: 'rgba(52, 152, 219, 0.85)',
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        borderRadius: 5,
                        categoryPercentage: 0.75,
                        barPercentage: 0.85
                    },
                    {
                        label: 'Crédito',
                        data: labelsResp.map(r => responsibleGrouped[r]['Crédito']),
                        backgroundColor: 'rgba(231, 76, 60, 0.85)',
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        borderRadius: 5,
                        categoryPercentage: 0.75,
                        barPercentage: 0.85
                    },
                    {
                        label: 'Débito',
                        data: labelsResp.map(r => responsibleGrouped[r]['Débito']),
                        backgroundColor: 'rgba(39, 174, 96, 0.85)',
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        borderRadius: 5,
                        categoryPercentage: 0.75,
                        barPercentage: 0.85
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: tickColor,
                            font: { size: 12, weight: 'bold' },
                            usePointStyle: false,
                            boxWidth: 16,
                            boxHeight: 12,
                            borderRadius: 3,
                            useBorderRadius: true,
                            padding: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` ${context.dataset.label}: R$ ` + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { display: true, color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                        border: { display: false },
                        ticks: {
                            color: tickColor,
                            callback: (value) => 'R$ ' + value.toLocaleString('pt-BR')
                        }
                    },
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            color: tickColor,
                            font: { size: 13, weight: 'bold' }
                        }
                    }
                }
            }
        });
    }

    // --- 5. Top 5 Maiores Despesas ---
    const barColors = ['#3498db', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c'];
    const badgeMap = {
        'Pago': { cls: 'status-badge--paid', label: 'Pago' },
        'Aberto': { cls: 'status-badge--open', label: 'Aberto' },
        'Vencido': { cls: 'status-badge--overdue', label: 'Vencido' },
        'Transferido': { cls: 'status-badge--moved', label: 'Transf.' }
    };

    const sorted = [...validFilteredExpenses].sort((a, b) => b.valorOriginal - a.valorOriginal).slice(0, 5);
    const maxVal = sorted.length > 0 ? sorted[0].valorOriginal : 1;
    const totalTop5 = sorted.reduce((s, e) => s + e.valorOriginal, 0);

    const medalStyle = [
        'background:#ffd700; color:#7a5900;',
        'background:#c0c0c0; color:#4a4a4a;',
        'background:#cd7f32; color:#5a2d00;',
        'background:var(--color-light-gray); color:var(--color-dark-gray);',
        'background:var(--color-light-gray); color:var(--color-dark-gray);'
    ];

    const top5Container = document.getElementById('chartTop5Container');

    if (sorted.length === 0) {
        top5Container.innerHTML = `
            <div class="chart__placeholder" style="display:flex; align-items:center; justify-content:center; height:100%; color:#666;">
                Nenhuma despesa encontrada para os filtros selecionados.
            </div>`;
    } else {
        top5Container.innerHTML = `
            <div id="top5Body" style="padding:4px 0; display:flex; flex-direction:column; gap:12px;"></div>
            <div style="padding:10px 0 2px; border-top:1px solid var(--color-light-gray); display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <span style="font-size:12px; color:${legendTextColor}; font-weight:600; text-transform:uppercase; letter-spacing:0.4px;">Total do Top 5</span>
                <span id="top5Total" style="font-size:14px; font-weight:700; color:var(--color-primary);">R$ 0,00</span>
            </div>`;

        const top5Body = document.getElementById('top5Body');

        sorted.forEach((exp, i) => {
            const pct = ((exp.valorOriginal / maxVal) * 100).toFixed(1);
            const status = getExpenseStatus(exp);
            const badge = badgeMap[status] || badgeMap['Aberto'];

            const item = document.createElement('div');
            item.style.cssText = 'display:flex; align-items:center; gap:12px; min-height:48px;';
            item.innerHTML = `
                <div style="width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; ${medalStyle[i]}">${i + 1}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:13px; font-weight:600; color:inherit; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px;">${exp.descricao}</div>
                    <div style="height:6px; background:var(--color-light-gray); border-radius:3px; overflow:hidden;">
                        <div class="top5-bar" style="height:100%; width:0%; border-radius:3px; background:${barColors[i]}; transition:width 0.6s ease;" data-pct="${pct}"></div>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; min-width:110px;">
                    <span style="font-size:14px; font-weight:700; color:inherit; white-space:nowrap; display:block; width:110px; text-align:right;">${formatCurrency(exp.valorOriginal)}</span>
                    <span class="status-badge ${badge.cls}">${badge.label}</span>
                </div>`;
            top5Body.appendChild(item);
        });

        document.getElementById('top5Total').textContent =
            'R$ ' + totalTop5.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        setTimeout(() => {
            document.querySelectorAll('.top5-bar').forEach(bar => {
                bar.style.width = bar.dataset.pct + '%';
            });
        }, 100);
    }

    // --- 6. Calendário de Vencimentos ---
    const calendarContainer = document.getElementById('chartCalendarContainer');
    if (!calendarContainer) return;

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const viewMonth = currentFilters.month - 1;
    const viewYear = currentFilters.year;

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expensesByDay = {};
    validFilteredExpenses.forEach(exp => {
        const d = parseDate(exp.vencimento);
        if (!d) return;
        const day = d.getDate();
        if (!expensesByDay[day]) expensesByDay[day] = [];
        expensesByDay[day].push(exp);
    });

    function dayPriority(exps) {
        if (exps.some(e => getExpenseStatus(e) === 'Vencido')) return 'overdue';
        if (exps.some(e => getExpenseStatus(e) === 'Aberto')) return 'open';
        return 'paid';
    }

    const colorMap = {
        overdue: 'var(--color-danger)',
        open: 'var(--color-warning)',
        paid: 'var(--color-success)'
    };

    const bgMap = {
        overdue: '#EF4444',
        open: '#F59E0B',
        paid: '#10B981'
    };

    const hasCalendarData = validFilteredExpenses.length > 0;

    if (!hasCalendarData) {
        calendarContainer.innerHTML = `
            <div class="chart__placeholder" style="display:flex; align-items:center; justify-content:center; height:100%; color:#666;">
                Nenhuma despesa encontrada para os filtros selecionados.
            </div>`;
    } else {
        if (titleCalendar) titleCalendar.textContent = `Calendário de Vencimentos (${periodText})`;

        let html = `<div style="display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:6px;">`;

        dayNames.forEach(d => {
            html += `<div style="text-align:center; font-size:9px; font-weight:600; color:${legendTextColor}; text-transform:uppercase; padding:2px 0 4px;">${d}</div>`;
        });

        for (let i = 0; i < firstDay; i++) {
            html += `<div></div>`;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = (
                d === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear()
            );
            const dayExps = expensesByDay[d];
            const priority = dayExps ? dayPriority(dayExps) : null;

            let cellStyle = `
                width:100%; height:46px; display:flex; flex-direction:column;
                align-items:center; justify-content:center;
                border-radius:4px; font-size:12px; font-weight:500;
                position:relative; cursor:${dayExps ? 'pointer' : 'default'};
                box-sizing: border-box;`;

            if (isToday) {
                cellStyle += `background:var(--color-primary); color:#fff; font-weight:700;`;
                if (isDarkMode) cellStyle += `border: 2px solid #ffffff;`;
            } else if (priority) {
                const textColor = !isDarkMode ? '#ffffff' : 'var(--color-dark)';
                cellStyle += `background:${bgMap[priority]}; color:${textColor};`;
                if (isDarkMode) cellStyle += `border: 2px solid #ffffff;`;
            }

            const tooltipText = dayExps
                ? dayExps.map(exp => `• ${exp.descricao}`).join('\n')
                : '';

            html += `<div style="${cellStyle}" title="${tooltipText}"><span>${d}</span></div>`;
        }

        html += `</div>`;

        html += `
            <div style="display:flex; flex-wrap:wrap; gap:12px; padding:10px 0 2px; border-top:1px solid var(--color-light-gray); justify-content:center; margin-top:4px;">
                <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:${legendTextColor}; font-weight:500;">
                    <div style="width:10px; height:10px; border-radius:50%; background:var(--color-primary); border:${isDarkMode ? '1px solid #fff' : 'none'};"></div>Hoje
                </div>
                <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:${legendTextColor}; font-weight:500;">
                    <div style="width:10px; height:10px; border-radius:50%; background:var(--color-success); border:${isDarkMode ? '1px solid #fff' : 'none'};"></div>Pago
                </div>
                <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:${legendTextColor}; font-weight:500;">
                    <div style="width:10px; height:10px; border-radius:50%; background:var(--color-warning); border:${isDarkMode ? '1px solid #fff' : 'none'};"></div>Aberto
                </div>
                <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:${legendTextColor}; font-weight:500;">
                    <div style="width:10px; height:10px; border-radius:50%; background:var(--color-danger); border:${isDarkMode ? '1px solid #fff' : 'none'};"></div>Vencido
                </div>
            </div>`;

        calendarContainer.innerHTML = html;
    }
}

function classifyPaymentGroup(formaPagamento) {
    if (!formaPagamento) return 'À Vista';
    const f = formaPagamento.toLowerCase();
    if (f.includes('crédito') || f.includes('credito')) return 'Crédito';
    if (f.includes('débito') || f.includes('debito')) return 'Débito';
    return 'À Vista'; // Dinheiro, Cheque ou sem forma definida
}

function dayPriority(exps) {
    if (exps.some(e => getExpenseStatus(e) === 'Vencido')) return 'overdue';
    if (exps.some(e => getExpenseStatus(e) === 'Aberto')) return 'open';
    return 'paid';
}

function updateSummary(pageType, customFiltered = null) {
    if (pageType === 'dashboard') {
        const filteredExpenses = getFilteredExpenses('dashboard').filter(e => e.transferenciaEfetuda !== "sim");
        let totalMonth = 0,
            paid = 0,
            openn = 0,
            overdue = 0;

        filteredExpenses.forEach(exp => {
            totalMonth += exp.valorOriginal;
            const status = getExpenseStatus(exp);

            if (status === 'Pago') paid += exp.valorOriginal;
            else if (status === 'Aberto') openn += exp.valorOriginal;
            else if (status === 'Vencido') overdue += exp.valorOriginal;
        });

        document.getElementById('totalMonthValue').textContent = formatCurrency(totalMonth);
        document.getElementById('paidValue').textContent = formatCurrency(paid);
        document.getElementById('openValue').textContent = formatCurrency(openn);
        document.getElementById('overdueValue').textContent = formatCurrency(overdue);

        const yearlyExpenses = expenses.filter(exp => {
            const d = parseDate(exp.vencimento);
            return d && d.getFullYear() === currentFilters.year &&
                getExpenseStatus(exp) !== "Transferido";
        });

        renderCharts(filteredExpenses, yearlyExpenses);

    } else if (pageType === 'edit') {
        const filtered = customFiltered || getFilteredExpenses('edit');
        const filteredNoTransf = filtered.filter(e => e.transferenciaEfetuda !== "sim");
        let paidCount = 0,
            notPaidCount = 0,
            totalValue = 0;

        filteredNoTransf.forEach(exp => {
            totalValue += exp.valorOriginal;
            if (exp.pagamentoEfetuado === "sim") paidCount++;
            else notPaidCount++;
        });

        document.getElementById('totalFilteredValue').textContent = formatCurrency(totalValue);
        document.getElementById('itemsFoundValue').textContent = filteredNoTransf.length;
        document.getElementById('paidItemsValue').textContent = paidCount;
        document.getElementById('openItemsValue').textContent = notPaidCount;

    } else if (pageType === 'pending') {
        const filtered = customFiltered || getFilteredExpenses('pending');
        const filteredNoTransf = filtered.filter(e => e.transferenciaEfetuda !== "sim");
        let totalPending = 0,
            totalOpen = 0,
            totalOverdue = 0;
        let countOpen = 0,
            countOverdue = 0;

        filteredNoTransf.forEach(exp => {
            totalPending += exp.valorOriginal;
            const status = getExpenseStatus(exp);
            if (status === 'Aberto') {
                totalOpen += exp.valorOriginal;
                countOpen++;
            } else if (status === 'Vencido') {
                totalOverdue += exp.valorOriginal;
                countOverdue++;
            }
        });

        document.getElementById('openItemsCount').textContent = countOpen;
        document.getElementById('totalOpenValue').textContent = formatCurrency(totalOpen);
        document.getElementById('totalOverdueValue').textContent = formatCurrency(totalOverdue);
        document.getElementById('overdueItemsCount').textContent = countOverdue;

    } else if (pageType === 'backup') {
        const notTransferred = expenses.filter(e => e.transferenciaEfetuda !== "sim");
        const totalValue = notTransferred.reduce((sum, exp) => sum + exp.valorOriginal, 0);
        const total = notTransferred.length;
        const paid = notTransferred.filter(exp => exp.pagamentoEfetuado === "sim").length;
        const open = notTransferred.filter(exp => {
            const status = getExpenseStatus(exp);
            return status === "Aberto" || status === "Vencido";
        }).length;

        document.getElementById("totalExpensesCount").textContent = total;
        document.getElementById("totalPaidCount").textContent = paid;
        document.getElementById("totalOpenCount").textContent = open;
        document.getElementById("totalValueSum").textContent = formatCurrency(totalValue);
    }
}

// ===== 📅 DATAS E FILTROS =====
function setCurrentDate() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthSelect = document.getElementById('monthSelect');
    monthSelect.selectedIndex = currentMonth;
    currentFilters.month = currentMonth + 1;

    populateYearSelect(currentYear);
    currentFilters.year = currentYear;
}

function populateYearSelect(currentYear) {
    const yearSelect = document.getElementById('yearSelect');
    yearSelect.innerHTML = '';

    const years = [...new Set(expenses.map(exp => parseDate(exp.vencimento).getFullYear()))];

    if (!years.includes(currentYear)) {
        years.push(currentYear);
    }

    years.sort((a, b) => a - b);

    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    });
}

function populateFilters() {
    populateFilter('responsibleFilter', 'responsible');
    populateFilter('statusFilter', 'status');

    populateFilter('editYearSelect', 'year');
    populateFilter('editStatusFilter', 'status', 'edit');
    populateFilter('editResponsibleFilter', 'responsible');

    populateFilter('pendingYearSelect', 'year');
    populateFilter('pendingStatusFilter', 'status', 'pending');
    populateFilter('pendingResponsibleFilter', 'responsible', 'pending');

    populateFilter('reportResponsibleFilter', 'responsible');
}

function populateFilter(filterId, filterType, page = null) {
    const filter = document.getElementById(filterId);
    if (!filter) return;

    switch (filterType) {
        case 'responsible':
            const responsibles = page === 'pending' ?
                [...new Set(expenses.filter(exp => {
                    const status = getExpenseStatus(exp);
                    return status === 'Aberto' || status === 'Vencido';
                }).map(exp => exp.responsavel))] :
                [...new Set(expenses.map(exp => exp.responsavel))];

            filter.innerHTML = '<option>Todos</option>';
            responsibles.sort().forEach(responsible => {
                if (responsible) {
                    const option = document.createElement('option');
                    option.value = responsible;
                    option.textContent = responsible;
                    filter.appendChild(option);
                }
            });
            break;

        case 'status':
            if (page === 'edit') {
                const statuses = [...new Set(expenses.map(exp => getExpenseStatus(exp)))];
                filter.innerHTML = '<option value="Todas">Todas</option>';
                statuses.forEach(st => {
                    const option = document.createElement('option');
                    option.value = st;
                    option.textContent = st;
                    filter.appendChild(option);
                });
            } else if (page === 'pending') {
                filter.innerHTML = `
			  <option value="Todas pendentes">Todas pendentes</option>
			  <option value="Aberto">Aberto</option>
			  <option value="Vencido">Vencido</option>
			`;
            } else {
                filter.innerHTML = `
			  <option>Todos</option>
			  <option>Pago</option>
			  <option>Aberto</option>
			  <option>Vencido</option>
			`;
            }
            break;

        case 'year':
            const years = [...new Set(expenses.map(exp => parseDate(exp.vencimento).getFullYear()))];
            years.sort((a, b) => b - a);

            filter.innerHTML = '<option value="Todos os anos">Todos os anos</option>';
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                filter.appendChild(option);
            });
            break;
    }
}

function updateDateFilter() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    currentFilters.month = monthSelect.selectedIndex + 1;
    currentFilters.year = parseInt(yearSelect.value);

    updateSummary('dashboard');
    renderTable('dashboard');
}

function applyPageFilters(pageType) {
    if (pageType === 'dashboard') {
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const responsibleFilter = document.getElementById('responsibleFilter');
        const sortFilter = document.getElementById('sortFilter');
        const paymentMethodFilter = document.getElementById('paymentMethodFilter');

        currentFilters.category = categoryFilter.value;
        currentFilters.status = statusFilter.value;
        currentFilters.responsible = responsibleFilter.value;
        currentFilters.sort = sortFilter.value;
        currentFilters.paymentMethod = paymentMethodFilter ? paymentMethodFilter.value : 'Todos';

        renderTable('dashboard');
    } else if (pageType === 'edit') {
        renderTable('edit');
        updateSummary('edit');
    } else if (pageType === 'pending') {
        renderTable('pending');
        updateSummary('pending');
    }
}

function clearFilters(pageType) {
    if (pageType === 'dashboard') {
        setCurrentDate(); // Volta para mês e ano atuais
        document.getElementById('categoryFilter').value = 'Todas';
        document.getElementById('statusFilter').value = 'Todos';
        document.getElementById('responsibleFilter').value = 'Todos';
        document.getElementById('sortFilter').value = 'Vencimento';
        document.getElementById('paymentMethodFilter').value = 'Todos';

        currentFilters.category = 'Todas';
        currentFilters.status = 'Todos';
        currentFilters.responsible = 'Todos';
        currentFilters.sort = 'Vencimento';
        currentFilters.paymentMethod = 'Todos';

        updateSummary('dashboard');
        renderTable('dashboard');
    } else if (pageType === 'edit') {
        document.getElementById('editMonthSelect').selectedIndex = 0;
        document.getElementById('editYearSelect').value = "Todos os anos";
        document.getElementById('editCategoryFilter').value = "Todas";
        document.getElementById('editStatusFilter').value = "Todas";
        document.getElementById('editResponsibleFilter').value = "Todos";
        document.getElementById('editSortFilter').selectedIndex = 0;
        document.getElementById('editPaymentMethodFilter').value = "Todos";

        const searchEditInput = document.getElementById('searchEditInput');
        if (searchEditInput) searchEditInput.value = "";

        renderTable('edit');
        updateSummary('edit');
    } else if (pageType === 'pending') {
        document.getElementById('pendingYearSelect').value = "Todos os anos";
        document.getElementById('pendingCategoryFilter').value = "Todas";
        document.getElementById('pendingStatusFilter').value = "Todas pendentes";
        document.getElementById('pendingResponsibleFilter').value = "Todos";
        document.getElementById('pendingSortFilter').selectedIndex = 0;

        const searchPendingInput = document.getElementById('searchPendingInput');
        if (searchPendingInput) searchPendingInput.value = "";

        renderTable('pending');
        updateSummary('pending');
    }
}

function performSearch(pageType) {
    const searchInputId = pageType === 'edit' ? 'searchEditInput' : 'searchPendingInput';
    const searchValue = document.getElementById(searchInputId).value.toLowerCase();

    let filtered;
    if (pageType === 'edit') {
        filtered = getFilteredExpenses('edit');
    } else if (pageType === 'pending') {
        filtered = getFilteredExpenses('pending');
    }

    if (searchValue.trim() !== "") {
        filtered = filtered.filter(exp => {
            const descricao = exp.descricao.toLowerCase();
            const categoria = exp.categoria.toLowerCase();
            const responsavel = exp.responsavel.toLowerCase();
            const valor = exp.valorOriginal.toFixed(2).replace('.', ',');

            return (
                descricao.includes(searchValue) ||
                categoria.includes(searchValue) ||
                responsavel.includes(searchValue) ||
                valor.includes(searchValue)
            );
        });
    }

    if (pageType === 'edit') {
        renderTable('edit', filtered);
        updateSummary('edit', filtered);
    } else if (pageType === 'pending') {
        renderTable('pending', filtered);
        updateSummary('pending', filtered);
    }
}

function setupDateInputsValidation() {
    document.addEventListener("input", (e) => {
        if (e.target.matches("input[type='date']")) {
            const date = parseDate(e.target.value);
            e.target.style.borderColor = (!e.target.value || !date || isNaN(date)) ?
                "var(--color-danger)" :
                "var(--color-success)";
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.target.matches("input[type='date']")) {
            e.preventDefault();
        }
    });

    document.addEventListener("paste", (e) => {
        if (e.target.matches("input[type='date']")) {
            e.preventDefault();
        }
    });
}

function setupAllFiltersListeners() {
    const editFilters = [
        'editMonthSelect', 'editYearSelect', 'editCategoryFilter',
        'editStatusFilter', 'editResponsibleFilter', 'editSortFilter', 'editPaymentMethodFilter'
    ];

    editFilters.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                renderTable('edit');
                updateSummary('edit');
            });
        }
    });

    const pendingFilters = [
        'pendingYearSelect', 'pendingCategoryFilter',
        'pendingStatusFilter', 'pendingResponsibleFilter', 'pendingSortFilter'
    ];

    pendingFilters.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                renderTable('pending');
                updateSummary('pending');
            });
        }
    });
}

function setupModalListeners() {
    ['expenseValue', 'expenseInstallments'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                setTimeout(() => generateInstallmentsTable('add'), 50);
            });
        }
    });

    ['editExpenseValue', 'editExpenseInstallments'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                const expense = expenses.find(exp => exp.id === expenseIdToEdit);
                if (expense) {
                    setTimeout(() => generateInstallmentsTable('edit', { expense }), 50);
                }
            });
        }
    });

    ['updateValue', 'updateInstallments'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                const expense = expenses.find(exp => exp.id === expenseIdToUpdate);
                if (expense) {
                    setTimeout(() => generateInstallmentsTable('update', {
                        expense,
                        originalDue: expense.vencimento
                    }), 50);
                }
            });
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.show');
            if (activeModal) {
                closeModal(activeModal.id);
            }
        }
    });
}

// ===== 📋 TABELAS E STATUS =====
function renderTable(pageType, filteredExpenses = null) {
    const configs = {
        dashboard: {
            tableBodyId: 'expensesTableBody',
            sortFilterId: null,
            emptyMessage: 'Nenhuma despesa encontrada para os filtros selecionados.',
            actions: (expense) => {
                return `
			  <button class="btn btn--view" onclick="viewExpense(${expense.id})" title="Ver Despesa">
				👁️
			  </button>`;
            }
        },
        edit: {
            tableBodyId: 'editExpensesTableBody',
            sortFilterId: 'editSortFilter',
            emptyMessage: 'Nenhuma despesa encontrada para os filtros selecionados.',
            actions: (expense) => {
                const isFirstInstallment = expense.idParcela === null;
                return `
			  <button class="btn btn--edit" onclick="editExpense(${expense.id})" title="Editar Despesa">
				✏️
			  </button>
			  <button class="btn btn--confirm-delete" 
				${!isFirstInstallment ? 'disabled' : ''} 
				onclick="${isFirstInstallment ? `deleteExpense(${expense.id})` : ''}" 
				title="${!isFirstInstallment ? 'Apenas a primeira parcela pode ser excluída' : 'Excluir Despesa'}">
				🗑️
			  </button>`;
            }
        },
        pending: {
            tableBodyId: 'pendingExpensesTableBody',
            sortFilterId: 'pendingSortFilter',
            emptyMessage: 'Nenhuma despesa pendente encontrada para os filtros selecionados.',
            actions: (expense) => {
                const status = getExpenseStatus(expense);
                const isTransferred = expense.transferenciaEfetuda === "sim";
                return `
			  <button class="btn btn--pay"
				${(status === 'Vencido' || isTransferred) ? 'disabled' : ''} 
				onclick="${isTransferred ? '' : `payExpense(${expense.id})`}" 
				title="Pagar Despesa">
				💵
			  </button>
			  <button class="btn btn--update" 
				${(status === 'Aberto' || isTransferred) ? 'disabled' : ''} 
				onclick="${isTransferred ? '' : `updateExpenseModal(${expense.id})`}" 
				title="Atualizar Despesa">
				🔄
			  </button>`;
            }
        }
    };

    const config = configs[pageType];
    const tableBody = document.getElementById(config.tableBodyId);
    const sort = config.sortFilterId ? document.getElementById(config.sortFilterId).value : null;

    let filtered = filteredExpenses || getFilteredExpenses(pageType);

    if (sort) {
        filtered.sort((a, b) => {
            switch (sort) {
                case 'Vencimento': return new Date(a.vencimento) - new Date(b.vencimento);
                case 'Valor': return b.valorOriginal - a.valorOriginal;
                case 'Status': return getExpenseStatus(a).localeCompare(getExpenseStatus(b));
                case 'Descrição': return a.descricao.localeCompare(b.descricao);
                default: return 0;
            }
        });
    }

    if (filtered.length === 0) {
        const colspan = '10';
        tableBody.innerHTML = `
		  <tr>
			<td colspan="${colspan}" style="text-align: center; padding: 40px; color: var(--color-dark-gray);">
			  <em>${config.emptyMessage}</em>
			</td>
		  </tr>`;
        return;
    }

    tableBody.innerHTML = '';
    filtered.forEach(expense => {
        const status = getExpenseStatus(expense);
        const row = document.createElement('tr');
        row.className = 'table__row';

        const baseColumns = `
		  <td class="table__cell">${expense.descricao}</td>
		  <td class="table__cell">${expense.categoria}</td>
		  <td class="table__cell">${expense.responsavel}</td>
		  <td class="table__cell">${expense.parcelaAtual}/${expense.totalParcelas}</td>
		  <td class="table__cell">${formatCurrency(expense.valorOriginal)}</td>`;

        let specificColumns = '';

        if (pageType === 'pending') {
            const diasAtraso = getOverdueDays(expense);
            specificColumns = `
			<td class="table__cell">${diasAtraso > 0 ? diasAtraso : '-'}</td>
			<td class="table__cell">${formatDate(expense.vencimento)}</td>
			<td class="table__cell">
			  <span class="status-badge status-badge--${getStatusBadgeClass(status)}">
				${status}
			  </span>
			</td>
			<td class="table__cell">${expense.novoVencimento ? formatDate(expense.novoVencimento) : '-'}</td>
			<td class="table__cell table__cell--actions">
			  <div class="table__actions">${config.actions(expense)}</div>
			</td>`;
        } else {
            let formaExibicao = "-";
            if (getExpenseStatus(expense) !== "Transferido" && expense.pagamentoEfetuado === "sim") {
                formaExibicao = expense.formaPagamento;
            }

            specificColumns = `
			<td class="table__cell" style="white-space: nowrap;">${formaExibicao}</td>
			<td class="table__cell">${formatDate(expense.vencimento)}</td>
			<td class="table__cell">
			  <span class="status-badge status-badge--${getStatusBadgeClass(status)}">
				${status}
			  </span>
			</td>
			<td class="table__cell">${(expense.transferenciaEfetuda === "sim" && expense.novoVencimento)
                    ? formatDate(expense.novoVencimento)
                    : "-"}</td>
			<td class="table__cell table__cell--actions">
			  <div class="table__actions">${config.actions(expense)}</div>
			</td>`;
        }

        row.innerHTML = baseColumns + specificColumns;
        tableBody.appendChild(row);
    });
}

function getFilteredExpenses(pageType, customFilters = null) {
    const filterConfigs = {
        dashboard: {
            monthSelector: 'monthSelect',
            yearSelector: 'yearSelect',
            categorySelector: 'categoryFilter',
            statusSelector: 'statusFilter',
            responsibleSelector: 'responsibleFilter',
            sortSelector: 'sortFilter',
            paymentMethodSelector: 'paymentMethodFilter',
            useCurrentFilters: true,
            dateField: 'vencimento'
        },
        edit: {
            monthSelector: 'editMonthSelect',
            yearSelector: 'editYearSelect',
            categorySelector: 'editCategoryFilter',
            statusSelector: 'editStatusFilter',
            responsibleSelector: 'editResponsibleFilter',
            sortSelector: 'editSortFilter',
            paymentMethodSelector: 'editPaymentMethodFilter',
            useCurrentFilters: false,
            dateField: 'vencimento'
        },
        pending: {
            yearSelector: 'pendingYearSelect',
            categorySelector: 'pendingCategoryFilter',
            statusSelector: 'pendingStatusFilter',
            responsibleSelector: 'pendingResponsibleFilter',
            sortSelector: 'pendingSortFilter',
            useCurrentFilters: false,
            dateField: 'vencimento',
            onlyPending: true
        }
    };

    const config = filterConfigs[pageType];
    if (!config) return expenses;

    let filters = {};

    if (config.useCurrentFilters) {
        filters = { ...currentFilters };
    } else {
        if (config.monthSelector) {
            const monthEl = document.getElementById(config.monthSelector);
            filters.month = monthEl ? monthEl.selectedIndex : 0;
        }
        if (config.yearSelector) {
            const yearEl = document.getElementById(config.yearSelector);
            filters.year = yearEl ? yearEl.value : "Todos os anos";
        }
        if (config.categorySelector) {
            const catEl = document.getElementById(config.categorySelector);
            filters.category = catEl ? catEl.value : "Todas";
        }
        if (config.statusSelector) {
            const statusEl = document.getElementById(config.statusSelector);
            filters.status = statusEl ? statusEl.value : "Todos";
        }
        if (config.responsibleSelector) {
            const respEl = document.getElementById(config.responsibleSelector);
            filters.responsible = respEl ? respEl.value : "Todos";
        }
        if (config.sortSelector) {
            const sortEl = document.getElementById(config.sortSelector);
            filters.sort = sortEl ? sortEl.value : "Vencimento";
        }
        if (config.paymentMethodSelector) {
            const pmEl = document.getElementById(config.paymentMethodSelector);
            filters.paymentMethod = pmEl ? pmEl.value : "Todos";
        }
    }

    if (customFilters) {
        filters = { ...filters, ...customFilters };
    }

    let filtered = expenses.filter(expense => {
        const expenseDate = parseDate(expense[config.dateField]);
        if (!expenseDate) return false;

        const expenseMonth = expenseDate.getMonth() + 1;
        const expenseYear = expenseDate.getFullYear();
        const status = getExpenseStatus(expense);

        if (config.useCurrentFilters) {
            if (filters.month && expenseMonth !== filters.month) return false;
            if (filters.year && expenseYear !== filters.year) return false;
        } else {
            if (filters.month > 0 && expenseMonth !== filters.month) return false;
            if (filters.year !== "Todos os anos" && String(expenseYear) !== String(filters.year)) return false;
        }

        if (filters.category && filters.category !== 'Todas' && expense.categoria !== filters.category) return false;
        if (filters.responsible && filters.responsible !== 'Todos' && expense.responsavel !== filters.responsible) return false;

        if (config.onlyPending) {
            if (expense.pagamentoEfetuado === "sim") return false;
            if (filters.status && filters.status !== "Todas pendentes" && status !== filters.status) return false;
        } else {
            if (filters.status && filters.status !== 'Todos' && filters.status !== 'Todas' && status !== filters.status) return false;
            if (filters.paymentMethod && filters.paymentMethod !== 'Todos' && expense.formaPagamento !== filters.paymentMethod) return false;
        }

        return true;
    });

    if (filters.sort) {
        filtered.sort((a, b) => {
            switch (filters.sort) {
                case 'Vencimento': return parseDate(a.vencimento) - parseDate(b.vencimento);
                case 'Valor': return b.valorOriginal - a.valorOriginal;
                case 'Status': return getExpenseStatus(a).localeCompare(getExpenseStatus(b));
                case 'Descrição': return a.descricao.localeCompare(b.descricao);
                default: return 0;
            }
        });
    }

    return filtered;
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Pago': return 'paid';
        case 'Aberto': return 'open';
        case 'Vencido': return 'overdue';
        case 'Transferido': return 'moved';
        default: return 'open';
    }
}

function getOverdueDays(expense) {
    if (expense.pagamentoEfetuado === "sim") return 0;

    const status = getExpenseStatus(expense);
    if (status === "Aberto" || status === "Transferido") return 0;

    if (status === "Vencido") {
        const vencimento = parseDate(expense.vencimento);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diff = Math.floor((today - vencimento) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    }

    return 0;
}

function checkOverdueExpenses() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueCount = expenses.filter(expense => {
        if (expense.pagamentoEfetuado === "sim") return false;
        if (getExpenseStatus(expense) === "Transferido") return false;

        const dueDate = parseDate(expense.vencimento);
        if (!dueDate) return false;

        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }).length;

    const notificationItem = document.getElementById('notification-item');
    const iconSpan = notificationItem?.querySelector('.nav__icon');
    const alertLine2 = notificationItem?.querySelector('.nav__alert-line2');

    if (overdueCount > 0) {
        notificationItem?.classList.add('nav__item--alert');
        notificationItem?.setAttribute("onclick", "navigateTo('payment-page')");
        if (iconSpan) iconSpan.textContent = `⚠️ (${overdueCount})`;
        if (alertLine2) {
            alertLine2.style.display = 'block';
            alertLine2.textContent = overdueCount > 1
                ? `Você tem ${overdueCount} despesas atrasadas!`
                : 'Você tem despesas atrasadas!';
        }
    } else {
        notificationItem?.classList.remove('nav__item--alert');
        notificationItem?.removeAttribute("onclick");
        if (iconSpan) iconSpan.textContent = '⚠️';
        if (alertLine2) alertLine2.style.display = 'none';
    }

    return overdueCount;
}

// ===== ➕ CRIAÇÃO DE DESPESAS =====
function getExpenseFormData() {
    const pagamentoInput = document.getElementById('expensePaid');

    return {
        descricao: document.getElementById('expenseDescription').value,
        categoria: document.getElementById('expenseCategory').value,
        responsavel: document.getElementById('expenseResponsible').value,
        valorTotal: parseFloat(document.getElementById('expenseValue').value),
        totalParcelas: parseInt(document.getElementById('expenseInstallments').value),
        pagamentoEfetuado: pagamentoInput ? pagamentoInput.checked : false,
        observacoes: document.getElementById('expenseNotes').value
    };
}

function createExpenseInstallments(formData) {
    const installments = [];
    const valorParcela = formData.valorTotal / formData.totalParcelas;
    const installmentRows = document.querySelectorAll('#installmentsTableBody tr');

    const baseId = Date.now();

    for (let i = 0; i < formData.totalParcelas; i++) {
        const row = installmentRows[i];

        const dueDate = row.querySelector('.installment-due').value;
        const pagoStatus = row.querySelector('.installment-paid').value;
        const formaPagto = row.querySelector('.installment-method').value;

        installments.push({
            id: baseId + i,
            descricao: formData.descricao,
            categoria: formData.categoria,
            responsavel: formData.responsavel,
            observacoes: (i === 0) ? formData.observacoes : "",
            valorOriginal: parseFloat((valorParcela).toFixed(2)),
            parcelaAtual: i + 1,
            totalParcelas: formData.totalParcelas,
            idParcela: (i === 0) ? null : baseId,
            vencimento: dueDate,
            novoVencimento: null,
            pagamentoEfetuado: pagoStatus,
            formaPagamento: formaPagto,
            transferenciaEfetuda: "nao"
        });
    }

    return installments;
}

function generateExpenseId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

function getExpenseStatus(expense) {
    if (expense.pagamentoEfetuado === "sim") return "Pago";
    if (expense.transferenciaEfetuda === "sim") return "Transferido";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = parseDate(expense.vencimento);
    return (due < today) ? "Vencido" : "Aberto";
}

function validateForm(formConfig) {
    const { modalSelector, fields, customValidations = [] } = formConfig;
    let isValid = true;
    const errors = [];

    fields.forEach(field => {
        const { id, type, required = true, minLength, maxValue } = field;
        const input = document.getElementById(id);
        if (!input) return;

        let fieldValid = true;
        let fieldValue = input.value;

        switch (type) {
            case 'text':
                fieldValue = fieldValue.trim();
                if (required && !fieldValue) fieldValid = false;
                if (minLength && fieldValue.length < minLength) fieldValid = false;
                break;

            case 'number':
                const numValue = parseFloat(fieldValue);
                if (required && (isNaN(numValue) || numValue <= 0)) fieldValid = false;
                if (maxValue && numValue > maxValue) {
                    input.value = maxValue;
                    fieldValue = maxValue;
                    fieldValid = true;
                }
                break;

            case 'select':
                if (required && !fieldValue) fieldValid = false;
                break;

            case 'date':
                const dateValue = parseDate(fieldValue);
                if (required && (!fieldValue || !dateValue || isNaN(dateValue))) fieldValid = false;
                break;
        }

        input.style.borderColor = fieldValid ? 'var(--color-success)' : 'var(--color-danger)';

        if (!fieldValid) {
            isValid = false;
            errors.push(field.errorMessage || `Campo ${field.label || id} inválido`);
        }
    });

    if (modalSelector) {
        const dateInputs = document.querySelectorAll(`${modalSelector} input[type="date"]`);
        dateInputs.forEach(input => {
            const value = input.value;
            const date = parseDate(value);

            if (!value || !date || isNaN(date)) {
                input.style.borderColor = "var(--color-danger)";
                isValid = false;
                errors.push("Preencha todas as datas corretamente");
            } else {
                input.style.borderColor = "var(--color-success)";
            }
        });
    }

    customValidations.forEach(validation => {
        const result = validation();
        if (!result.valid) {
            isValid = false;
            errors.push(result.message);
        }
    });

    return { valid: isValid, errors };
}

function resetNewExpenseForm() {
    const form = document.getElementById('expenseForm');
    if (form) form.reset();

    document.getElementById('installmentsTableBody').innerHTML = '';

    const inputs = document.querySelectorAll('#expenseForm input, #expenseForm select');
    inputs.forEach(input => {
        input.style.borderColor = '';
    });

    const installmentsInput = document.getElementById('expenseInstallments');
    if (installmentsInput) installmentsInput.value = 1;
}

function saveExpense() {
    const validation = validateForm(validationConfigs.addExpense);

    if (!validation.valid) {
        alert('Por favor, preencha todos os campos obrigatórios corretamente.\n' + validation.errors.join('\n'));
        return;
    }

    const formData = getExpenseFormData();
    const newExpenses = createExpenseInstallments(formData);

    expenses.push(...newExpenses);

    saveExpensesToStorage();
    updateSummary('dashboard');
    renderTable('dashboard');
    populateFilters();
    populateYearSelect(new Date().getFullYear());

    closeModal('add-modal');
    refreshCurrentPage();

    alert(`Despesa "${formData.descricao}" cadastrada com sucesso! ${newExpenses.length} parcela(s) criada(s).`);
}

// ===== ✏️ EDIÇÃO DE DESPESAS =====
function editExpense(expenseId) {
    const expense = expenses.find(exp => exp.id === expenseId);

    if (!expense) {
        alert("Despesa não encontrada!");
        return;
    }

    expenseIdToEdit = expenseId;

    const isFirstInstallment = expense.idParcela === null;

    document.getElementById("editExpenseDescription").value = expense.descricao;
    document.getElementById("editExpenseCategory").value = expense.categoria;
    document.getElementById("editExpenseResponsible").value = expense.responsavel;
    document.getElementById("editExpenseValue").value = (expense.valorOriginal * expense.totalParcelas).toFixed(2);
    document.getElementById("editExpenseInstallments").value = expense.totalParcelas;
    document.getElementById("editExpenseNotes").value = expense.observacoes || "";

    const isTransferred = expense.transferenciaEfetuda === "sim";

    const descriptionInput = document.getElementById("editExpenseDescription");
    const categorySelect = document.getElementById("editExpenseCategory");
    const responsibleInput = document.getElementById("editExpenseResponsible");
    const valueInput = document.getElementById("editExpenseValue");
    const installmentsInput = document.getElementById("editExpenseInstallments");
    const notesTextarea = document.getElementById("editExpenseNotes");

    if (!isFirstInstallment) {
        descriptionInput.disabled = true;
        categorySelect.disabled = true;
        responsibleInput.disabled = true;
        valueInput.disabled = true;
        installmentsInput.disabled = true;
        notesTextarea.disabled = false;
    } else {
        const shouldDisable = isTransferred;
        descriptionInput.disabled = shouldDisable;
        categorySelect.disabled = shouldDisable;
        responsibleInput.disabled = shouldDisable;
        valueInput.disabled = shouldDisable;
        installmentsInput.disabled = shouldDisable;
        notesTextarea.disabled = shouldDisable;
    }

    generateInstallmentsTable('edit', { expense });

    if (isFirstInstallment) {
        setTimeout(() => {
            const parcelas = expenses.filter(exp =>
                exp.descricao === expense.descricao &&
                exp.responsavel === expense.responsavel &&
                exp.totalParcelas === expense.totalParcelas
            ).sort((a, b) => a.parcelaAtual - b.parcelaAtual);

            const rows = document.querySelectorAll("#editInstallmentsTableBody tr");

            parcelas.forEach((p, index) => {
                const row = rows[index];
                if (row) {
                    const inputDate = row.querySelector('.installment-due');
                    const selectPaid = row.querySelector('.installment-paid');
                    const selectMethod = row.querySelector('.installment-method');

                    if (inputDate) inputDate.value = p.vencimento;
                    if (selectPaid) selectPaid.value = p.pagamentoEfetuado;
                    if (selectMethod) selectMethod.value = p.formaPagamento || "";
                }
            });
        }, 50);
    }

    showModal("edit-modal");
}

function updateExpense() {
    const expense = expenses.find(exp => exp.id === expenseIdToEdit);

    if (!expense) {
        alert("Despesa não encontrada!");
        return;
    }

    const validation = validateForm(validationConfigs.editExpense);
    if (!validation.valid) {
        alert('Por favor, corrija os seguintes erros:\n' + validation.errors.join('\n'));
        return;
    }

    const isFirstInstallment = expense.idParcela === null;

    const novaDescricao = document.getElementById("editExpenseDescription").value;
    const novaCategoria = document.getElementById("editExpenseCategory").value;
    const novoResponsavel = document.getElementById("editExpenseResponsible").value;
    const novasObservacoes = document.getElementById("editExpenseNotes").value;
    const newTotalParcelas = parseInt(document.getElementById("editExpenseInstallments").value, 10) || 1;
    const valorTotal = parseFloat(document.getElementById("editExpenseValue").value) || 0;
    const newValorParcela = valorTotal / newTotalParcelas;

    const rows = document.querySelectorAll("#editInstallmentsTableBody tr");

    if (isFirstInstallment) {
        const grupoAtual = expenses.filter(exp =>
            exp.descricao === expense.descricao &&
            exp.responsavel === expense.responsavel &&
            exp.totalParcelas === expense.totalParcelas
        ).sort((a, b) => a.parcelaAtual - b.parcelaAtual);

        if (newTotalParcelas !== expense.totalParcelas) {
            const parcelasAntigas = grupoAtual.length;

            if (newTotalParcelas < parcelasAntigas) {
                const parcelasParaExcluir = grupoAtual.slice(newTotalParcelas);
                parcelasParaExcluir.forEach(p => {
                    const index = expenses.findIndex(exp => exp.id === p.id);
                    if (index !== -1) expenses.splice(index, 1);
                });
            } else if (newTotalParcelas > parcelasAntigas) {
                const baseId = expense.idParcela || expense.id;
                const ultimaParcela = grupoAtual[grupoAtual.length - 1];
                const ultimaData = parseDate(ultimaParcela.vencimento);

                for (let i = parcelasAntigas; i < newTotalParcelas; i++) {
                    const novaData = new Date(ultimaData);
                    novaData.setMonth(ultimaData.getMonth() + (i - parcelasAntigas + 1));

                    expenses.push({
                        id: Date.now() + Math.random(),
                        descricao: novaDescricao,
                        categoria: novaCategoria,
                        responsavel: novoResponsavel,
                        observacoes: "",
                        valorOriginal: newValorParcela,
                        parcelaAtual: i + 1,
                        totalParcelas: newTotalParcelas,
                        idParcela: baseId,
                        vencimento: novaData.toISOString().split('T')[0],
                        novoVencimento: "",
                        pagamentoEfetuado: "nao",
                        formaPagamento: "",
                        transferenciaEfetuda: "nao"
                    });
                }
            }
        }

        const grupoFinal = expenses.filter(exp =>
            (exp.idParcela === (expense.idParcela || expense.id)) ||
            exp.id === (expense.idParcela || expense.id)
        ).sort((a, b) => a.parcelaAtual - b.parcelaAtual);

        grupoFinal.forEach((p, index) => {
            const row = rows[index];
            p.descricao = novaDescricao;
            p.categoria = novaCategoria;
            p.responsavel = novoResponsavel;
            p.valorOriginal = newValorParcela;
            p.totalParcelas = newTotalParcelas;
            if (index === 0) p.observacoes = novasObservacoes;

            if (row) {
                const inputDue = row.querySelector(".installment-due");
                const selectPaid = row.querySelector(".installment-paid");
                const selectMethod = row.querySelector(".installment-method");

                if (inputDue && !inputDue.disabled) p.vencimento = inputDue.value;
                if (selectPaid && !selectPaid.disabled) p.pagamentoEfetuado = selectPaid.value;
                if (selectMethod && !selectMethod.disabled) p.formaPagamento = selectMethod.value;
            }
        });

    } else {
        expense.observacoes = novasObservacoes;
        rows.forEach((row) => {
            const inputDue = row.querySelector(".installment-due");
            const selectPaid = row.querySelector(".installment-paid");
            const selectMethod = row.querySelector(".installment-method");

            if (inputDue && !inputDue.disabled) {
                expense.vencimento = inputDue.value;
                expense.pagamentoEfetuado = selectPaid.value;
                expense.formaPagamento = selectMethod.value;
            }
        });
    }

    saveExpensesToStorage();
    closeModal("edit-modal");
    refreshCurrentPage();
    alert("✅ Despesa atualizada com sucesso!");
}

function renderEditInstallments(expense) {
    const tbody = document.getElementById("editInstallmentsTableBody");
    tbody.innerHTML = "";

    const installmentValue = (expense.valorOriginal).toFixed(2);
    const parcelas = expenses.filter(exp =>
        exp.descricao === expense.descricao &&
        exp.responsavel === expense.responsavel &&
        exp.totalParcelas === expense.totalParcelas
    ).sort((a, b) => parseDate(a.vencimento) - parseDate(b.vencimento));

    parcelas.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `
		  <td>R$ ${installmentValue}</td>
		  <td>${p.parcelaAtual}/${p.totalParcelas}</td>
		  <td>
			<input type="date" 
				   value="${p.vencimento}" 
				   class="form__input installment-due" 
				   style="width: 100%; font-size: 12px; padding: 4px;">
		  </td>
		`;
        tbody.appendChild(row);
    });

    setTimeout(() => {
        applyInstallmentDateValidation('edit', { expense });
    }, 10);
}

function viewExpense(expenseId) {
    const expense = expenses.find(exp => exp.id === expenseId);
    if (!expense) {
        alert("Despesa não encontrada!");
        return;
    }

    const formatDate = (dateStr) => {
        const d = parseDate(dateStr);
        return d && !isNaN(d) ? d.toLocaleDateString("pt-BR") : "-";
    };

    document.getElementById("viewDescricao").textContent = expense.descricao;
    document.getElementById("viewCategoria").textContent = expense.categoria;
    document.getElementById("viewResponsavel").textContent = expense.responsavel;
    document.getElementById("viewParcelas").textContent = `${expense.parcelaAtual}/${expense.totalParcelas}`;
    document.getElementById("viewValor").textContent = "R$ " + expense.valorOriginal.toFixed(2).replace('.', ',');
    document.getElementById("viewPago").textContent = expense.pagamentoEfetuado === "sim" ? "Sim" : "Não";
    document.getElementById("viewFormaPagamento").textContent = expense.formaPagamento || "N/A";
    document.getElementById("viewVencimento").textContent = formatDate(expense.vencimento);
    document.getElementById("viewNovoVencimento").textContent = formatDate(expense.novoVencimento);
    document.getElementById("viewStatus").textContent = getExpenseStatus(expense);
    document.getElementById("viewObservacoes").value = expense.observacoes || "";

    showModal("view-modal");
}

function updateExpenseModal(expenseId) {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;

    const status = getExpenseStatus(expense);
    if (status !== "Vencido") {
        alert("Apenas despesas vencidas podem ser atualizadas.");
        return;
    }

    if (expense.transferenciaEfetuda === "sim") {
        alert("Despesas transferidas não podem ser atualizadas novamente.");
        return;
    }

    expenseIdToUpdate = expenseId;

    document.getElementById("updateDescription").value = expense.descricao;
    document.getElementById("updateCategory").value = expense.categoria;
    document.getElementById("updateResponsible").value = expense.responsavel;
    document.getElementById("updateValue").value = expense.valorOriginal.toFixed(2);
    document.getElementById("updateInstallments").value = 1;

    const tbody = document.getElementById("updateInstallmentsTableBody");
    if (tbody) tbody.innerHTML = "";

    generateInstallmentsTable('update', { expense, originalDue: expense.vencimento });
    showModal("update-modal");
}

function confirmUpdate() {
    const parent = expenses.find(e => e.id === expenseIdToUpdate);

    if (!parent || getExpenseStatus(parent) !== "Vencido") {
        alert('Apenas despesas vencidas podem ser atualizadas.');
        return;
    }

    const validation = validateForm(validationConfigs.updateExpense);
    if (!validation.valid) {
        alert('Por favor, corrija os seguintes erros:\n' + validation.errors.join('\n'));
        return;
    }

    const totalParcelas = parseInt(document.getElementById('updateInstallments').value, 10);
    const valorTotal = parseFloat(document.getElementById('updateValue').value);
    const rows = Array.from(document.querySelectorAll('#updateInstallmentsTableBody tr'));
    const dueDates = rows.map(r => r.querySelector('input[type="date"]').value);

    const originalDate = parseDate(parent.vencimento);
    const firstNewDate = parseDate(dueDates[0]);

    if (firstNewDate <= originalDate) {
        alert('A primeira parcela da despesa atualizada deve ter vencimento posterior à despesa original.');
        return;
    }

    parent.transferenciaEfetuda = "sim";
    parent.novoVencimento = dueDates[0];

    const baseId = Date.now();
    const valorParcela = parseFloat((valorTotal / totalParcelas).toFixed(2));

    const newExpenses = Array.from({ length: totalParcelas }, (_, i) => ({
        id: baseId + i,
        descricao: parent.descricao,
        categoria: parent.categoria,
        responsavel: parent.responsavel,
        observacoes: parent.observacoes || '',
        valorOriginal: valorParcela,
        parcelaAtual: i + 1,
        totalParcelas,
        idParcela: i === 0 ? null : baseId,
        vencimento: dueDates[i],
        novoVencimento: "",
        pagamentoEfetuado: "nao",
        formaPagamento: parent.formaPagamento,
        transferenciaEfetuda: "nao"
    }));

    expenses.push(...newExpenses);
    saveExpensesToStorage();
    closeModal('update-modal');
    refreshCurrentPage();
    alert('Despesa atualizada com sucesso.');
}

// ===== 💳 PAGAMENTO DE DESPESAS =====
function payExpense(expenseId) {
    const expense = expenses.find(e => e.id === expenseId);

    if (!expense) return;

    if (expense.transferenciaEfetuda === "sim") {
        alert("Despesas transferidas não podem ser pagas através desta funcionalidade.");
        return;
    }

    expenseIdToPay = expenseId;

    document.getElementById('paymentDescription').textContent = expense.descricao;
    document.getElementById('paymentCategory').textContent = expense.categoria;
    document.getElementById('paymentResponsible').textContent = expense.responsavel;
    document.getElementById('paymentValue').textContent = 'R$ ' + expense.valorOriginal.toFixed(2).replace('.', ',');
    document.getElementById('paymentDue').textContent = formatDate(expense.vencimento);
    document.getElementById('paymentInstallment').textContent = `${expense.parcelaAtual}/${expense.totalParcelas}`;

    showModal('payment-modal');
}

function confirmPayment() {
    if (expenseIdToPay === null) {
        alert('Erro: Nenhuma despesa selecionada para pagamento.');
        return;
    }

    const expense = expenses.find(e => e.id === expenseIdToPay);

    if (!expense) {
        alert('Despesa não encontrada!');
        return;
    }

    const method = document.getElementById('paymentMethodSelect').value;
    expense.pagamentoEfetuado = "sim";
    expense.formaPagamento = method;

    saveExpensesToStorage();
    closeModal('payment-modal');
    expenseIdToPay = null;

    refreshCurrentPage();
    checkOverdueExpenses();

    alert(`Pagamento da despesa "${expense.descricao}" confirmado com sucesso!`);
}

function togglePaymentMethod(selectElement) {
    const row = selectElement.closest('tr');
    const methodSelect = row.querySelector('.installment-method');

    if (selectElement.value === 'sim') {
        methodSelect.disabled = false;
    } else {
        methodSelect.value = "";
        methodSelect.disabled = true;
    }
}

function validatePaymentButton() {
    const select = document.getElementById('paymentMethodSelect');
    const btn = document.getElementById('confirmPaymentBtn');

    if (select && select.value !== "") {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    } else {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
    }
}

// ===== 🗑️ EXCLUSÃO DE DESPESAS =====
function deleteExpense(expenseId) {
    const expense = expenses.find(exp => exp.id === expenseId);

    if (!expense) {
        alert('Despesa não encontrada!');
        return;
    }

    const isFirstInstallment = expense.idParcela === null;

    if (!isFirstInstallment) {
        alert("Apenas a primeira parcela de um grupo pode ser excluída. Esta ação excluirá automaticamente todas as parcelas do grupo.");
        return;
    }

    expenseIdToDelete = expenseId;

    const parcelasDoGrupo = expenses.filter(exp =>
        exp.descricao === expense.descricao &&
        exp.responsavel === expense.responsavel &&
        exp.totalParcelas === expense.totalParcelas
    );

    document.getElementById('deleteDescription').textContent = expense.descricao;
    document.getElementById('deleteCategory').textContent = expense.categoria;
    document.getElementById('deleteResponsible').textContent = expense.responsavel;
    document.getElementById('deleteValue').textContent = 'R$ ' + expense.valorOriginal.toFixed(2).replace('.', ',');
    document.getElementById("viewFormaPagamento").textContent = expense.formaPagamento || "N/A";
    document.getElementById('deleteDue').textContent = formatDate(expense.vencimento);
    document.getElementById('deleteInstallment').textContent = `${expense.parcelaAtual}/${expense.totalParcelas}`;
    document.getElementById('deleteStatus').textContent = getExpenseStatus(expense);

    showModal('delete-modal');
}

function confirmDelete() {
    if (expenseIdToDelete !== null) {
        const expense = expenses.find(exp => exp.id === expenseIdToDelete);

        if (!expense) {
            alert('Despesa não encontrada!');
            return;
        }

        const parcelasDoGrupo = expenses.filter(exp =>
            exp.descricao === expense.descricao &&
            exp.responsavel === expense.responsavel &&
            exp.totalParcelas === expense.totalParcelas
        );

        const totalExcluidas = parcelasDoGrupo.length;

        expenses = expenses.filter(exp =>
            !(exp.descricao === expense.descricao &&
                exp.responsavel === expense.responsavel &&
                exp.totalParcelas === expense.totalParcelas)
        );

        saveExpensesToStorage();
        refreshCurrentPage();

        const plural = totalExcluidas > 1 ? 's' : '';
        alert(`${totalExcluidas} despesa${plural} excluída${plural} com sucesso!`);

        closeModal('delete-modal');
        expenseIdToDelete = null;
    }

    refreshCurrentPage();
}

// ===== 📦 PARCELAS E VALIDAÇÃO =====
function applyInstallmentDateValidation(context, options = {}) {
    const { originalDue } = options;

    const configs = {
        add: 'installmentsTableBody',
        edit: 'editInstallmentsTableBody',
        update: 'updateInstallmentsTableBody'
    };

    const tableBodyId = configs[context];
    if (!tableBodyId) return;

    const rows = document.querySelectorAll(`#${tableBodyId} tr`);

    rows.forEach((row, idx) => {
        const dateInput = row.querySelector(".installment-due, input[type='date']");
        if (!dateInput) return;

        dateInput.onchange = null;

        if (context === "update" && idx === 0 && originalDue) {
            const originalDate = parseDate(originalDue);
            const minDate = new Date(originalDate);

            minDate.setDate(minDate.getDate() + 1); // próximo dia
            dateInput.min = minDate.toISOString().split('T')[0];

            const currentValue = parseDate(dateInput.value);
            if (!currentValue || currentValue <= originalDate) {
                dateInput.value = dateInput.min;
            }
        }

        if (idx > 0) {
            const prevDateInput = rows[idx - 1].querySelector(".installment-due, input[type='date']");
            if (prevDateInput && prevDateInput.value) {
                const prevDate = parseDate(prevDateInput.value);
                const minDate = new Date(prevDate);

                minDate.setDate(minDate.getDate() + 1); // próximo dia
                dateInput.min = minDate.toISOString().split('T')[0];
            }
        } else {
            if (!(context === "update")) {
                dateInput.removeAttribute('min');
            }
        }

        if (idx < rows.length - 1) {
            const nextDateInput = rows[idx + 1].querySelector(".installment-due, input[type='date']");
            if (nextDateInput && nextDateInput.value) {
                const nextDate = parseDate(nextDateInput.value);
                const maxDate = new Date(nextDate);

                maxDate.setDate(maxDate.getDate() - 1);
                dateInput.max = maxDate.toISOString().split('T')[0];
            } else {
                dateInput.removeAttribute('max');
            }
        } else {
            dateInput.removeAttribute("max");
        }

        const currentValue = parseDate(dateInput.value);
        const minValue = dateInput.min ? parseDate(dateInput.min) : null;
        const maxValue = dateInput.max ? parseDate(dateInput.max) : null;

        if (minValue && currentValue < minValue) {
            dateInput.value = dateInput.min;
        }
        if (maxValue && currentValue > maxValue) {
            dateInput.value = dateInput.max;
        }

        dateInput.value = dateInput.value;
        dateInput.dispatchEvent(new Event("input"));

        dateInput.onchange = () => {
            applyInstallmentDateValidation(context, options);
        };
    });
}

function validateSpecificInstallment(input, installmentNumber, expense) {
    const newDate = parseDate(input.value);
    const completeGroup = expenses
        .filter(exp =>
            exp.descricao === expense.descricao &&
            exp.responsavel === expense.responsavel &&
            exp.totalParcelas === expense.totalParcelas
        )
        .sort((a, b) => a.parcelaAtual - b.parcelaAtual);

    const previousInstallment = completeGroup[installmentNumber - 2];
    const nextInstallment = completeGroup[installmentNumber];

    let valid = true;
    let message = "";

    if (previousInstallment) {
        const previousDate = parseDate(previousInstallment.vencimento);
        if (newDate <= previousDate) {
            valid = false;
            message = `A parcela ${installmentNumber} deve ter vencimento posterior à parcela ${installmentNumber - 1}.`;
        }
    }

    if (nextInstallment && valid) {
        const nextDate = parseDate(nextInstallment.vencimento);
        if (newDate >= nextDate) {
            valid = false;
            message = `A parcela ${installmentNumber} deve ter vencimento anterior à parcela ${installmentNumber + 1}.`;
        }
    }

    if (!valid) {
        alert(message);
        input.focus();
        input.style.borderColor = "var(--color-danger)";
    } else {
        input.style.borderColor = "var(--color-success)";
    }
}

function generateInstallmentsTable(context, options = {}) {
    const { expense = null, originalDue = null } = options;

    const configs = {
        add: {
            valueId: 'expenseValue',
            installmentsId: 'expenseInstallments',
            tableBodyId: 'installmentsTableBody',
            generateFromInputs: true,
            allEditable: true
        },
        edit: {
            valueId: 'editExpenseValue',
            installmentsId: 'editExpenseInstallments',
            tableBodyId: 'editInstallmentsTableBody',
            generateFromInputs: true,
            editableRule: 'conditional'
        },
        update: {
            valueId: 'updateValue',
            installmentsId: 'updateInstallments',
            tableBodyId: 'updateInstallmentsTableBody',
            generateFromInputs: true,
            allEditable: true,
            futureOnly: true
        }
    };

    const config = configs[context];
    if (!config) return;

    const tbody = document.getElementById(config.tableBodyId);
    if (!tbody) return;

    let totalParcelas, valorTotal, valorParcela;

    if (config.generateFromInputs) {
        valorTotal = parseFloat(document.getElementById(config.valueId).value) || 0;
        totalParcelas = parseInt(document.getElementById(config.installmentsId).value) || 1;
        valorParcela = (valorTotal / totalParcelas).toFixed(2);
    } else {
        valorTotal = expense.valorOriginal * expense.totalParcelas;
        totalParcelas = expense.totalParcelas;
        valorParcela = expense.valorOriginal.toFixed(2);
    }

    tbody.innerHTML = '';
    if (valorTotal <= 0 || totalParcelas <= 0) return;

    if (context === 'edit' && expense && expense.idParcela !== null) {
        const grupoCompleto = expenses
            .filter(exp =>
                exp.descricao === expense.descricao &&
                exp.responsavel === expense.responsavel &&
                exp.totalParcelas === expense.totalParcelas
            )
            .sort((a, b) => a.parcelaAtual - b.parcelaAtual);

        grupoCompleto.forEach((parcela) => {
            const isCurrentParcela = parcela.id === expense.id;
            const row = document.createElement('tr');

            if (isCurrentParcela) {
                row.style.backgroundColor = 'var(--color-primary-light, rgba(59, 130, 246, 0.1))';
                row.style.border = '2px solid var(--color-primary, #3b82f6)';
            }

            row.innerHTML = `
			<td>R$ ${parcela.valorOriginal.toFixed(2).replace('.', ',')}</td>
			<td>${parcela.parcelaAtual}/${parcela.totalParcelas}</td>
			<td>
			  <select class="form__input installment-paid" style="padding: 4px; font-size: 12px;" 
				${!isCurrentParcela ? 'disabled' : ''} onchange="togglePaymentMethod(this)">
				<option value="nao" ${parcela.pagamentoEfetuado === 'nao' ? 'selected' : ''}>NÃO</option>
				<option value="sim" ${parcela.pagamentoEfetuado === 'sim' ? 'selected' : ''}>SIM</option>
			  </select>
			</td>
			<td>
			  <select class="form__input installment-method" style="padding: 4px; font-size: 12px;" 
				${(!isCurrentParcela || parcela.pagamentoEfetuado === 'nao') ? 'disabled' : ''}>
				<option value="">Escolha...</option>
				<option value="Dinheiro" ${parcela.formaPagamento === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
				<option value="Cheque" ${parcela.formaPagamento === 'Cheque' ? 'selected' : ''}>Cheque</option>
				<option value="Cartão (débito)" ${parcela.formaPagamento === 'Cartão (débito)' ? 'selected' : ''}>Cartão (débito)</option>
				<option value="Cartão (crédito)" ${parcela.formaPagamento === 'Cartão (crédito)' ? 'selected' : ''}>Cartão (crédito)</option>
				<option value="PIX (débito)" ${parcela.formaPagamento === 'PIX (débito)' ? 'selected' : ''}>PIX (débito)</option>
				<option value="PIX (crédito)" ${parcela.formaPagamento === 'PIX (crédito)' ? 'selected' : ''}>PIX (crédito)</option>
				<option value="Débito automático" ${parcela.formaPagamento === 'Débito automático' ? 'selected' : ''}>Débito automático</option>
			  </select>
			</td>
			<td>
			  <input type="date" value="${parcela.vencimento}" class="form__input installment-due"
				${!isCurrentParcela ? 'disabled' : ''}
				style="width: 100%; font-size: 12px; padding: 4px; ${!isCurrentParcela ? 'background-color: #f5f5f5; color: #666;' : ''}">
			</td>
		  `;
            tbody.appendChild(row);
        });

        setTimeout(() => {
            applyInstallmentDateValidation('edit', options);
        }, 10);

        return;
    }

    let baseDate;
    if (context === 'add') {
        baseDate = new Date();
    } else if (context === 'update' && originalDue) {
        baseDate = parseDate(originalDue);
        baseDate.setMonth(baseDate.getMonth() + 1);
    } else if (expense) {
        baseDate = parseDate(expense.vencimento);
    } else {
        baseDate = new Date();
    }

    for (let i = 0; i < totalParcelas; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(baseDate.getMonth() + i);
        const yyyyMMdd = dueDate.toISOString().split('T')[0];

        let disabled = false;
        if (config.editableRule === 'conditional' && expense) {
            const isFirstInstallment = expense.idParcela === null;
            if (isFirstInstallment && i > 0) {
                disabled = true;
            }
        }

        const row = document.createElement('tr');
        let isCurrentParcela = (context === 'edit' && expense) ? (i + 1 === expense.parcelaAtual) : false;

        if (isCurrentParcela) {
            row.style.backgroundColor = 'var(--color-primary-light, rgba(59, 130, 246, 0.1))';
            row.style.border = '2px solid var(--color-primary, #3b82f6)';
        }

        row.innerHTML = `
		  <td>R$ ${valorParcela.replace('.', ',')}</td>
		  <td>${i + 1}/${totalParcelas}</td>
		  <td>
			<select class="form__input installment-paid" style="padding: 4px; font-size: 12px;" 
			  ${disabled ? 'disabled' : ''} onchange="togglePaymentMethod(this)">
			  <option value="nao" ${(!expense || expense.pagamentoEfetuado === 'nao') ? 'selected' : ''}>NÃO</option>
			  <option value="sim" ${(expense && expense.pagamentoEfetuado === 'sim') ? 'selected' : ''}>SIM</option>
			</select>
		  </td>
		  <td>
			<select class="form__input installment-method" style="padding: 4px; font-size: 12px;" 
			  ${(disabled || !expense || expense.pagamentoEfetuado === 'nao') ? 'disabled' : ''}>
			  <option value="">Escolha...</option>
			  <option value="Dinheiro" ${expense?.formaPagamento === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
			  <option value="Cheque" ${expense?.formaPagamento === 'Cheque' ? 'selected' : ''}>Cheque</option>
			  <option value="Cartão (débito)" ${expense?.formaPagamento === 'Cartão (débito)' ? 'selected' : ''}>Cartão (débito)</option>
			  <option value="Cartão (crédito)" ${expense?.formaPagamento === 'Cartão (crédito)' ? 'selected' : ''}>Cartão (crédito)</option>
			  <option value="PIX (débito)" ${expense?.formaPagamento === 'PIX (débito)' ? 'selected' : ''}>PIX (débito)</option>
			  <option value="PIX (crédito)" ${expense?.formaPagamento === 'PIX (crédito)' ? 'selected' : ''}>PIX (crédito)</option>
			  <option value="Débito automático" ${expense?.formaPagamento === 'Débito automático' ? 'selected' : ''}>Débito automático</option>
			</select>
		  </td>
		  <td>
			<input type="date" value="${yyyyMMdd}" class="form__input installment-due" 
			  ${disabled ? 'disabled' : ''} style="width: 100%; font-size: 12px; padding: 4px;">
		  </td>
		`;
        tbody.appendChild(row);
    }

    setTimeout(() => {
        applyInstallmentDateValidation(context, options);
    }, 10);
}

// ===== 💾 ARMAZENAMENTO =====
function saveExpensesToStorage() {
    try {
        localStorage.setItem('cgd_expenses', JSON.stringify(expenses));
        localStorage.setItem('cgd_last_save', new Date().toISOString());
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        alert('Erro ao salvar dados. Verifique o espaço disponível no navegador.');
    }
}

function loadExpensesFromStorage() {
    try {
        const saved = localStorage.getItem('cgd_expenses');

        if (saved) {
            expenses = JSON.parse(saved);
        }

        applySavedTheme();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        expenses = [];
    }
}

// ===== 📤 BACKUP =====
function selectImportMode(mode) {
    currentImportMode = mode;

    document.querySelectorAll("#importForm .format-option[data-mode]").forEach(opt => {
        opt.classList.remove("selected");
    });

    const selected = document.querySelector(`#importForm .format-option[data-mode="${mode}"]`);
    if (selected) {
        selected.classList.add("selected");
    }
}

function selectFormat(type, format) {
    if (type === 'export') {
        currentExportFormat = format;
        document.querySelectorAll("#exportForm .format-option[data-format]").forEach(opt => {
            opt.classList.remove("selected");
        });

        const selected = document.querySelector(`#exportForm .format-option[data-format="${format}"]`);
        if (selected) {
            selected.classList.add("selected");
        }
    } else if (type === 'import') {
        currentImportFormat = format;
        document.querySelectorAll("#importForm .format-option[data-format]").forEach(opt => {
            opt.classList.remove("selected");
        });

        const selected = document.querySelector(`#importForm .format-option[data-format="${format}"]`);
        if (selected) {
            selected.classList.add("selected");
        }
    }
}

function performExport() {
    if (expenses.length === 0) {
        alert("Não há despesas para exportar.");
        return;
    }

    const fileNameInput = document.getElementById("exportFileName").value.trim();
    const fileName = fileNameInput || `cgd-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;

    let blob, extension;

    if (currentExportFormat === "json") {
        const jsonData = JSON.stringify(expenses, null, 2);
        blob = new Blob([jsonData], { type: "application/json" });
        extension = "json";
    } else if (currentExportFormat === "csv") {
        const csvData = convertExpensesToCSV(expenses);
        blob = new Blob(["\uFEFF" + csvData], { type: "text/csv;charset=utf-8;" });
        extension = "csv";
    } else {
        alert("Formato de exportação inválido.");
        return;
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.${extension}`;
    link.click();

    URL.revokeObjectURL(link.href);
    alert("Backup exportado com sucesso!");
}

function performImport() {
    if (!validateImportFile()) return;

    const fileInput = document.getElementById("importFile");
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const content = e.target.result;

        try {
            if (currentImportFormat === "json") {
                const data = JSON.parse(content);

                if (!isValidBackup(data)) {
                    alert("❌ O arquivo selecionado não é um backup válido do CGD.");
                    return;
                }

                applyImportedData(data);
            } else if (currentImportFormat === "csv") {
                const data = parseCSV(content);

                if (!isValidBackup(data)) {
                    alert("❌ O arquivo CSV não segue o formato esperado.");
                    return;
                }

                applyImportedData(data);
            }
        } catch (err) {
            alert("Erro ao importar arquivo: " + err.message);
        }
    };

    reader.readAsText(file);
}

function convertExpensesToCSV(data) {
    if (!data || data.length === 0) return "";

    const header = Object.keys(data[0]).join(";");
    const rows = data.map(exp =>
        Object.values(exp).map(v => `"${v}"`).join(";")
    );

    return [header, ...rows].join("\n");
}

function validateImportFile() {
    const fileInput = document.getElementById("importFile");
    if (!fileInput || fileInput.files.length === 0) {
        alert("Selecione um arquivo antes de importar.");
        return false;
    }
    return true;
}

function generateDefaultBackupFileName() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    const fileNameInput = document.getElementById("exportFileName");
    fileNameInput.value = `cgd-backup-${yyyy}_${MM}_${dd}-${HH}_${mm}_${ss}`;

    return fileNameInput.value;
}

function isValidBackup(data) {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true;

    return data.every(item => {
        return (
            typeof item === "object" &&
            item !== null &&
            "id" in item && typeof item.id === "number" &&
            "descricao" in item && typeof item.descricao === "string" &&
            "valorOriginal" in item && typeof item.valorOriginal === "number" &&
            "vencimento" in item && typeof item.vencimento === "string"
        );
    });
}

function applyImportedData(data) {
    if (currentImportMode === "replace") {
        expenses = data;
    } else if (currentImportMode === "merge") {
        expenses = [...expenses, ...data];
    }

    saveExpensesToStorage();
    closeModal('restore-modal');

    refreshCurrentPage();
    resetBackupForms();

    alert("✅ Importação concluída com sucesso!");
}

function resetBackupForms() {
    const fileInput = document.getElementById("importFile");
    if (fileInput) fileInput.value = "";

    const exportPathInput = document.getElementById("exportPath");
    if (exportPathInput) {
        exportPathInput.value = "C:\\Users\\Usuário\\Documents\\CGD\\backups";
    }

    if (document.getElementById("exportFileName")) {
        generateDefaultBackupFileName();
    }
}

console.log('🎯 Sistema de Controle de Gastos Domésticos carregado com sucesso!');
setInterval(checkOverdueExpenses, 3000);