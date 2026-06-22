// ===== 🌐 CORE — STATE =====
// Variáveis globais e configurações de estado do sistema

export let expenses = [];

export let expenseIdToPay    = null;
export let expenseIdToUpdate = null;
export let expenseIdToEdit   = null;
export let expenseIdToDelete = null;

export let currentExportFormat = 'json';
export let currentImportFormat = 'json';
export let currentImportMode   = 'replace';

export let chartMonthlyTrend  = null;
export let chartByCategory    = null;
export let chartByStatus      = null;
export let chartByResponsible = null;
export let chartTop5          = null;

export const currentFilters = {
    month:         new Date().getMonth() + 1,
    year:          new Date().getFullYear(),
    category:      'Todas',
    status:        'Todos',
    responsible:   'Todos',
    sort:          'Vencimento',
    paymentMethod: 'Todos'
};

// Setters — permitem que outros módulos atualizem o estado de forma controlada
export function setExpenses(data)               { expenses = data; }
export function pushExpenses(...items)          { expenses.push(...items); }
export function filterExpenses(fn)              { expenses = expenses.filter(fn); }

export function setExpenseIdToPay(id)           { expenseIdToPay    = id; }
export function setExpenseIdToUpdate(id)        { expenseIdToUpdate = id; }
export function setExpenseIdToEdit(id)          { expenseIdToEdit   = id; }
export function setExpenseIdToDelete(id)        { expenseIdToDelete = id; }

export function setCurrentExportFormat(fmt)     { currentExportFormat = fmt; }
export function setCurrentImportFormat(fmt)     { currentImportFormat = fmt; }
export function setCurrentImportMode(mode)      { currentImportMode   = mode; }

export function setChart(name, instance) {
    switch (name) {
        case 'monthlyTrend':  chartMonthlyTrend  = instance; break;
        case 'byCategory':    chartByCategory    = instance; break;
        case 'byStatus':      chartByStatus      = instance; break;
        case 'byResponsible': chartByResponsible = instance; break;
        case 'top5':          chartTop5          = instance; break;
    }
}

// validationConfigs depende de funções de outros módulos;
// é montado em app.js após todos os imports estarem resolvidos.
export let validationConfigs = {};
export function setValidationConfigs(configs) { validationConfigs = configs; }
