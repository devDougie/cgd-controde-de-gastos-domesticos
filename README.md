# 💰 CGD — Controle de Gastos Domésticos

> Projeto de aprendizado e portfólio — aplicação web para controle de despesas domésticas, construída com HTML5, CSS3 e JavaScript ES6+ puro (sem framework).

Este projeto foi desenvolvido com o objetivo de praticar organização e refatoração de uma aplicação frontend em um contexto realista: uma SPA de controle de gastos domésticos com parcelamento, dashboard com gráficos, backup de dados e navegação via router client-side, evoluindo de uma estrutura monolítica para uma arquitetura modular por responsabilidade.

**Não se trata de um sistema pronto para produção**, mas de um projeto estruturado para aprendizado e portfólio.

<!-- Screenshot em breve: assets/images/screenshot-dashboard.png -->

---

## 🛠️ Stack

| Tecnologia | Descrição |
| --- | --- |
| HTML5 | Semântico, dividido em páginas separadas |
| CSS3 | Design system baseado em variáveis, organizado por responsabilidade |
| JavaScript ES6+ | Módulos nativos (`import`/`export`), sem framework |
| Chart.js 3.9 | Visualizações gráficas do dashboard, via CDN |
| LocalStorage | Persistência de dados no navegador |

---

## ✨ Funcionalidades

- Cadastro de despesas com suporte a parcelamento (até 100 parcelas)
- Dashboard com 6 visualizações gráficas (Chart.js)
- Controle de status: Pago, Em aberto, Vencido, Transferido
- Atualização de despesas vencidas com novo cronograma
- Backup completo em JSON e CSV
- Modo claro e escuro persistente
- Filtros avançados por categoria, responsável, forma de pagamento e período
- Navegação via router client-side, com páginas carregadas dinamicamente

---

## 🗂️ Arquitetura de Pastas

```
assets/
├── css/
│   ├── base/          ← reset, variáveis globais e responsividade
│   ├── layout/        ← sidebar e área de conteúdo
│   ├── components/    ← botões, cards, modais, tabelas, badges, gráficos
│   ├── pages/         ← estilos específicos por página
│   └── main.css       ← ponto de entrada que importa os demais
├── js/
│   ├── core/          ← estado global, localStorage e router client-side
│   ├── utils/         ← formatadores, validadores e status de despesas
│   ├── components/    ← sidebar e gráficos
│   ├── pages/         ← lógica específica por página
│   └── app.js         ← ponto de entrada da aplicação
└── images/
    └── icons/

pages/                 ← páginas HTML carregadas dinamicamente pelo router
├── dashboard.html
├── payment.html
├── edit.html
├── backup.html
├── report.html
└── info.html
```

---

## 🚀 Como rodar

### Pré-requisitos

- Um navegador moderno (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)
- Um servidor local para servir os arquivos (ex: Live Server no VS Code, ou `npx serve`)

> ⚠️ **Importante:** o router carrega as páginas via `fetch()`, que é bloqueado por
> política de CORS quando o `index.html` é aberto diretamente como arquivo
> (`file://`). É necessário um servidor local para o app funcionar.

### 1. Clone o repositório

```bash
git clone https://github.com/devDougie/cgd-controde-de-gastos-domesticos.git
cd cgd-controde-de-gastos-domesticos
```

### 2. Sirva o projeto

```bash
npx serve
```

Ou, no VS Code, clique com o botão direito em `index.html` e selecione **Open with Live Server**.

### 3. Acesse no navegador

A aplicação abrirá automaticamente, ou você pode acessar o endereço indicado pelo servidor local (geralmente `http://localhost:3000` ou `http://127.0.0.1:5500`).

Os dados são salvos automaticamente no navegador via LocalStorage.

---

## 🐛 Decisões técnicas conhecidas

- **Dados no LocalStorage:** solução intencional para app offline sem back-end. Backups em JSON/CSV mitigam o risco de perda de dados.
- **Agrupamento de parcelas por `groupId` (UUID):** garante integridade mesmo com despesas de mesmo nome e responsável.
- **Roteamento client-side simples via `fetch()` + injeção de HTML:** sem framework, mantendo a stack 100% vanilla.

---

## 🎯 Objetivos de aprendizado

Este projeto foi desenvolvido em fases para praticar progressivamente:

- ✅ Estruturação de um projeto frontend vanilla a partir de um código monolítico
- ✅ Organização de CSS em módulos por responsabilidade (base, layout, components, pages)
- ✅ Conversão de JavaScript para ES Modules nativos (`import`/`export`)
- ✅ Identificação e correção de bugs reais de UI e lógica de negócio
- ✅ Modelagem de relacionamento de dados (parcelas agrupadas por `groupId`)
- ✅ Implementação de um router client-side simples, sem framework
- ✅ Separação de uma SPA monolítica em páginas HTML carregadas dinamicamente
- ✅ Versionamento incremental com commits padronizados (Conventional Commits)

---
<!--
## 📄 Licença

Este projeto está licenciado sob a [PolyForm Noncommercial License 1.0.0](LICENSE) — uso, modificação e distribuição são permitidos livremente para fins não comerciais (estudo, pesquisa, hobby, portfólio). **Uso comercial não é permitido** sem autorização prévia do autor.

---

## 👤 Autor

Douglas C. Venancio — 2025
-->
