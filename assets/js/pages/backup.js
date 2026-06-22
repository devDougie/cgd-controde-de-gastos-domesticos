// ===== 📤 PAGES — BACKUP =====
// Exportação, importação e gestão de backup

import { expenses, currentExportFormat, currentImportFormat, currentImportMode,
         setCurrentExportFormat, setCurrentImportFormat, setCurrentImportMode,
         setExpenses } from '../core/state.js';
import { saveExpensesToStorage } from '../core/storage.js';
import { closeModal, refreshCurrentPage } from '../components/sidebar.js';

export function selectImportMode(mode) {
    setCurrentImportMode(mode);

    document.querySelectorAll('#importForm .format-option[data-mode]').forEach(opt => {
        opt.classList.remove('selected');
    });
    const selected = document.querySelector(`#importForm .format-option[data-mode="${mode}"]`);
    if (selected) selected.classList.add('selected');
}

export function selectFormat(type, format) {
    if (type === 'export') {
        setCurrentExportFormat(format);
        document.querySelectorAll('#exportForm .format-option[data-format]').forEach(opt => opt.classList.remove('selected'));
        const selected = document.querySelector(`#exportForm .format-option[data-format="${format}"]`);
        if (selected) selected.classList.add('selected');
    } else if (type === 'import') {
        setCurrentImportFormat(format);
        document.querySelectorAll('#importForm .format-option[data-format]').forEach(opt => opt.classList.remove('selected'));
        const selected = document.querySelector(`#importForm .format-option[data-format="${format}"]`);
        if (selected) selected.classList.add('selected');
    }
}

export function performExport() {
    if (expenses.length === 0) {
        alert('Não há despesas para exportar.');
        return;
    }

    const fileNameInput = document.getElementById('exportFileName').value.trim();
    const fileName      = fileNameInput || `cgd-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;

    let blob, extension;

    if (currentExportFormat === 'json') {
        blob      = new Blob([JSON.stringify(expenses, null, 2)], { type: 'application/json' });
        extension = 'json';
    } else if (currentExportFormat === 'csv') {
        blob      = new Blob(['\uFEFF' + convertExpensesToCSV(expenses)], { type: 'text/csv;charset=utf-8;' });
        extension = 'csv';
    } else {
        alert('Formato de exportação inválido.');
        return;
    }

    const link   = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = `${fileName}.${extension}`;
    link.click();
    URL.revokeObjectURL(link.href);

    alert('Backup exportado com sucesso!');
}

export function performImport() {
    if (!validateImportFile()) return;

    const fileInput = document.getElementById('importFile');
    const file      = fileInput.files[0];
    const reader    = new FileReader();

    reader.onload = function (e) {
        const content = e.target.result;

        try {
            if (currentImportFormat === 'json') {
                const data = JSON.parse(content);
                if (!isValidBackup(data)) { alert('❌ O arquivo selecionado não é um backup válido do CGD.'); return; }
                applyImportedData(data);
            } else if (currentImportFormat === 'csv') {
                const data = parseCSV(content);
                if (!isValidBackup(data)) { alert('❌ O arquivo CSV não segue o formato esperado.'); return; }
                applyImportedData(data);
            }
        } catch (err) {
            alert('Erro ao importar arquivo: ' + err.message);
        }
    };

    reader.readAsText(file);
}

export function convertExpensesToCSV(data) {
    if (!data || data.length === 0) return '';
    const header = Object.keys(data[0]).join(';');
    const rows   = data.map(exp => Object.values(exp).map(v => `"${v}"`).join(';'));
    return [header, ...rows].join('\n');
}

export function validateImportFile() {
    const fileInput = document.getElementById('importFile');
    if (!fileInput || fileInput.files.length === 0) {
        alert('Selecione um arquivo antes de importar.');
        return false;
    }
    return true;
}

export function generateDefaultBackupFileName() {
    const now  = new Date();
    const yyyy = now.getFullYear();
    const MM   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const HH   = String(now.getHours()).padStart(2, '0');
    const mm   = String(now.getMinutes()).padStart(2, '0');
    const ss   = String(now.getSeconds()).padStart(2, '0');

    const fileNameInput   = document.getElementById('exportFileName');
    fileNameInput.value   = `cgd-backup-${yyyy}_${MM}_${dd}-${HH}_${mm}_${ss}`;
    return fileNameInput.value;
}

export function isValidBackup(data) {
    if (!Array.isArray(data)) return false;
    if (data.length === 0)    return true;

    return data.every(item =>
        typeof item === 'object' && item !== null &&
        'id'          in item && typeof item.id          === 'number' &&
        'descricao'   in item && typeof item.descricao   === 'string' &&
        'valorOriginal' in item && typeof item.valorOriginal === 'number' &&
        'vencimento'  in item && typeof item.vencimento  === 'string'
    );
}

export function applyImportedData(data) {
    if (currentImportMode === 'replace') {
        setExpenses(data);
    } else if (currentImportMode === 'merge') {
        expenses.push(...data);
    }

    saveExpensesToStorage();
    closeModal('restore-modal');
    refreshCurrentPage();
    resetBackupForms();

    alert('✅ Importação concluída com sucesso!');
}

export function resetBackupForms() {
    const fileInput = document.getElementById('importFile');
    if (fileInput) fileInput.value = '';

    const exportPathInput = document.getElementById('exportPath');
    if (exportPathInput) exportPathInput.value = 'C:\\Users\\Usuário\\Documents\\CGD\\backups';

    if (document.getElementById('exportFileName')) generateDefaultBackupFileName();
}

function parseCSV(content) {
    const lines   = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(';');

    return lines.slice(1).map(line => {
        const values = line.split(';').map(v => v.replace(/^"|"$/g, ''));
        const obj    = {};
        headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
        if (obj.id)            obj.id            = Number(obj.id);
        if (obj.valorOriginal) obj.valorOriginal = parseFloat(obj.valorOriginal);
        if (obj.parcelaAtual)  obj.parcelaAtual  = parseInt(obj.parcelaAtual);
        if (obj.totalParcelas) obj.totalParcelas = parseInt(obj.totalParcelas);
        return obj;
    });
}
