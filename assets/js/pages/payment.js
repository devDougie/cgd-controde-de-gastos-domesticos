// ===== 💳 PAGES — PAYMENT =====
// Pagamento, atualização de despesas vencidas e exclusão

import { expenses, expenseIdToPay, expenseIdToUpdate, expenseIdToDelete,
         setExpenseIdToPay, setExpenseIdToUpdate, setExpenseIdToDelete,
         filterExpenses, validationConfigs } from '../core/state.js';
import { saveExpensesToStorage } from '../core/storage.js';
import { parseDate, formatDate, generateGroupId } from '../utils/formatters.js';
import { getExpenseStatus } from '../utils/expense-status.js';
import { validateForm } from '../utils/validators.js';
import { showModal, closeModal, refreshCurrentPage } from '../components/sidebar.js';
import { generateInstallmentsTable } from './edit.js';
import { checkOverdueExpenses } from './dashboard.js';

// ── Pagamento ─────────────────────────────────────────────────────────────────

export function payExpense(expenseId) {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;

    if (expense.transferenciaEfetuda === 'sim') {
        alert('Despesas transferidas não podem ser pagas através desta funcionalidade.');
        return;
    }

    setExpenseIdToPay(expenseId);

    document.getElementById('paymentDescription').textContent = expense.descricao;
    document.getElementById('paymentCategory').textContent    = expense.categoria;
    document.getElementById('paymentResponsible').textContent = expense.responsavel;
    document.getElementById('paymentValue').textContent       = 'R$ ' + expense.valorOriginal.toFixed(2).replace('.', ',');
    document.getElementById('paymentDue').textContent         = formatDate(expense.vencimento);
    document.getElementById('paymentInstallment').textContent = `${expense.parcelaAtual}/${expense.totalParcelas}`;

    showModal('payment-modal');
}

export function confirmPayment() {
    if (expenseIdToPay === null) {
        alert('Erro: Nenhuma despesa selecionada para pagamento.');
        return;
    }

    const expense = expenses.find(e => e.id === expenseIdToPay);
    if (!expense) { alert('Despesa não encontrada!'); return; }

    const method             = document.getElementById('paymentMethodSelect').value;
    expense.pagamentoEfetuado = 'sim';
    expense.formaPagamento   = method;

    saveExpensesToStorage();
    closeModal('payment-modal');
    setExpenseIdToPay(null);
    refreshCurrentPage();
    checkOverdueExpenses();

    alert(`Pagamento da despesa "${expense.descricao}" confirmado com sucesso!`);
}

export function validatePaymentButton() {
    const select = document.getElementById('paymentMethodSelect');
    const btn    = document.getElementById('confirmPaymentBtn');

    if (select && select.value !== '') {
        btn.disabled      = false;
        btn.style.opacity = '1';
        btn.style.cursor  = 'pointer';
    } else {
        btn.disabled      = true;
        btn.style.opacity = '0.5';
        btn.style.cursor  = 'not-allowed';
    }
}

// ── Atualização de vencidas ───────────────────────────────────────────────────

export function updateExpenseModal(expenseId) {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;

    const status = getExpenseStatus(expense);
    if (status !== 'Vencido') {
        alert('Apenas despesas vencidas podem ser atualizadas.');
        return;
    }
    if (expense.transferenciaEfetuda === 'sim') {
        alert('Despesas transferidas não podem ser atualizadas novamente.');
        return;
    }

    setExpenseIdToUpdate(expenseId);

    document.getElementById('updateDescription').value  = expense.descricao;
    document.getElementById('updateCategory').value     = expense.categoria;
    document.getElementById('updateResponsible').value  = expense.responsavel;
    document.getElementById('updateValue').value        = expense.valorOriginal.toFixed(2);
    document.getElementById('updateInstallments').value = 1;

    const tbody = document.getElementById('updateInstallmentsTableBody');
    if (tbody) tbody.innerHTML = '';

    generateInstallmentsTable('update', { expense, originalDue: expense.vencimento });
    showModal('update-modal');
}

export function confirmUpdate() {
    const parent = expenses.find(e => e.id === expenseIdToUpdate);

    if (!parent || getExpenseStatus(parent) !== 'Vencido') {
        alert('Apenas despesas vencidas podem ser atualizadas.');
        return;
    }

    const validation = validateForm(validationConfigs.updateExpense);
    if (!validation.valid) {
        alert('Por favor, corrija os seguintes erros:\n' + validation.errors.join('\n'));
        return;
    }

    const totalParcelas = parseInt(document.getElementById('updateInstallments').value, 10);
    const valorTotal    = parseFloat(document.getElementById('updateValue').value);
    const rows          = Array.from(document.querySelectorAll('#updateInstallmentsTableBody tr'));
    const dueDates      = rows.map(r => r.querySelector('input[type="date"]').value);

    const originalDate  = parseDate(parent.vencimento);
    const firstNewDate  = parseDate(dueDates[0]);

    if (firstNewDate <= originalDate) {
        alert('A primeira parcela da despesa atualizada deve ter vencimento posterior à despesa original.');
        return;
    }

    parent.transferenciaEfetuda = 'sim';
    parent.novoVencimento       = dueDates[0];

    const baseId        = Date.now();
    const valorParcela  = parseFloat((valorTotal / totalParcelas).toFixed(2));
    const groupId       = generateGroupId();

    const newExpenses = Array.from({ length: totalParcelas }, (_, i) => ({
        id:                  baseId + i,
        groupId,
        descricao:           parent.descricao,
        categoria:           parent.categoria,
        responsavel:         parent.responsavel,
        observacoes:         parent.observacoes || '',
        valorOriginal:       valorParcela,
        parcelaAtual:        i + 1,
        totalParcelas,
        idParcela:           i === 0 ? null : baseId,
        vencimento:          dueDates[i],
        novoVencimento:      '',
        pagamentoEfetuado:   'nao',
        formaPagamento:      parent.formaPagamento,
        transferenciaEfetuda: 'nao'
    }));

    expenses.push(...newExpenses);
    saveExpensesToStorage();
    closeModal('update-modal');
    refreshCurrentPage();
    alert('Despesa atualizada com sucesso.');
}

// ── Exclusão ──────────────────────────────────────────────────────────────────

export function deleteExpense(expenseId) {
    const expense = expenses.find(exp => exp.id === expenseId);
    if (!expense) { alert('Despesa não encontrada!'); return; }

    if (expense.idParcela !== null) {
        alert('Apenas a primeira parcela de um grupo pode ser excluída. Esta ação excluirá automaticamente todas as parcelas do grupo.');
        return;
    }

    setExpenseIdToDelete(expenseId);

    document.getElementById('deleteDescription').textContent   = expense.descricao;
    document.getElementById('deleteCategory').textContent      = expense.categoria;
    document.getElementById('deleteResponsible').textContent   = expense.responsavel;
    document.getElementById('deleteValue').textContent         = 'R$ ' + expense.valorOriginal.toFixed(2).replace('.', ',');
    document.getElementById('deleteDue').textContent           = formatDate(expense.vencimento);
    document.getElementById('deleteInstallment').textContent   = `${expense.parcelaAtual}/${expense.totalParcelas}`;
    document.getElementById('deleteStatus').textContent        = getExpenseStatus(expense);
    document.getElementById('deleteFormaPagamento').textContent = expense.formaPagamento || 'N/A';

    showModal('delete-modal');
}

export function confirmDelete() {
    if (expenseIdToDelete !== null) {
        const expense = expenses.find(exp => exp.id === expenseIdToDelete);
        if (!expense) { alert('Despesa não encontrada!'); return; }

        const isSameGroup = (exp) =>
            expense.groupId
                ? exp.groupId === expense.groupId
                : exp.descricao     === expense.descricao &&
                  exp.responsavel   === expense.responsavel &&
                  exp.totalParcelas === expense.totalParcelas;

        const parcelasDoGrupo = expenses.filter(isSameGroup);
        const totalExcluidas  = parcelasDoGrupo.length;

        filterExpenses(exp => !isSameGroup(exp));

        saveExpensesToStorage();
        refreshCurrentPage();

        const plural = totalExcluidas > 1 ? 's' : '';
        alert(`${totalExcluidas} despesa${plural} excluída${plural} com sucesso!`);

        closeModal('delete-modal');
        setExpenseIdToDelete(null);
    }

    refreshCurrentPage();
}
