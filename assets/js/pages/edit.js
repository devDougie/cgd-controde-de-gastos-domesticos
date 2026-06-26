// ===== ✏️ PAGES — EDIT =====
// Criação, edição de despesas e tabela de parcelas

import { expenses, expenseIdToEdit, setExpenseIdToEdit, validationConfigs } from '../core/state.js';
import { saveExpensesToStorage } from '../core/storage.js';
import { parseDate, generateGroupId } from '../utils/formatters.js';
import { getExpenseStatus } from '../utils/expense-status.js';
import { validateForm } from '../utils/validators.js';
import { showModal, closeModal, refreshCurrentPage } from '../components/sidebar.js';
import { populateFilters, populateYearSelect, updateSummary, renderTable } from './dashboard.js';

// ── Formulário de criação ─────────────────────────────────────────────────────

export function getExpenseFormData() {
    const pagamentoInput = document.getElementById('expensePaid');
    return {
        descricao:       document.getElementById('expenseDescription').value,
        categoria:       document.getElementById('expenseCategory').value,
        responsavel:     document.getElementById('expenseResponsible').value,
        valorTotal:      parseFloat(document.getElementById('expenseValue').value),
        totalParcelas:   parseInt(document.getElementById('expenseInstallments').value),
        pagamentoEfetuado: pagamentoInput ? pagamentoInput.checked : false,
        observacoes:     document.getElementById('expenseNotes').value
    };
}

export function createExpenseInstallments(formData) {
    const installments    = [];
    const valorParcela    = formData.valorTotal / formData.totalParcelas;
    const installmentRows = document.querySelectorAll('#installmentsTableBody tr');
    const baseId          = Date.now();
    const groupId         = generateGroupId();

    for (let i = 0; i < formData.totalParcelas; i++) {
        const row        = installmentRows[i];
        const dueDate    = row.querySelector('.installment-due').value;
        const pagoStatus = row.querySelector('.installment-paid').value;
        const formaPagto = row.querySelector('.installment-method').value;

        installments.push({
            id:                  baseId + i,
            groupId,
            descricao:           formData.descricao,
            categoria:           formData.categoria,
            responsavel:         formData.responsavel,
            observacoes:         i === 0 ? formData.observacoes : '',
            valorOriginal:       parseFloat(valorParcela.toFixed(2)),
            parcelaAtual:        i + 1,
            totalParcelas:       formData.totalParcelas,
            idParcela:           i === 0 ? null : baseId,
            vencimento:          dueDate,
            novoVencimento:      null,
            pagamentoEfetuado:   pagoStatus,
            formaPagamento:      formaPagto,
            transferenciaEfetuda: 'nao'
        });
    }

    return installments;
}

export function resetNewExpenseForm() {
    const form = document.getElementById('expenseForm');
    if (form) form.reset();

    document.getElementById('installmentsTableBody').innerHTML = '';

    document.querySelectorAll('#expenseForm input, #expenseForm select').forEach(input => {
        input.style.borderColor = '';
    });

    const installmentsInput = document.getElementById('expenseInstallments');
    if (installmentsInput) installmentsInput.value = 1;
}

export function saveExpense() {
    const validation = validateForm(validationConfigs.addExpense);

    if (!validation.valid) {
        alert('Por favor, preencha todos os campos obrigatórios corretamente.\n' + validation.errors.join('\n'));
        return;
    }

    const formData    = getExpenseFormData();
    const newExpenses = createExpenseInstallments(formData);

    expenses.push(...newExpenses);

    saveExpensesToStorage();
    updateSummary('dashboard');
    renderTable('dashboard');
    populateFilters();
    populateYearSelect(new Date().getFullYear());
    closeModal('add-modal');
    refreshCurrentPage();

    alert(`Despesa "${formData.descricao}" cadastrada com sucesso! ${newExpenses.length} parcela(s) criada(s).`);
}

// ── Edição ────────────────────────────────────────────────────────────────────

export function editExpense(expenseId) {
    const expense = expenses.find(exp => exp.id === expenseId);
    if (!expense) { alert('Despesa não encontrada!'); return; }

    setExpenseIdToEdit(expenseId);

    const isFirstInstallment = expense.idParcela === null;
    const isTransferred      = expense.transferenciaEfetuda === 'sim';

    document.getElementById('editExpenseDescription').value  = expense.descricao;
    document.getElementById('editExpenseCategory').value     = expense.categoria;
    document.getElementById('editExpenseResponsible').value  = expense.responsavel;
    document.getElementById('editExpenseValue').value        = (expense.valorOriginal * expense.totalParcelas).toFixed(2);
    document.getElementById('editExpenseInstallments').value = expense.totalParcelas;
    document.getElementById('editExpenseNotes').value        = expense.observacoes || '';

    const desc    = document.getElementById('editExpenseDescription');
    const cat     = document.getElementById('editExpenseCategory');
    const resp    = document.getElementById('editExpenseResponsible');
    const val     = document.getElementById('editExpenseValue');
    const inst    = document.getElementById('editExpenseInstallments');
    const notes   = document.getElementById('editExpenseNotes');

    if (!isFirstInstallment) {
        desc.disabled  = true;
        cat.disabled   = true;
        resp.disabled  = true;
        val.disabled   = true;
        inst.disabled  = true;
        notes.disabled = false;
    } else {
        desc.disabled  = isTransferred;
        cat.disabled   = isTransferred;
        resp.disabled  = isTransferred;
        val.disabled   = isTransferred;
        inst.disabled  = isTransferred;
        notes.disabled = isTransferred;
    }

    generateInstallmentsTable('edit', { expense });

    if (isFirstInstallment) {
        setTimeout(() => {
            const parcelas = expenses.filter(exp =>
                exp.groupId
                    ? exp.groupId === expense.groupId
                    : exp.descricao   === expense.descricao &&
                      exp.responsavel === expense.responsavel &&
                      exp.totalParcelas === expense.totalParcelas
            ).sort((a, b) => a.parcelaAtual - b.parcelaAtual);

            const rows = document.querySelectorAll('#editInstallmentsTableBody tr');
            parcelas.forEach((p, index) => {
                const row = rows[index];
                if (row) {
                    const inputDate    = row.querySelector('.installment-due');
                    const selectPaid   = row.querySelector('.installment-paid');
                    const selectMethod = row.querySelector('.installment-method');
                    if (inputDate)    inputDate.value    = p.vencimento;
                    if (selectPaid)   selectPaid.value   = p.pagamentoEfetuado;
                    if (selectMethod) selectMethod.value = p.formaPagamento || '';
                }
            });
        }, 50);
    }

    showModal('edit-modal');
}

export function updateExpense() {
    const expense = expenses.find(exp => exp.id === expenseIdToEdit);
    if (!expense) { alert('Despesa não encontrada!'); return; }

    const validation = validateForm(validationConfigs.editExpense);
    if (!validation.valid) {
        alert('Por favor, corrija os seguintes erros:\n' + validation.errors.join('\n'));
        return;
    }

    const isFirstInstallment = expense.idParcela === null;
    const novaDescricao      = document.getElementById('editExpenseDescription').value;
    const novaCategoria      = document.getElementById('editExpenseCategory').value;
    const novoResponsavel    = document.getElementById('editExpenseResponsible').value;
    const novasObservacoes   = document.getElementById('editExpenseNotes').value;
    const newTotalParcelas   = parseInt(document.getElementById('editExpenseInstallments').value, 10) || 1;
    const valorTotal         = parseFloat(document.getElementById('editExpenseValue').value) || 0;
    const newValorParcela    = valorTotal / newTotalParcelas;
    const rows               = document.querySelectorAll('#editInstallmentsTableBody tr');

    if (isFirstInstallment) {
        const grupoAtual = expenses.filter(exp =>
            exp.groupId
                ? exp.groupId === expense.groupId
                : exp.descricao   === expense.descricao &&
                  exp.responsavel === expense.responsavel &&
                  exp.totalParcelas === expense.totalParcelas
        ).sort((a, b) => a.parcelaAtual - b.parcelaAtual);

        if (newTotalParcelas !== expense.totalParcelas) {
            if (newTotalParcelas < grupoAtual.length) {
                const parcelasParaExcluir = grupoAtual.slice(newTotalParcelas);
                parcelasParaExcluir.forEach(p => {
                    const index = expenses.findIndex(exp => exp.id === p.id);
                    if (index !== -1) expenses.splice(index, 1);
                });
            } else if (newTotalParcelas > grupoAtual.length) {
                const baseId       = expense.idParcela || expense.id;
                const ultimaParcela = grupoAtual[grupoAtual.length - 1];
                const ultimaData   = parseDate(ultimaParcela.vencimento);

                for (let i = grupoAtual.length; i < newTotalParcelas; i++) {
                    const novaData = new Date(ultimaData);
                    novaData.setMonth(ultimaData.getMonth() + (i - grupoAtual.length + 1));

                    expenses.push({
                        id:                  Date.now() + Math.random(),
                        descricao:           novaDescricao,
                        categoria:           novaCategoria,
                        responsavel:         novoResponsavel,
                        observacoes:         '',
                        valorOriginal:       newValorParcela,
                        parcelaAtual:        i + 1,
                        totalParcelas:       newTotalParcelas,
                        idParcela:           baseId,
                        vencimento:          novaData.toISOString().split('T')[0],
                        novoVencimento:      '',
                        pagamentoEfetuado:   'nao',
                        formaPagamento:      '',
                        transferenciaEfetuda: 'nao'
                    });
                }
            }
        }

        const grupoFinal = expenses.filter(exp =>
            (exp.idParcela === (expense.idParcela || expense.id)) ||
            exp.id === (expense.idParcela || expense.id)
        ).sort((a, b) => a.parcelaAtual - b.parcelaAtual);

        grupoFinal.forEach((p, index) => {
            const row         = rows[index];
            p.descricao       = novaDescricao;
            p.categoria       = novaCategoria;
            p.responsavel     = novoResponsavel;
            p.valorOriginal   = newValorParcela;
            p.totalParcelas   = newTotalParcelas;
            if (index === 0) p.observacoes = novasObservacoes;

            if (row) {
                const inputDue     = row.querySelector('.installment-due');
                const selectPaid   = row.querySelector('.installment-paid');
                const selectMethod = row.querySelector('.installment-method');
                if (inputDue     && !inputDue.disabled)     p.vencimento          = inputDue.value;
                if (selectPaid   && !selectPaid.disabled)   p.pagamentoEfetuado   = selectPaid.value;
                if (selectMethod && !selectMethod.disabled) p.formaPagamento      = selectMethod.value;
            }
        });

    } else {
        expense.observacoes = novasObservacoes;
        rows.forEach(row => {
            const inputDue     = row.querySelector('.installment-due');
            const selectPaid   = row.querySelector('.installment-paid');
            const selectMethod = row.querySelector('.installment-method');
            if (inputDue && !inputDue.disabled) {
                expense.vencimento        = inputDue.value;
                expense.pagamentoEfetuado = selectPaid.value;
                expense.formaPagamento    = selectMethod.value;
            }
        });
    }

    saveExpensesToStorage();
    closeModal('edit-modal');
    refreshCurrentPage();
    alert('✅ Despesa atualizada com sucesso!');
}

export function viewExpense(expenseId) {
    const expense = expenses.find(exp => exp.id === expenseId);
    if (!expense) { alert('Despesa não encontrada!'); return; }

    const fmt = (dateStr) => {
        const d = parseDate(dateStr);
        return d && !isNaN(d) ? d.toLocaleDateString('pt-BR') : '-';
    };

    document.getElementById('viewDescricao').textContent     = expense.descricao;
    document.getElementById('viewCategoria').textContent     = expense.categoria;
    document.getElementById('viewResponsavel').textContent   = expense.responsavel;
    document.getElementById('viewParcelas').textContent      = `${expense.parcelaAtual}/${expense.totalParcelas}`;
    document.getElementById('viewValor').textContent         = 'R$ ' + expense.valorOriginal.toFixed(2).replace('.', ',');
    document.getElementById('viewPago').textContent          = expense.pagamentoEfetuado === 'sim' ? 'Sim' : 'Não';
    document.getElementById('viewFormaPagamento').textContent = expense.formaPagamento || 'N/A';
    document.getElementById('viewVencimento').textContent    = fmt(expense.vencimento);
    document.getElementById('viewNovoVencimento').textContent = fmt(expense.novoVencimento);
    document.getElementById('viewStatus').textContent        = getExpenseStatus(expense);
    document.getElementById('viewObservacoes').value         = expense.observacoes || '';

    showModal('view-modal');
}

// ── Parcelas ──────────────────────────────────────────────────────────────────

export function generateInstallmentsTable(context, options = {}) {
    const { expense = null, originalDue = null } = options;

    const configs = {
        add:    { valueId: 'expenseValue',     installmentsId: 'expenseInstallments',     tableBodyId: 'installmentsTableBody',       generateFromInputs: true, allEditable: true },
        edit:   { valueId: 'editExpenseValue', installmentsId: 'editExpenseInstallments', tableBodyId: 'editInstallmentsTableBody',   generateFromInputs: true, editableRule: 'conditional' },
        update: { valueId: 'updateValue',      installmentsId: 'updateInstallments',      tableBodyId: 'updateInstallmentsTableBody', generateFromInputs: true, allEditable: true, futureOnly: true }
    };

    const config = configs[context];
    if (!config) return;

    const tbody = document.getElementById(config.tableBodyId);
    if (!tbody) return;

    const valorTotal    = parseFloat(document.getElementById(config.valueId).value) || 0;
    const totalParcelas = parseInt(document.getElementById(config.installmentsId).value) || 1;
    const valorParcela  = (valorTotal / totalParcelas).toFixed(2);

    tbody.innerHTML = '';
    if (valorTotal <= 0 || totalParcelas <= 0) return;

    // Edição de parcela que NÃO é a primeira
    if (context === 'edit' && expense && expense.idParcela !== null) {
        const grupoCompleto = expenses
            .filter(exp =>
                exp.groupId
                    ? exp.groupId === expense.groupId
                    : exp.descricao     === expense.descricao &&
                      exp.responsavel   === expense.responsavel &&
                      exp.totalParcelas === expense.totalParcelas
            )
            .sort((a, b) => a.parcelaAtual - b.parcelaAtual);

        grupoCompleto.forEach(parcela => {
            const isCurrentParcela = parcela.id === expense.id;
            const row = document.createElement('tr');

            if (isCurrentParcela) {
                row.style.backgroundColor = 'var(--color-primary-light, rgba(59,130,246,0.1))';
                row.style.border          = '2px solid var(--color-primary, #3b82f6)';
            }

            row.innerHTML = `
                <td>R$ ${parcela.valorOriginal.toFixed(2).replace('.', ',')}</td>
                <td>${parcela.parcelaAtual}/${parcela.totalParcelas}</td>
                <td>
                    <select class="form__input installment-paid" style="padding:4px; font-size:12px;"
                        ${!isCurrentParcela ? 'disabled' : ''} onchange="CGD.togglePaymentMethod(this)">
                        <option value="nao" ${parcela.pagamentoEfetuado === 'nao' ? 'selected' : ''}>NÃO</option>
                        <option value="sim" ${parcela.pagamentoEfetuado === 'sim' ? 'selected' : ''}>SIM</option>
                    </select>
                </td>
                <td>${_methodSelect('installment-method', parcela.formaPagamento, !isCurrentParcela || parcela.pagamentoEfetuado === 'nao')}</td>
                <td>
                    <input type="date" value="${parcela.vencimento}" class="form__input installment-due"
                        ${!isCurrentParcela ? 'disabled' : ''}
                        style="width:100%; font-size:12px; padding:4px; ${!isCurrentParcela ? 'background-color:#f5f5f5; color:#666;' : ''}">
                </td>`;
            tbody.appendChild(row);
        });

        setTimeout(() => applyInstallmentDateValidation('edit', options), 10);
        return;
    }

    // Geração padrão (add / update / edição da primeira parcela)
    let baseDate;
    if (context === 'add')                       baseDate = new Date();
    else if (context === 'update' && originalDue) { baseDate = parseDate(originalDue); baseDate.setMonth(baseDate.getMonth() + 1); }
    else if (expense)                             baseDate = parseDate(expense.vencimento);
    else                                          baseDate = new Date();

    for (let i = 0; i < totalParcelas; i++) {
        const dueDate    = new Date(baseDate);
        dueDate.setMonth(baseDate.getMonth() + i);
        const yyyyMMdd   = dueDate.toISOString().split('T')[0];

        let disabled = false;
        if (config.editableRule === 'conditional' && expense) {
            if (expense.idParcela === null && i > 0) disabled = true;
        }

        const isCurrentParcela = (context === 'edit' && expense) ? (i + 1 === expense.parcelaAtual) : false;
        const row = document.createElement('tr');

        if (isCurrentParcela) {
            row.style.backgroundColor = 'var(--color-primary-light, rgba(59,130,246,0.1))';
            row.style.border          = '2px solid var(--color-primary, #3b82f6)';
        }

        row.innerHTML = `
            <td>R$ ${valorParcela.replace('.', ',')}</td>
            <td>${i + 1}/${totalParcelas}</td>
            <td>
                <select class="form__input installment-paid" style="padding:4px; font-size:12px;"
                    ${disabled ? 'disabled' : ''} onchange="CGD.togglePaymentMethod(this)">
                    <option value="nao" ${(!expense || expense.pagamentoEfetuado === 'nao') ? 'selected' : ''}>NÃO</option>
                    <option value="sim" ${(expense && expense.pagamentoEfetuado === 'sim') ? 'selected' : ''}>SIM</option>
                </select>
            </td>
            <td>${_methodSelect('installment-method', expense?.formaPagamento, disabled || !expense || expense.pagamentoEfetuado === 'nao')}</td>
            <td>
                <input type="date" value="${yyyyMMdd}" class="form__input installment-due"
                    ${disabled ? 'disabled' : ''} style="width:100%; font-size:12px; padding:4px;">
            </td>`;
        tbody.appendChild(row);
    }

    setTimeout(() => applyInstallmentDateValidation(context, options), 10);
}

export function applyInstallmentDateValidation(context, options = {}) {
    const { originalDue } = options;
    const tableBodyIds    = { add: 'installmentsTableBody', edit: 'editInstallmentsTableBody', update: 'updateInstallmentsTableBody' };
    const tableBodyId     = tableBodyIds[context];
    if (!tableBodyId) return;

    const rows = document.querySelectorAll(`#${tableBodyId} tr`);

    rows.forEach((row, idx) => {
        const dateInput = row.querySelector(".installment-due, input[type='date']");
        if (!dateInput) return;

        dateInput.onchange = null;

        if (context === 'update' && idx === 0 && originalDue) {
            const minDate = new Date(parseDate(originalDue));
            minDate.setDate(minDate.getDate() + 1);
            dateInput.min = minDate.toISOString().split('T')[0];

            const currentValue = parseDate(dateInput.value);
            if (!currentValue || currentValue <= parseDate(originalDue)) {
                dateInput.value = dateInput.min;
            }
        }

        if (idx > 0) {
            const prevInput = rows[idx - 1].querySelector(".installment-due, input[type='date']");
            if (prevInput && prevInput.value) {
                const minDate = new Date(parseDate(prevInput.value));
                minDate.setDate(minDate.getDate() + 1);
                dateInput.min = minDate.toISOString().split('T')[0];
            }
        } else if (context !== 'update') {
            dateInput.removeAttribute('min');
        }

        if (idx < rows.length - 1) {
            const nextInput = rows[idx + 1].querySelector(".installment-due, input[type='date']");
            if (nextInput && nextInput.value) {
                const maxDate = new Date(parseDate(nextInput.value));
                maxDate.setDate(maxDate.getDate() - 1);
                dateInput.max = maxDate.toISOString().split('T')[0];
            } else {
                dateInput.removeAttribute('max');
            }
        } else {
            dateInput.removeAttribute('max');
        }

        const currentValue = parseDate(dateInput.value);
        const minValue     = dateInput.min ? parseDate(dateInput.min) : null;
        const maxValue     = dateInput.max ? parseDate(dateInput.max) : null;

        if (minValue && currentValue < minValue) dateInput.value = dateInput.min;
        if (maxValue && currentValue > maxValue) dateInput.value = dateInput.max;

        dateInput.dispatchEvent(new Event('input'));
        dateInput.onchange = () => applyInstallmentDateValidation(context, options);
    });
}

export function togglePaymentMethod(selectElement) {
    const row          = selectElement.closest('tr');
    const methodSelect = row.querySelector('.installment-method');
    if (selectElement.value === 'sim') {
        methodSelect.disabled = false;
    } else {
        methodSelect.value    = '';
        methodSelect.disabled = true;
    }
}

// ── Helper privado ────────────────────────────────────────────────────────────

function _methodSelect(cls, selected = '', disabled = false) {
    const methods = ['Dinheiro','Cheque','Cartão (débito)','Cartão (crédito)','PIX (débito)','PIX (crédito)','Débito automático'];
    const options = methods.map(m => `<option value="${m}" ${selected === m ? 'selected' : ''}>${m}</option>`).join('');
    return `<select class="form__input ${cls}" style="padding:4px; font-size:12px;" ${disabled ? 'disabled' : ''}>
        <option value="">Escolha...</option>${options}
    </select>`;
}
