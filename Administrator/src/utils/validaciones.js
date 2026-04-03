/**
 * utils/validaciones.js
 */

const REGEX = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE: /^\d{10}$/,
    RFC: /^([A-ZÑ\x26]{3,4}([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1]))([A-Z\d]{3})?$/,
    NSS: /^\d{11}$/,
    // Solo letras y espacios
    ONLY_LETTERS: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
};

export const validaciones = {
    isRequired: (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        return true;
    },
    isEmail: (email) => REGEX.EMAIL.test(email),
    isPhone: (phone) => REGEX.PHONE.test(phone),
    isRFC: (rfc) => REGEX.RFC.test(rfc ? rfc.toUpperCase() : ''),
    isNSS: (nss) => REGEX.NSS.test(nss),
};

/**
 * Valida un solo campo basándose en reglas
 * @param {string} name - Nombre del campo
 * @param {any} value - Valor del campo
 * @param {Object} rules - Objeto de reglas completo
 * @returns {string|null} - Mensaje de error o null
 */
export const validateField = (name, value, rules) => {
    if (!rules[name]) return null;

    const fieldRules = rules[name];

    for (const rule of fieldRules) {
        if (rule === 'required' && !validaciones.isRequired(value)) {
            return 'Este campo es requerido';
        }
        if (value && rule === 'email' && !validaciones.isEmail(value)) {
            return 'Correo electrónico inválido';
        }
        if (value && rule === 'phone' && !validaciones.isPhone(value)) {
            return 'Debe tener 10 dígitos';
        }
        if (value && rule === 'rfc' && !validaciones.isRFC(value)) {
            return 'Formato de RFC inválido';
        }
        if (value && rule === 'nss' && !validaciones.isNSS(value)) {
            return 'El NSS debe tener 11 dígitos';
        }
    }
    return null;
};

/**
 * Valida todo el formulario (útil antes de enviar)
 */
export const validateForm = (formData, rules) => {
    const errors = {};
    let isValid = true;

    Object.keys(rules).forEach((field) => {
        const error = validateField(field, formData[field], rules);
        if (error) {
            errors[field] = error;
            isValid = false;
        }
    });

    return { isValid, errors };
};