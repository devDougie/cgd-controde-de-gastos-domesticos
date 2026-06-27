// ===== 🧭 COMPONENTS — SIDEBAR =====
// Navegação entre páginas, tema e modais

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

// ── Navegação (delega ao router) ──────────────────────────────────────────────

/**
 * Navega para uma página usando o router dinâmico.
 * O router carrega o HTML via fetch, injeta no #page-container
 * e executa o inicializador registrado para a página.
 */
export function navigateTo(pageId) {
    // Importação lazy do router para evitar dependência circular
    import('../core/router.js').then(({ navigateTo: routerNavigateTo }) => {
        routerNavigateTo(pageId);
    }).catch(err => {
        console.error('[Sidebar] Falha ao carregar o router:', err);
    });
}

// ── Refresh da página ativa ───────────────────────────────────────────────────

export function refreshCurrentPage() {
    // Com o router, a "página ativa" é o conteúdo atual do #page-container.
    // Identificamos pela primeira section dentro do container.
    const container = document.getElementById('page-container');
    if (!container) return;

    const activePage = container.querySelector('.page');
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

// ── Saída ─────────────────────────────────────────────────────────────────────

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
