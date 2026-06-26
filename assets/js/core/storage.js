// ===== 💾 CORE — STORAGE =====
// Leitura e gravação no localStorage

import { expenses, setExpenses } from './state.js';
import { applySavedTheme } from '../components/sidebar.js';
import { generateGroupId } from '../utils/formatters.js';

export function saveExpensesToStorage() {
    try {
        localStorage.setItem('cgd_expenses', JSON.stringify(expenses));
        localStorage.setItem('cgd_last_save', new Date().toISOString());
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        alert('Erro ao salvar dados. Verifique o espaço disponível no navegador.');
    }
}

export function loadExpensesFromStorage() {
    try {
        const saved = localStorage.getItem('cgd_expenses');
        if (saved) {
            setExpenses(JSON.parse(saved));
        }
        applySavedTheme();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setExpenses([]);
    }
}

export function migrateExpensesIfNeeded() {
    let migrated = false;
    const groups = {};

    expenses.forEach(exp => {
        if (!exp.groupId) {
            // Tenta agrupar pela chave legada (descricao|responsavel|totalParcelas)
            const legacyKey = `${exp.descricao}|${exp.responsavel}|${exp.totalParcelas}`;
            if (!groups[legacyKey]) {
                groups[legacyKey] = generateGroupId();
            }
            exp.groupId = groups[legacyKey];
            migrated = true;
        }
    });

    if (migrated) {
        console.log(`[CGD] Migração de groupId concluída — ${Object.keys(groups).length} grupo(s) identificado(s).`);
    }

    return migrated;
}
