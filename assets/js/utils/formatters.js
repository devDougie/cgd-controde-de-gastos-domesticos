// ===== 💰 UTILS — FORMATTERS =====
// Funções de formatação de moeda, datas e utilitários de data

export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(value);
}

export function formatDate(date) {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    }
    return new Date(date).toLocaleDateString('pt-BR');
}

export function parseDate(yyyyMMdd) {
    if (!yyyyMMdd) return null;
    const [year, month, day] = yyyyMMdd.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export function dayAfter(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    return newDate;
}

export function dayBefore(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    return newDate;
}

export function toYMD(date) {
    return date.toISOString().split('T')[0];
}

export function generateGroupId() {
    return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
