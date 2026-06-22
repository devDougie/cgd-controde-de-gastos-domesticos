// ===== 📊 COMPONENTS — CHARTS =====
// Renderização dos 6 gráficos do dashboard

import { currentFilters, setChart, chartMonthlyTrend, chartByCategory, chartByStatus, chartByResponsible } from '../core/state.js';
import { parseDate, formatCurrency } from '../utils/formatters.js';
import { getExpenseStatus } from '../utils/expense-status.js';

export function renderCharts(filteredExpenses, yearlyExpenses) {
    const validFilteredExpenses = filteredExpenses.filter(e => e.transferenciaEfetuda !== 'sim');
    const validYearlyExpenses   = yearlyExpenses.filter(e => e.transferenciaEfetuda !== 'sim');

    const monthName   = document.getElementById('monthSelect').options[document.getElementById('monthSelect').selectedIndex].text;
    const selectedYear = document.getElementById('yearSelect').value;
    const periodText  = `${monthName}/${selectedYear}`;

    const isDarkMode      = document.body.classList.contains('dark-mode');
    const legendTextColor = isDarkMode ? '#ffffff' : 'var(--color-dark-gray)';

    // Títulos dos gráficos
    const titleTrend       = document.querySelector('.chart--line .chart__title');
    const titleCategory    = document.querySelector('.chart--doughnut .chart__title');
    const titleStatus      = document.querySelector('.chart--status .chart__title');
    const titleResponsible = document.querySelector('.chart--column .chart__title');
    const titleTop5        = document.querySelector('.chart--top5 .chart__title');
    const titleCalendar    = document.querySelector('.chart--calendar .chart__title');

    if (titleTrend)       titleTrend.textContent       = `Evolução das Despesas Mensais (${selectedYear})`;
    if (titleCategory)    titleCategory.textContent    = `Distribuição por Categoria de Despesa (${periodText})`;
    if (titleStatus)      titleStatus.textContent      = `Situação de Pagamentos de Despesas (${periodText})`;
    if (titleResponsible) titleResponsible.textContent = `Despesas por Responsável (${periodText})`;
    if (titleTop5)        titleTop5.textContent        = `Top 5 — Maiores Despesas (${periodText})`;
    if (titleCalendar)    titleCalendar.textContent    = `Calendário de Vencimentos (${periodText})`;

    const palette10 = [
        '#3b82f6', '#ef4444',
        '#10b981', '#f59e0b',
        '#fcd34d', '#8b5cf6',
        '#93c5fd', '#fca5a5',
        '#6ee7b7', '#c4b5fd'
    ];

    const tickColor = isDarkMode ? '#ffffff' : '#444';

    // ── 1. Evolução Mensal (Line) ────────────────────────────────────────────
    const monthlyTotals = Array(12).fill(0);
    validYearlyExpenses.forEach(e => {
        const d = parseDate(e.vencimento);
        if (d) monthlyTotals[d.getMonth()] += e.valorOriginal;
    });

    const ctxMonthly = document.getElementById('chartByMonthlyTrendContainer');
    if (chartMonthlyTrend) chartMonthlyTrend.destroy();

    if (!monthlyTotals.some(v => v > 0)) {
        ctxMonthly.innerHTML = _emptyMsg();
    } else {
        ctxMonthly.innerHTML = '<canvas id="chartMonthlyTrend"></canvas>';
        const instance = new Chart(document.getElementById('chartMonthlyTrend').getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
                datasets: [{
                    label: 'Gastos Mensais',
                    data: monthlyTotals,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 4,
                    pointRadius: 6,
                    pointHoverRadius: 4,
                    pointBorderWidth: 2,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: _legendLabel(tickColor) },
                    tooltip: { callbacks: { label: ctx => 'R$ ' + ctx.parsed.y.toLocaleString('pt-BR') } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { display: true }, border: { display: false }, ticks: { color: tickColor, callback: v => 'R$ ' + v.toLocaleString('pt-BR') } },
                    x: { grid: { display: false }, border: { display: false }, ticks: { color: tickColor } }
                }
            }
        });
        setChart('monthlyTrend', instance);
    }

    // ── 2. Despesas por Categoria (Donut) ────────────────────────────────────
    const categoryTotals = {};
    validFilteredExpenses.forEach(e => {
        categoryTotals[e.categoria] = (categoryTotals[e.categoria] || 0) + e.valorOriginal;
    });

    const ctxCategory = document.getElementById('chartByCategoryContainer');
    if (chartByCategory) chartByCategory.destroy();

    if (Object.keys(categoryTotals).length === 0) {
        ctxCategory.innerHTML = _emptyMsg();
    } else {
        ctxCategory.innerHTML = '<canvas id="chartByCategory"></canvas>';
        const instance = new Chart(document.getElementById('chartByCategory').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryTotals),
                datasets: [{
                    data: Object.values(categoryTotals),
                    backgroundColor: palette10.slice(0, Object.keys(categoryTotals).length),
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { ..._legendLabel(tickColor), boxHeight: 16, padding: 16 } },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const value = context.dataset.data[context.dataIndex];
                                return `${context.label}: ${((value / total) * 100).toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
        setChart('byCategory', instance);
    }

    // ── 3. Distribuição por Status (Horizontal Bar) ──────────────────────────
    const statusTotals = { Pago: 0, Aberto: 0, Vencido: 0 };
    validFilteredExpenses.forEach(e => {
        const s = getExpenseStatus(e);
        if (s in statusTotals) statusTotals[s] += e.valorOriginal;
    });

    const ctxStatus = document.getElementById('chartByStatusContainer');
    if (chartByStatus) chartByStatus.destroy();

    if (!Object.values(statusTotals).some(v => v > 0)) {
        ctxStatus.innerHTML = _emptyMsg();
    } else {
        ctxStatus.innerHTML = '<canvas id="chartByStatus"></canvas>';
        const instance = new Chart(document.getElementById('chartByStatus').getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Pago', 'Aberto', 'Vencido'],
                datasets: [{
                    label: 'Valor (R$)',
                    data: [statusTotals.Pago, statusTotals.Aberto, statusTotals.Vencido],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderRadius: 6,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => 'R$ ' + ctx.parsed.x.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } }
                },
                scales: {
                    x: { beginAtZero: true, grid: { display: true }, border: { display: false }, ticks: { color: tickColor, callback: v => 'R$ ' + v.toLocaleString('pt-BR') } },
                    y: { grid: { display: false }, border: { display: false }, ticks: { color: tickColor, font: { size: 14, weight: 'bold' } } }
                }
            }
        });
        setChart('byStatus', instance);
    }

    // ── 4. Gasto por Responsável (Stacked Bar) ───────────────────────────────
    const responsibleGrouped = {};
    validFilteredExpenses.forEach(e => {
        const resp  = e.responsavel;
        const grupo = _classifyPaymentGroup(e.formaPagamento);
        if (!responsibleGrouped[resp]) responsibleGrouped[resp] = { 'À Vista': 0, 'Crédito': 0, 'Débito': 0 };
        responsibleGrouped[resp][grupo] += e.valorOriginal;
    });

    const labelsResp      = Object.keys(responsibleGrouped);
    const ctxResponsible  = document.getElementById('chartByResponsibleContainer');
    if (chartByResponsible) chartByResponsible.destroy();

    if (labelsResp.length === 0) {
        ctxResponsible.innerHTML = _emptyMsg();
    } else {
        ctxResponsible.innerHTML = '<canvas id="chartByResponsible"></canvas>';
        const instance = new Chart(document.getElementById('chartByResponsible').getContext('2d'), {
            type: 'bar',
            data: {
                labels: labelsResp,
                datasets: [
                    { label: 'À Vista', data: labelsResp.map(r => responsibleGrouped[r]['À Vista']), backgroundColor: 'rgba(52,152,219,0.85)', borderColor: '#ffffff', borderWidth: 2, borderRadius: 5, categoryPercentage: 0.75, barPercentage: 0.85 },
                    { label: 'Crédito', data: labelsResp.map(r => responsibleGrouped[r]['Crédito']), backgroundColor: 'rgba(231,76,60,0.85)',   borderColor: '#ffffff', borderWidth: 2, borderRadius: 5, categoryPercentage: 0.75, barPercentage: 0.85 },
                    { label: 'Débito',  data: labelsResp.map(r => responsibleGrouped[r]['Débito']),  backgroundColor: 'rgba(39,174,96,0.85)',   borderColor: '#ffffff', borderWidth: 2, borderRadius: 5, categoryPercentage: 0.75, barPercentage: 0.85 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: tickColor, font: { size: 12, weight: 'bold' }, usePointStyle: false, boxWidth: 16, boxHeight: 12, borderRadius: 3, useBorderRadius: true, padding: 16 } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: R$ ` + ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { display: true, color: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }, border: { display: false }, ticks: { color: tickColor, callback: v => 'R$ ' + v.toLocaleString('pt-BR') } },
                    x: { grid: { display: false }, border: { display: false }, ticks: { color: tickColor, font: { size: 13, weight: 'bold' } } }
                }
            }
        });
        setChart('byResponsible', instance);
    }

    // ── 5. Top 5 Maiores Despesas ────────────────────────────────────────────
    const barColors = ['#3498db', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c'];
    const badgeMap  = {
        'Pago':       { cls: 'status-badge--paid',   label: 'Pago' },
        'Aberto':     { cls: 'status-badge--open',   label: 'Aberto' },
        'Vencido':    { cls: 'status-badge--overdue', label: 'Vencido' },
        'Transferido':{ cls: 'status-badge--moved',  label: 'Transf.' }
    };
    const medalStyle = [
        'background:#ffd700; color:#7a5900;',
        'background:#c0c0c0; color:#4a4a4a;',
        'background:#cd7f32; color:#5a2d00;',
        'background:var(--color-light-gray); color:var(--color-dark-gray);',
        'background:var(--color-light-gray); color:var(--color-dark-gray);'
    ];

    const sorted    = [...validFilteredExpenses].sort((a, b) => b.valorOriginal - a.valorOriginal).slice(0, 5);
    const maxVal    = sorted.length > 0 ? sorted[0].valorOriginal : 1;
    const totalTop5 = sorted.reduce((s, e) => s + e.valorOriginal, 0);
    const top5Container = document.getElementById('chartTop5Container');

    if (sorted.length === 0) {
        top5Container.innerHTML = _emptyMsg();
    } else {
        top5Container.innerHTML = `
            <div id="top5Body" style="padding:4px 0; display:flex; flex-direction:column; gap:12px;"></div>
            <div style="padding:10px 0 2px; border-top:1px solid var(--color-light-gray); display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <span style="font-size:12px; color:${legendTextColor}; font-weight:600; text-transform:uppercase; letter-spacing:0.4px;">Total do Top 5</span>
                <span id="top5Total" style="font-size:14px; font-weight:700; color:var(--color-primary);">R$ 0,00</span>
            </div>`;

        const top5Body = document.getElementById('top5Body');

        sorted.forEach((exp, i) => {
            const pct    = ((exp.valorOriginal / maxVal) * 100).toFixed(1);
            const status = getExpenseStatus(exp);
            const badge  = badgeMap[status] || badgeMap['Aberto'];

            const item = document.createElement('div');
            item.style.cssText = 'display:flex; align-items:center; gap:12px; min-height:48px;';
            item.innerHTML = `
                <div style="width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; ${medalStyle[i]}">${i + 1}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:13px; font-weight:600; color:inherit; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px;">${exp.descricao}</div>
                    <div style="height:6px; background:var(--color-light-gray); border-radius:3px; overflow:hidden;">
                        <div class="top5-bar" style="height:100%; width:0%; border-radius:3px; background:${barColors[i]}; transition:width 0.6s ease;" data-pct="${pct}"></div>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; min-width:110px;">
                    <span style="font-size:14px; font-weight:700; color:inherit; white-space:nowrap; display:block; width:110px; text-align:right;">${formatCurrency(exp.valorOriginal)}</span>
                    <span class="status-badge ${badge.cls}">${badge.label}</span>
                </div>`;
            top5Body.appendChild(item);
        });

        document.getElementById('top5Total').textContent =
            'R$ ' + totalTop5.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        setTimeout(() => {
            document.querySelectorAll('.top5-bar').forEach(bar => {
                bar.style.width = bar.dataset.pct + '%';
            });
        }, 100);
    }

    // ── 6. Calendário de Vencimentos ─────────────────────────────────────────
    const calendarContainer = document.getElementById('chartCalendarContainer');
    if (!calendarContainer) return;

    const dayNames    = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const viewMonth   = currentFilters.month - 1;
    const viewYear    = currentFilters.year;
    const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today       = new Date();
    today.setHours(0, 0, 0, 0);

    const expensesByDay = {};
    validFilteredExpenses.forEach(exp => {
        const d = parseDate(exp.vencimento);
        if (!d) return;
        const day = d.getDate();
        if (!expensesByDay[day]) expensesByDay[day] = [];
        expensesByDay[day].push(exp);
    });

    const bgMap = { overdue: '#EF4444', open: '#F59E0B', paid: '#10B981' };

    if (validFilteredExpenses.length === 0) {
        calendarContainer.innerHTML = _emptyMsg();
    } else {
        let html = `<div style="display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:6px;">`;
        dayNames.forEach(d => {
            html += `<div style="text-align:center; font-size:9px; font-weight:600; color:${legendTextColor}; text-transform:uppercase; padding:2px 0 4px;">${d}</div>`;
        });
        for (let i = 0; i < firstDay; i++) html += '<div></div>';

        for (let d = 1; d <= daysInMonth; d++) {
            const isToday  = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
            const dayExps  = expensesByDay[d];
            const priority = dayExps ? _dayPriority(dayExps) : null;

            let cellStyle = `width:100%; height:46px; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:4px; font-size:12px; font-weight:500; position:relative; cursor:${dayExps ? 'pointer' : 'default'}; box-sizing:border-box;`;

            if (isToday) {
                cellStyle += `background:var(--color-primary); color:#fff; font-weight:700;`;
                if (isDarkMode) cellStyle += `border:2px solid #ffffff;`;
            } else if (priority) {
                cellStyle += `background:${bgMap[priority]}; color:${isDarkMode ? 'var(--color-dark)' : '#ffffff'};`;
                if (isDarkMode) cellStyle += `border:2px solid #ffffff;`;
            }

            const tooltipText = dayExps ? dayExps.map(exp => `• ${exp.descricao}`).join('\n') : '';
            html += `<div style="${cellStyle}" title="${tooltipText}"><span>${d}</span></div>`;
        }
        html += '</div>';

        const borderStyle = isDarkMode ? '1px solid #fff' : 'none';
        html += `
            <div style="display:flex; flex-wrap:wrap; gap:12px; padding:10px 0 2px; border-top:1px solid var(--color-light-gray); justify-content:center; margin-top:4px;">
                ${_calLegend(legendTextColor, 'var(--color-primary)', borderStyle, 'Hoje')}
                ${_calLegend(legendTextColor, 'var(--color-success)', borderStyle, 'Pago')}
                ${_calLegend(legendTextColor, 'var(--color-warning)', borderStyle, 'Aberto')}
                ${_calLegend(legendTextColor, 'var(--color-danger)',  borderStyle, 'Vencido')}
            </div>`;

        calendarContainer.innerHTML = html;
    }
}

// ── Helpers privados ─────────────────────────────────────────────────────────

function _emptyMsg() {
    return `<div class="chart__placeholder" style="display:flex; align-items:center; justify-content:center; height:100%; color:#666;">
        Nenhuma despesa encontrada para os filtros selecionados.
    </div>`;
}

function _legendLabel(color) {
    return {
        usePointStyle: false,
        boxWidth: 16, boxHeight: 2,
        borderRadius: 4,
        font: { size: 14, weight: 'bold' },
        color,
        useBorderRadius: true,
        borderColor: '#ffffff',
        borderWidth: 2
    };
}

function _classifyPaymentGroup(formaPagamento) {
    if (!formaPagamento) return 'À Vista';
    const f = formaPagamento.toLowerCase();
    if (f.includes('crédito') || f.includes('credito')) return 'Crédito';
    if (f.includes('débito')  || f.includes('debito'))  return 'Débito';
    return 'À Vista';
}

function _dayPriority(exps) {
    if (exps.some(e => getExpenseStatus(e) === 'Vencido')) return 'overdue';
    if (exps.some(e => getExpenseStatus(e) === 'Aberto'))  return 'open';
    return 'paid';
}

function _calLegend(textColor, bg, borderStyle, label) {
    return `<div style="display:flex; align-items:center; gap:6px; font-size:12px; color:${textColor}; font-weight:500;">
        <div style="width:10px; height:10px; border-radius:50%; background:${bg}; border:${borderStyle};"></div>${label}
    </div>`;
}
