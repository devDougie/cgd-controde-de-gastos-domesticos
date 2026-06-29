// ===== 🗺️ CORE — ROUTER =====
// Carregamento dinâmico de páginas via fetch + execução de inicializadores

// ── Registro de inicializadores ──────────────────────────────────────────────

const pageInitializers = {};

/**
 * Registra a função de inicialização de uma página.
 * @param {string} pageId  - ID da section da página (ex: 'dashboard-page')
 * @param {Function} initFn - Função a chamar após injetar o HTML da página
 */
export function registerPage(pageId, initFn) {
    pageInitializers[pageId] = initFn;
}

// ── Navegação ─────────────────────────────────────────────────────────────────

/**
 * Navega para uma página carregando seu HTML via fetch e injetando no container.
 * Mantém os modais intactos (eles vivem no index.html, fora do container).
 * @param {string} pageId - ID da section da página (ex: 'dashboard-page')
 */
export async function navigateTo(pageId) {
    // 1. Atualiza item ativo na sidebar
    document.querySelectorAll('.nav__item').forEach(item =>
        item.classList.remove('nav__item--active')
    );
    const navItem = document.querySelector(`[data-page="${pageId}"]`);
    if (navItem) navItem.classList.add('nav__item--active');

    // 2. Mostra estado de carregamento
    const container = document.getElementById('page-container');
    if (!container) {
        console.error('[Router] Elemento #page-container não encontrado no DOM.');
        return;
    }
    container.innerHTML = '<div class="page-loading">Carregando...</div>';

    // 3. Calcula o nome do arquivo a partir do pageId (remove o sufixo '-page')
    const pageName = pageId.replace(/-page$/, '');

    // 4. Carrega o HTML da página via fetch
    try {
        const response = await fetch(`pages/${pageName}.html`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ao carregar pages/${pageName}.html`);
        }
        const html = await response.text();
        container.innerHTML = html;

        // Garante que a section injetada tenha a classe de visibilidade ativa.
        // Necessário porque apenas o dashboard.html já nasce com page--active;
        // os demais arquivos em pages/*.html têm somente a classe base "page"
        // (display:none no CSS) e precisam receber page--active após a injeção.
        const injectedPage = container.querySelector('.page');
        if (injectedPage && !injectedPage.classList.contains('page--active')) {
            injectedPage.classList.add('page--active');
        }
    } catch (err) {
        console.error(`[Router] Erro ao carregar página "${pageName}":`, err);
        container.innerHTML = `
            <section class="page page--active">
                <div class="page-error">
                    <p>⚠️ Não foi possível carregar a página <strong>${pageName}</strong>.</p>
                    <p>Certifique-se de usar um servidor local (Live Server, <code>python -m http.server</code>)
                    — módulos ES6 e fetch não funcionam via <code>file://</code>.</p>
                    <button class="btn btn--secondary" onclick="CGD.navigateTo('dashboard-page')">
                        Voltar ao Dashboard
                    </button>
                </div>
            </section>`;
        return;
    }

    // 5. Executa o inicializador da página (se registrado)
    if (pageInitializers[pageId]) {
        try {
            pageInitializers[pageId]();
        } catch (err) {
            console.error(`[Router] Erro no inicializador de "${pageId}":`, err);
        }
    }

    // 6. Scroll ao topo
    window.scrollTo(0, 0);
    container.scrollTo?.(0, 0);
}
