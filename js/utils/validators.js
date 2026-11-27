export const InputSecurity = {
  SQL_INJECTION_PATTERN: /('|"|;|--|\/\*|\*\/|union\s+select|insert\s+into|drop\s+table|exec\(|benchmark\(|sleep\()/i,

  sanitize(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\0/g, '').trim();
  },

  isSuspiciousSql(value) {
    if (!value || typeof value !== 'string') return false;
    return this.SQL_INJECTION_PATTERN.test(value);
  },

  validateField(inputElement, options = {}) {
    const rawValue = inputElement.value ?? '';
    const cleanValue = this.sanitize(rawValue);
    const { required = false, type = 'text', maxLength = 150, min = null, max = null } = options;

    if (required && !cleanValue) {
      return { valid: false, message: 'Este campo es obligatorio' };
    }

    if (cleanValue && cleanValue.length > maxLength) {
      return { valid: false, message: `No puede superar ${maxLength} caracteres` };
    }

    if (type === 'number') {
      const num = Number(cleanValue);
      if (isNaN(num)) {
        return { valid: false, message: 'Debe ingresar un valor numérico válido' };
      }
      if (min !== null && num < min) {
        return { valid: false, message: `El valor no puede ser menor a ${min}` };
      }
      if (max !== null && num > max) {
        return { valid: false, message: `El valor no puede superar ${max}` };
      }
    }

    if (type === 'date' && cleanValue) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) {
        return { valid: false, message: 'Formato de fecha inválido (AAAA-MM-DD)' };
      }
    }

    return { valid: true, value: cleanValue };
  }
};

