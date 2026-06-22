// ===== 📊 PAGES — DASHBOARD =====
// Filtros, tabela, resumo e notificações de atraso

import { expenses, currentFilters } from '../core/state.js';
import { parseDate, formatCurrency, formatDate } from '../utils/formatters.js';
import { getExpenseStatus, getStatusBadgeClass, getOverdueDays } from '../utils/expense-status.js';
import { renderCharts } from '../components/charts.js';

// ── Filtros ───────────────────────────────────────────────────────────────────

export function setCurrentDate() {
    const now          = new Date();
    const currentMonth = now.getMonth();
    const currentYear  = now.getFullYear();

    const monthSelect = document.getElementById('monthSelect');
    monthSelect.selectedIndex     = currentMonth;
    currentFilters.month          = currentMonth + 1;

    populateYearSelect(currentYear);
    currentFilters.year = currentYear;
}

export function populateYearSelect(currentYear) {
    const yearSelect = document.getElementById('yearSelect');
    yearSelect.innerHTML = '';

    const years = [...new Set(expenses.map(exp => parseDate(exp.vencimento).getFullYear()))];
    if (!years.includes(currentYear)) years.push(currentYear);
    years.sort((a, b) => a - b);

    years.forEach(year => {
        const option = document.createElement('option');
        option.value    = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    });
}

export function populateFilters() {
    populateFilter('responsibleFilter',      'responsible');
    populateFilter('statusFilter',           'status');
    populateFilter('editYearSelect',         'year');
    populateFilter('editStatusFilter',       'status', 'edit');
    populateFilter('editResponsibleFilter',  'responsible');
    populateFilter('pendingYearSelect',      'year');
    populateFilter('pendingStatusFilter',    'status', 'pending');
    populateFilter('pendingResponsibleFilter','responsible', 'pending');
    populateFilter('reportResponsibleFilter','responsible');
}

export function populateFilter(filterId, filterType, page = null) {
    const filter = document.getElementById(filterId);
    if (!filter) return;

    switch (filterType) {
        case 'responsible': {
            const responsibles = page === 'pending'
                ? [...new Set(expenses.filter(exp => { const s = getExpenseStatus(exp); return s === 'Aberto' || s === 'Vencido'; }).map(exp => exp.responsavel))]
                : [...new Set(expenses.map(exp => exp.responsavel))];

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
        }
        case 'status':
            if (page === 'edit') {
                const statuses = [...new Set(expenses.map(exp => getExpenseStatus(exp)))];
                filter.innerHTML = '<option value="Todas">Todas</option>';
                statuses.forEach(st => {
                    const option = document.createElement('option');
                    option.value = st; option.textContent = st;
                    filter.appendChild(option);
                });
            } else if (page === 'pending') {
                filter.innerHTML = `
                    <option value="Todas pendentes">Todas pendentes</option>
                    <option value="Aberto">Aberto</option>
                    <option value="Vencido">Vencido</option>`;
            } else {
                filter.innerHTML = `
                    <option>Todos</option>
                    <option>Pago</option>
                    <option>Aberto</option>
                    <option>Vencido</option>`;
            }
            break;

        case 'year': {
            const years = [...new Set(expenses.map(exp => parseDate(exp.vencimento).getFullYear()))];
            years.sort((a, b) => b - a);
            filter.innerHTML = '<option value="Todos os anos">Todos os anos</option>';
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year; option.textContent = year;
                filter.appendChild(option);
            });
            break;
        }
    }
}

export function updateDateFilter() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect  = document.getElementById('yearSelect');
    currentFilters.month = monthSelect.selectedIndex + 1;
    currentFilters.year  = parseInt(yearSelect.value);
    updateSummary('dashboard');
    renderTable('dashboard');
}

export function applyPageFilters(pageType) {
    if (pageType === 'dashboard') {
        currentFilters.category      = document.getElementById('categoryFilter').value;
        currentFilters.status        = document.getElementById('statusFilter').value;
        currentFilters.responsible   = document.getElementById('responsibleFilter').value;
        currentFilters.sort          = document.getElementById('sortFilter').value;
        const pmEl = document.getElementById('paymentMethodFilter');
        currentFilters.paymentMethod = pmEl ? pmEl.value : 'Todos';
        renderTable('dashboard');
    } else if (pageType === 'edit') {
        renderTable('edit');
        updateSummary('edit');
    } else if (pageType === 'pending') {
        renderTable('pending');
        updateSummary('pending');
    }
}

export function clearFilters(pageType) {
    if (pageType === 'dashboard') {
        setCurrentDate();
        document.getElementById('categoryFilter').value      = 'Todas';
        document.getElementById('statusFilter').value        = 'Todos';
        document.getElementById('responsibleFilter').value   = 'Todos';
        document.getElementById('sortFilter').value          = 'Vencimento';
        document.getElementById('paymentMethodFilter').value = 'Todos';

        currentFilters.category      = 'Todas';
        currentFilters.status        = 'Todos';
        currentFilters.responsible   = 'Todos';
        currentFilters.sort          = 'Vencimento';
        currentFilters.paymentMethod = 'Todos';

        updateSummary('dashboard');
        renderTable('dashboard');
    } else if (pageType === 'edit') {
        document.getElementById('editMonthSelect').selectedIndex     = 0;
        document.getElementById('editYearSelect').value              = 'Todos os anos';
        document.getElementById('editCategoryFilter').value          = 'Todas';
        document.getElementById('editStatusFilter').value            = 'Todas';
        document.getElementById('editResponsibleFilter').value       = 'Todos';
        document.getElementById('editSortFilter').selectedIndex      = 0;
        document.getElementById('editPaymentMethodFilter').value     = 'Todos';
        const si = document.getElementById('searchEditInput');
        if (si) si.value = '';
        renderTable('edit');
        updateSummary('edit');
    } else if (pageType === 'pending') {
        document.getElementById('pendingYearSelect').value            = 'Todos os anos';
        document.getElementById('pendingCategoryFilter').value        = 'Todas';
        document.getElementById('pendingStatusFilter').value          = 'Todas pendentes';
        document.getElementById('pendingResponsibleFilter').value     = 'Todos';
        document.getElementById('pendingSortFilter').selectedIndex    = 0;
        const sp = document.getElementById('searchPendingInput');
        if (sp) sp.value = '';
        renderTable('pending');
        updateSummary('pending');
    }
}

export function performSearch(pageType) {
    const searchInputId = pageType === 'edit' ? 'searchEditInput' : 'searchPendingInput';
    const searchValue   = document.getElementById(searchInputId).value.toLowerCase();

    let filtered = getFilteredExpenses(pageType);

    if (searchValue.trim() !== '') {
        filtered = filtered.filter(exp => {
            const valor = exp.valorOriginal.toFixed(2).replace('.', ',');
            return (
                exp.descricao.toLowerCase().includes(searchValue) ||
                exp.categoria.toLowerCase().includes(searchValue) ||
                exp.responsavel.toLowerCase().includes(searchValue) ||
                valor.includes(searchValue)
            );
        });
    }

    renderTable(pageType, filtered);
    updateSummary(pageType, filtered);
}

// ── Filtragem ─────────────────────────────────────────────────────────────────

export function getFilteredExpenses(pageType, customFilters = null) {
    const filterConfigs = {
        dashboard: {
            monthSelector:         'monthSelect',
            yearSelector:          'yearSelect',
            categorySelector:      'categoryFilter',
            statusSelector:        'statusFilter',
            responsibleSelector:   'responsibleFilter',
            sortSelector:          'sortFilter',
            paymentMethodSelector: 'paymentMethodFilter',
            useCurrentFilters: true,
            dateField: 'vencimento'
        },
        edit: {
            monthSelector:         'editMonthSelect',
            yearSelector:          'editYearSelect',
            categorySelector:      'editCategoryFilter',
            statusSelector:        'editStatusFilter',
            responsibleSelector:   'editResponsibleFilter',
            sortSelector:          'editSortFilter',
            paymentMethodSelector: 'editPaymentMethodFilter',
            useCurrentFilters: false,
            dateField: 'vencimento'
        },
        pending: {
            yearSelector:          'pendingYearSelect',
            categorySelector:      'pendingCategoryFilter',
            statusSelector:        'pendingStatusFilter',
            responsibleSelector:   'pendingResponsibleFilter',
            sortSelector:          'pendingSortFilter',
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
            const el = document.getElementById(config.monthSelector);
            filters.month = el ? el.selectedIndex : 0;
        }
        if (config.yearSelector) {
            const el = document.getElementById(config.yearSelector);
            filters.year = el ? el.value : 'Todos os anos';
        }
        if (config.categorySelector) {
            const el = document.getElementById(config.categorySelector);
            filters.category = el ? el.value : 'Todas';
        }
        if (config.statusSelector) {
            const el = document.getElementById(config.statusSelector);
            filters.status = el ? el.value : 'Todos';
        }
        if (config.responsibleSelector) {
            const el = document.getElementById(config.responsibleSelector);
            filters.responsible = el ? el.value : 'Todos';
        }
        if (config.sortSelector) {
            const el = document.getElementById(config.sortSelector);
            filters.sort = el ? el.value : 'Vencimento';
        }
        if (config.paymentMethodSelector) {
            const el = document.getElementById(config.paymentMethodSelector);
            filters.paymentMethod = el ? el.value : 'Todos';
        }
    }

    if (customFilters) filters = { ...filters, ...customFilters };

    let filtered = expenses.filter(expense => {
        const expenseDate = parseDate(expense[config.dateField]);
        if (!expenseDate) return false;

        const expenseMonth = expenseDate.getMonth() + 1;
        const expenseYear  = expenseDate.getFullYear();
        const status       = getExpenseStatus(expense);

        if (config.useCurrentFilters) {
            if (filters.month && expenseMonth !== filters.month) return false;
            if (filters.year  && expenseYear  !== filters.year)  return false;
        } else {
            if (filters.month > 0 && expenseMonth !== filters.month) return false;
            if (filters.year !== 'Todos os anos' && String(expenseYear) !== String(filters.year)) return false;
        }

        if (filters.category    && filters.category    !== 'Todas' && expense.categoria   !== filters.category)    return false;
        if (filters.responsible && filters.responsible !== 'Todos' && expense.responsavel  !== filters.responsible) return false;

        if (config.onlyPending) {
            if (expense.pagamentoEfetuado === 'sim') return false;
            if (filters.status && filters.status !== 'Todas pendentes' && status !== filters.status) return false;
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
                case 'Valor':      return b.valorOriginal - a.valorOriginal;
                case 'Status':     return getExpenseStatus(a).localeCompare(getExpenseStatus(b));
                case 'Descrição':  return a.descricao.localeCompare(b.descricao);
                default:           return 0;
            }
        });
    }

    return filtered;
}

// ── Tabela ────────────────────────────────────────────────────────────────────

export function renderTable(pageType, filteredExpenses = null) {
    const configs = {
        dashboard: {
            tableBodyId:  'expensesTableBody',
            sortFilterId: null,
            emptyMessage: 'Nenhuma despesa encontrada para os filtros selecionados.',
            actions: expense => `
                <button class="btn btn--view" onclick="CGD.viewExpense(${expense.id})" title="Ver Despesa">👁️</button>`
        },
        edit: {
            tableBodyId:  'editExpensesTableBody',
            sortFilterId: 'editSortFilter',
            emptyMessage: 'Nenhuma despesa encontrada para os filtros selecionados.',
            actions: expense => {
                const isFirst = expense.idParcela === null;
                return `
                    <button class="btn btn--edit" onclick="CGD.editExpense(${expense.id})" title="Editar Despesa">✏️</button>
                    <button class="btn btn--confirm-delete"
                        ${!isFirst ? 'disabled' : ''}
                        onclick="${isFirst ? `CGD.deleteExpense(${expense.id})` : ''}"
                        title="${!isFirst ? 'Apenas a primeira parcela pode ser excluída' : 'Excluir Despesa'}">🗑️</button>`;
            }
        },
        pending: {
            tableBodyId:  'pendingExpensesTableBody',
            sortFilterId: 'pendingSortFilter',
            emptyMessage: 'Nenhuma despesa pendente encontrada para os filtros selecionados.',
            actions: expense => {
                const status       = getExpenseStatus(expense);
                const isTransferred = expense.transferenciaEfetuda === 'sim';
                return `
                    <button class="btn btn--pay"
                        ${(status === 'Vencido' || isTransferred) ? 'disabled' : ''}
                        onclick="${isTransferred ? '' : `CGD.payExpense(${expense.id})`}"
                        title="Pagar Despesa">💵</button>
                    <button class="btn btn--update"
                        ${(status === 'Aberto' || isTransferred) ? 'disabled' : ''}
                        onclick="${isTransferred ? '' : `CGD.updateExpenseModal(${expense.id})`}"
                        title="Atualizar Despesa">🔄</button>`;
            }
        }
    };

    const config    = configs[pageType];
    const tableBody = document.getElementById(config.tableBodyId);
    const sort      = config.sortFilterId ? document.getElementById(config.sortFilterId).value : null;

    let filtered = filteredExpenses || getFilteredExpenses(pageType);

    if (sort) {
        filtered.sort((a, b) => {
            switch (sort) {
                case 'Vencimento': return new Date(a.vencimento) - new Date(b.vencimento);
                case 'Valor':      return b.valorOriginal - a.valorOriginal;
                case 'Status':     return getExpenseStatus(a).localeCompare(getExpenseStatus(b));
                case 'Descrição':  return a.descricao.localeCompare(b.descricao);
                default:           return 0;
            }
        });
    }

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center; padding:40px; color:var(--color-dark-gray);">
                    <em>${config.emptyMessage}</em>
                </td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = '';
    filtered.forEach(expense => {
        const status = getExpenseStatus(expense);
        const row    = document.createElement('tr');
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
                <td class="table__cell"><span class="status-badge status-badge--${getStatusBadgeClass(status)}">${status}</span></td>
                <td class="table__cell">${expense.novoVencimento ? formatDate(expense.novoVencimento) : '-'}</td>
                <td class="table__cell table__cell--actions"><div class="table__actions">${config.actions(expense)}</div></td>`;
        } else {
            let formaExibicao = '-';
            if (getExpenseStatus(expense) !== 'Transferido' && expense.pagamentoEfetuado === 'sim') {
                formaExibicao = expense.formaPagamento;
            }
            specificColumns = `
                <td class="table__cell" style="white-space:nowrap;">${formaExibicao}</td>
                <td class="table__cell">${formatDate(expense.vencimento)}</td>
                <td class="table__cell"><span class="status-badge status-badge--${getStatusBadgeClass(status)}">${status}</span></td>
                <td class="table__cell">${(expense.transferenciaEfetuda === 'sim' && expense.novoVencimento) ? formatDate(expense.novoVencimento) : '-'}</td>
                <td class="table__cell table__cell--actions"><div class="table__actions">${config.actions(expense)}</div></td>`;
        }

        row.innerHTML = baseColumns + specificColumns;
        tableBody.appendChild(row);
    });
}

// ── Resumo ────────────────────────────────────────────────────────────────────

export function updateSummary(pageType, customFiltered = null) {
    if (pageType === 'dashboard') {
        const filteredExpenses = getFilteredExpenses('dashboard').filter(e => e.transferenciaEfetuda !== 'sim');
        let totalMonth = 0, paid = 0, openn = 0, overdue = 0;

        filteredExpenses.forEach(exp => {
            totalMonth += exp.valorOriginal;
            const status = getExpenseStatus(exp);
            if (status === 'Pago')    paid   += exp.valorOriginal;
            else if (status === 'Aberto')  openn  += exp.valorOriginal;
            else if (status === 'Vencido') overdue += exp.valorOriginal;
        });

        document.getElementById('totalMonthValue').textContent = formatCurrency(totalMonth);
        document.getElementById('paidValue').textContent       = formatCurrency(paid);
        document.getElementById('openValue').textContent       = formatCurrency(openn);
        document.getElementById('overdueValue').textContent    = formatCurrency(overdue);

        const yearlyExpenses = expenses.filter(exp => {
            const d = parseDate(exp.vencimento);
            return d && d.getFullYear() === currentFilters.year && getExpenseStatus(exp) !== 'Transferido';
        });

        renderCharts(filteredExpenses, yearlyExpenses);

    } else if (pageType === 'edit') {
        const filtered       = customFiltered || getFilteredExpenses('edit');
        const filteredNoTransf = filtered.filter(e => e.transferenciaEfetuda !== 'sim');
        let paidCount = 0, notPaidCount = 0, totalValue = 0;

        filteredNoTransf.forEach(exp => {
            totalValue += exp.valorOriginal;
            if (exp.pagamentoEfetuado === 'sim') paidCount++;
            else notPaidCount++;
        });

        document.getElementById('totalFilteredValue').textContent = formatCurrency(totalValue);
        document.getElementById('itemsFoundValue').textContent    = filteredNoTransf.length;
        document.getElementById('paidItemsValue').textContent     = paidCount;
        document.getElementById('openItemsValue').textContent     = notPaidCount;

    } else if (pageType === 'pending') {
        const filtered         = customFiltered || getFilteredExpenses('pending');
        const filteredNoTransf = filtered.filter(e => e.transferenciaEfetuda !== 'sim');
        let totalPending = 0, totalOpen = 0, totalOverdue = 0, countOpen = 0, countOverdue = 0;

        filteredNoTransf.forEach(exp => {
            totalPending += exp.valorOriginal;
            const status = getExpenseStatus(exp);
            if (status === 'Aberto')  { totalOpen    += exp.valorOriginal; countOpen++; }
            else if (status === 'Vencido') { totalOverdue += exp.valorOriginal; countOverdue++; }
        });

        document.getElementById('openItemsCount').textContent   = countOpen;
        document.getElementById('totalOpenValue').textContent   = formatCurrency(totalOpen);
        document.getElementById('totalOverdueValue').textContent = formatCurrency(totalOverdue);
        document.getElementById('overdueItemsCount').textContent = countOverdue;

    } else if (pageType === 'backup') {
        const notTransferred = expenses.filter(e => e.transferenciaEfetuda !== 'sim');
        const totalValue     = notTransferred.reduce((sum, exp) => sum + exp.valorOriginal, 0);
        const total  = notTransferred.length;
        const paid   = notTransferred.filter(exp => exp.pagamentoEfetuado === 'sim').length;
        const open   = notTransferred.filter(exp => { const s = getExpenseStatus(exp); return s === 'Aberto' || s === 'Vencido'; }).length;

        document.getElementById('totalExpensesCount').textContent = total;
        document.getElementById('totalPaidCount').textContent     = paid;
        document.getElementById('totalOpenCount').textContent     = open;
        document.getElementById('totalValueSum').textContent      = formatCurrency(totalValue);
    }
}

// ── Notificações ──────────────────────────────────────────────────────────────

export function checkOverdueExpenses() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueCount = expenses.filter(expense => {
        if (expense.pagamentoEfetuado === 'sim') return false;
        if (getExpenseStatus(expense) === 'Transferido') return false;
        const dueDate = parseDate(expense.vencimento);
        if (!dueDate) return false;
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }).length;

    const notificationItem = document.getElementById('notification-item');
    const iconSpan         = notificationItem?.querySelector('.nav__icon');
    const alertLine2       = notificationItem?.querySelector('.nav__alert-line2');

    if (overdueCount > 0) {
        notificationItem?.classList.add('nav__item--alert');
        notificationItem?.setAttribute('onclick', "CGD.navigateTo('payment-page')");
        if (iconSpan)   iconSpan.textContent = `⚠️ (${overdueCount})`;
        if (alertLine2) {
            alertLine2.style.display = 'block';
            alertLine2.textContent   = overdueCount > 1
                ? `Você tem ${overdueCount} despesas atrasadas!`
                : 'Você tem despesas atrasadas!';
        }
    } else {
        notificationItem?.classList.remove('nav__item--alert');
        notificationItem?.removeAttribute('onclick');
        if (iconSpan)   iconSpan.textContent   = '⚠️';
        if (alertLine2) alertLine2.style.display = 'none';
    }

    return overdueCount;
}
