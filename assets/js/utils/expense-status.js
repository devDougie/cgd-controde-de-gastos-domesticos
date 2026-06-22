// ===== 📋 UTILS — EXPENSE STATUS =====
// Funções de status, badge e dias de atraso

import { parseDate } from './formatters.js';

export function getExpenseStatus(expense) {
    if (expense.pagamentoEfetuado === 'sim') return 'Pago';
    if (expense.transferenciaEfetuda === 'sim') return 'Transferido';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = parseDate(expense.vencimento);
    return (due < today) ? 'Vencido' : 'Aberto';
}

export function getStatusBadgeClass(status) {
    switch (status) {
        case 'Pago':       return 'paid';
        case 'Aberto':     return 'open';
        case 'Vencido':    return 'overdue';
        case 'Transferido': return 'moved';
        default:           return 'open';
    }
}

export function getOverdueDays(expense) {
    if (expense.pagamentoEfetuado === 'sim') return 0;

    const status = getExpenseStatus(expense);
    if (status === 'Aberto' || status === 'Transferido') return 0;

    if (status === 'Vencido') {
        const vencimento = parseDate(expense.vencimento);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diff = Math.floor((today - vencimento) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    }

    return 0;
}
