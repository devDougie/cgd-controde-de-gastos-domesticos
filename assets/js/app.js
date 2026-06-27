// ===== 🚀 APP — PONTO DE ENTRADA =====
// Inicialização do sistema e namespace global CGD (expõe funções ao HTML)

import { expenses, expenseIdToUpdate, setValidationConfigs } from './core/state.js';
import { loadExpensesFromStorage, saveExpensesToStorage,
         migrateExpensesIfNeeded }                          from './core/storage.js';
import { parseDate }                                         from './utils/formatters.js';
import { validateForm }                                      from './utils/validators.js';

import { navigateTo, showModal, closeModal,
         toggleTheme, refreshCurrentPage, confirmExit }      from './components/sidebar.js';

import { registerPage }                                      from './core/router.js';

import { setCurrentDate, populateFilters, populateYearSelect,
         updateSummary, renderTable, clearFilters,
         applyPageFilters, updateDateFilter, performSearch,
         checkOverdueExpenses }                              from './pages/dashboard.js';

import { saveExpense, editExpense, updateExpense,
         viewExpense, generateInstallmentsTable,
         applyInstallmentDateValidation,
         togglePaymentMethod, resetNewExpenseForm }          from './pages/edit.js';

import { payExpense, confirmPayment, validatePaymentButton,
         updateExpenseModal, confirmUpdate,
         deleteExpense, confirmDelete }                      from './pages/payment.js';

import { selectFormat, selectImportMode, performExport,
         performImport, generateDefaultBackupFileName,
         resetBackupForms }                                  from './pages/backup.js';

// ── Configurações de validação ─────────────────────────────────────────────────

function buildValidationConfigs() {
    return {
        addExpense: {
            modalSelector: '#add-modal',
            fields: [
                { id: 'expenseDescription', type: 'text',   minLength: 3, label: 'Descrição' },
                { id: 'expenseCategory',    type: 'select',               label: 'Categoria' },
                { id: 'expenseResponsible', type: 'text',   minLength: 2, label: 'Responsável' },
                { id: 'expenseValue',       type: 'number',               label: 'Valor' },
                { id: 'expenseInstallments',type: 'number', maxValue: 100, label: 'Parcelas' }
            ]
        },
        editExpense: {
            modalSelector: '#edit-modal',
            fields: [
                { id: 'editExpenseDescription', type: 'text',   minLength: 3, label: 'Descrição' },
                { id: 'editExpenseCategory',    type: 'select',               label: 'Categoria' },
                { id: 'editExpenseResponsible', type: 'text',   minLength: 2, label: 'Responsável' },
                { id: 'editExpenseValue',       type: 'number',               label: 'Valor' },
                { id: 'editExpenseInstallments',type: 'number', maxValue: 100, label: 'Parcelas' }
            ]
        },
        updateExpense: {
            modalSelector: '#update-modal',
            fields: [
                { id: 'updateValue',        type: 'number',               label: 'Valor' },
                { id: 'updateInstallments', type: 'number', maxValue: 100, label: 'Parcelas' }
            ],
            customValidations: [
                () => {
                    const { expenseIdToUpdate: id } = window._cgdState || {};
                    const expense = expenses.find(e => e.id === id);
                    if (!expense) return { valid: false, message: 'Despesa não encontrada' };

                    const originalDate = parseDate(expense.vencimento);
                    const firstInput   = document.querySelector('#updateInstallmentsTableBody input[type="date"]');

                    if (firstInput) {
                        const firstNewDate = parseDate(firstInput.value);
                        if (firstNewDate <= originalDate) {
                            return { valid: false, message: 'A primeira parcela deve ter vencimento posterior à despesa original' };
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
}

// ── Registro das páginas no router ────────────────────────────────────────────

function registerAllPages() {
    // Dashboard
    registerPage('dashboard-page', () => {
        setCurrentDate();
        populateFilters();
        setupAllFiltersListeners();
        updateSummary('dashboard');
        renderTable('dashboard');
        checkOverdueExpenses();
    });

    // Editar/Remover
    registerPage('edit-page', () => {
        populateFilters();
        setupAllFiltersListeners();
        clearFilters('edit');
        updateSummary('edit');
        renderTable('edit');
    });

    // Pagar/Atualizar
    registerPage('payment-page', () => {
        populateFilters();
        setupAllFiltersListeners();
        clearFilters('pending');
        updateSummary('pending');
        renderTable('pending');
    });

    // Backup
    registerPage('backup-page', () => {
        updateSummary('backup');
        resetBackupForms();
        selectFormat('export', 'json');
        generateDefaultBackupFileName();
        selectFormat('import', 'json');
        selectImportMode('replace');
    });

    // Relatórios e Sobre — sem inicializador JS (conteúdo estático)
    // registerPage('report-page', () => {});
    // registerPage('info-page',   () => {});
}

// ── Listeners dos filtros ─────────────────────────────────────────────────────

function setupAllFiltersListeners() {
    const editFilters = [
        'editMonthSelect', 'editYearSelect', 'editCategoryFilter',
        'editStatusFilter', 'editResponsibleFilter', 'editSortFilter', 'editPaymentMethodFilter'
    ];
    editFilters.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => { renderTable('edit'); updateSummary('edit'); });
    });

    const pendingFilters = [
        'pendingYearSelect', 'pendingCategoryFilter',
        'pendingStatusFilter', 'pendingResponsibleFilter', 'pendingSortFilter'
    ];
    pendingFilters.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => { renderTable('pending'); updateSummary('pending'); });
    });
}

function setupModalListeners() {
    ['expenseValue', 'expenseInstallments'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener('input', () => {
            setTimeout(() => generateInstallmentsTable('add'), 50);
        });
    });

    ['editExpenseValue', 'editExpenseInstallments'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener('input', () => {
            const exp = expenses.find(e => e.id === window._cgdState?.expenseIdToEdit);
            if (exp) setTimeout(() => generateInstallmentsTable('edit', { expense: exp }), 50);
        });
    });

    ['updateValue', 'updateInstallments'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener('input', () => {
            const exp = expenses.find(e => e.id === window._cgdState?.expenseIdToUpdate);
            if (exp) setTimeout(() => generateInstallmentsTable('update', { expense: exp, originalDue: exp.vencimento }), 50);
        });
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.show');
            if (activeModal) closeModal(activeModal.id);
        }
    });
}

function setupDateInputsValidation() {
    document.addEventListener('input', e => {
        if (e.target.matches("input[type='date']")) {
            const date = parseDate(e.target.value);
            e.target.style.borderColor = (!e.target.value || !date || isNaN(date))
                ? 'var(--color-danger)'
                : 'var(--color-success)';
        }
    });
    document.addEventListener('keydown',  e => { if (e.target.matches("input[type='date']")) e.preventDefault(); });
    document.addEventListener('paste',    e => { if (e.target.matches("input[type='date']")) e.preventDefault(); });
}

// ── Inicialização ─────────────────────────────────────────────────────────────

function initializeSystem() {
    // Expõe estado para customValidations que precisam de IDs
    import('./core/state.js').then(state => { window._cgdState = state; });

    setValidationConfigs(buildValidationConfigs());

    loadExpensesFromStorage();

    // Migração: garante que todos os dados legados recebam groupId
    const wasMigrated = migrateExpensesIfNeeded();
    if (wasMigrated) saveExpensesToStorage();

    // Aplica tema salvo antes de qualquer renderização
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const toggle = document.getElementById('themeToggle');
        const modeText = document.getElementById('modeText');
        if (toggle) toggle.classList.add('dark');
        if (modeText) modeText.textContent = '🌙 Modo Escuro';
    }

    setupDateInputsValidation();
    setupModalListeners();

    // Registra todas as páginas no router
    registerAllPages();

    // Carrega o dashboard como página inicial
    navigateTo('dashboard-page');

    // Mostra o modal de boas-vindas se não há dados
    if (expenses.length === 0) {
        // Aguarda o DOM da página ser injetado pelo router antes de abrir o modal
        setTimeout(() => showModal('welcomeModal'), 300);
    }

    // Checagem periódica de vencimentos (a cada 3s)
    setInterval(() => checkOverdueExpenses(), 3000);
}

document.addEventListener('DOMContentLoaded', initializeSystem);

// ── Namespace global CGD (funções chamadas via onclick no HTML) ───────────────

window.CGD = {
    // Navegação
    navigateTo,
    showModal,
    closeModal,
    toggleTheme,
    refreshCurrentPage,
    confirmExit,

    // Dashboard / filtros
    updateDateFilter,
    applyPageFilters,
    clearFilters,
    performSearch,

    // Despesas — criação
    saveExpense,
    generateInstallmentsTable,
    togglePaymentMethod,

    // Despesas — edição
    editExpense,
    updateExpense,
    viewExpense,

    // Despesas — pagamento / atualização
    payExpense,
    confirmPayment,
    validatePaymentButton,
    updateExpenseModal,
    confirmUpdate,

    // Despesas — exclusão
    deleteExpense,
    confirmDelete,

    // Backup
    selectFormat,
    selectImportMode,
    performExport,
    performImport,
    generateDefaultBackupFileName,
    resetBackupForms
};

console.log('🎯 CGD — Sistema de Controle de Gastos Domésticos carregado com sucesso! (Módulos ES6 + Router)');
