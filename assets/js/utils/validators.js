// ===== ✅ UTILS — VALIDATORS =====
// Validação genérica de formulários e datas

import { parseDate } from './formatters.js';

export function validateForm(formConfig) {
    const { modalSelector, fields, customValidations = [] } = formConfig;
    let isValid = true;
    const errors = [];

    fields.forEach(field => {
        const { id, type, required = true, minLength, maxValue } = field;
        const input = document.getElementById(id);
        if (!input) return;

        let fieldValid = true;
        let fieldValue = input.value;

        switch (type) {
            case 'text':
                fieldValue = fieldValue.trim();
                if (required && !fieldValue) fieldValid = false;
                if (minLength && fieldValue.length < minLength) fieldValid = false;
                break;

            case 'number': {
                const numValue = parseFloat(fieldValue);
                if (required && (isNaN(numValue) || numValue <= 0)) fieldValid = false;
                if (maxValue && numValue > maxValue) {
                    input.value = maxValue;
                    fieldValue  = maxValue;
                    fieldValid  = true;
                }
                break;
            }

            case 'select':
                if (required && !fieldValue) fieldValid = false;
                break;

            case 'date': {
                const dateValue = parseDate(fieldValue);
                if (required && (!fieldValue || !dateValue || isNaN(dateValue))) fieldValid = false;
                break;
            }
        }

        input.style.borderColor = fieldValid ? 'var(--color-success)' : 'var(--color-danger)';

        if (!fieldValid) {
            isValid = false;
            errors.push(field.errorMessage || `Campo ${field.label || id} inválido`);
        }
    });

    if (modalSelector) {
        const dateInputs = document.querySelectorAll(`${modalSelector} input[type="date"]`);
        dateInputs.forEach(input => {
            const value = input.value;
            const date  = parseDate(value);

            if (!value || !date || isNaN(date)) {
                input.style.borderColor = 'var(--color-danger)';
                isValid = false;
                errors.push('Preencha todas as datas corretamente');
            } else {
                input.style.borderColor = 'var(--color-success)';
            }
        });
    }

    customValidations.forEach(validation => {
        const result = validation();
        if (!result.valid) {
            isValid = false;
            errors.push(result.message);
        }
    });

    return { valid: isValid, errors };
}
