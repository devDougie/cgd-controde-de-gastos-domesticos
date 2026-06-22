// ===== 💾 CORE — STORAGE =====
// Leitura e gravação no localStorage

import { expenses, setExpenses } from './state.js';
import { applySavedTheme } from '../components/sidebar.js';

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
