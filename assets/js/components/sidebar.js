// ===== 🧭 COMPONENTS — SIDEBAR =====
// Navegação entre páginas, tema e modais

import { currentFilters } from '../core/state.js';

// ── Tema ──────────────────────────────────────────────────────────────────────

export function toggleTheme() {
    const body        = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const modeText    = document.getElementById('modeText');

    body.classList.toggle('dark-mode');
    themeToggle.classList.toggle('dark');

    if (body.classList.contains('dark-mode')) {
        modeText.textContent = '🌙 Modo Escuro';
        localStorage.setItem('theme', 'dark');
    } else {
        modeText.textContent = '☀️ Modo Claro';
        localStorage.setItem('theme', 'light');
    }

    // Redesenha gráficos após troca de tema (importação lazy para evitar ciclo)
    import('../pages/dashboard.js').then(({ updateSummary }) => {
        updateSummary('dashboard');
    });
}

export function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').classList.add('dark');
        document.getElementById('modeText').textContent = '🌙 Modo Escuro';
    }
}

// ── Modais ────────────────────────────────────────────────────────────────────

export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
            const modalContent = modal.querySelector('.modal');
            if (modalContent) modalContent.scrollTop = 0;
        }, 10);
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 300);

        if (modalId === 'add-modal') {
            import('../pages/edit.js').then(({ resetNewExpenseForm }) => {
                resetNewExpenseForm();
            });
        }
    }
}

// ── Navegação ─────────────────────────────────────────────────────────────────

export function navigateTo(pageId) {
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

    import('../pages/dashboard.js').then(mod => {
        const { updateSummary, renderTable, clearFilters } = mod;

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
            import('../pages/backup.js').then(({ resetBackupForms, selectFormat, generateDefaultBackupFileName, selectImportMode }) => {
                updateSummary('backup');
                resetBackupForms();
                selectFormat('export', 'json');
                generateDefaultBackupFileName();
                selectFormat('import', 'json');
                selectImportMode('replace');
            });
        }
    });
}

export function refreshCurrentPage() {
    const activePage = document.querySelector('.page.page--active');
    if (!activePage) return;

    import('../pages/dashboard.js').then(({ updateSummary, renderTable, populateFilters }) => {
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
    });
}

export function confirmExit() {
    if (confirm('Tem certeza que deseja sair do sistema?')) {
        import('../core/storage.js').then(({ saveExpensesToStorage }) => {
            saveExpensesToStorage();
            alert('Sistema finalizado com segurança. Todos os dados foram salvos.');
            closeModal('exit-modal');
            window.close();
        });
    }
}
