import React, { useState, useEffect } from 'react';
import { IdCard, Shield, Key, AlertCircle, CheckCircle } from 'lucide-react';

const EmployeeFormEnhanced = ({ data, onChange, loading }) => {
    const [employeeData, setEmployeeData] = useState({
        nss: data?.nss || '',
        rfc: data?.rfc || '',
        pin: data?.pin || ''
    });

    const [validation, setValidation] = useState({
        nss: { valid: true, message: '' },
        rfc: { valid: true, message: '' },
        pin: { valid: true, message: '' }
    });

    useEffect(() => {
        setEmployeeData({
            nss: data?.nss || '',
            rfc: data?.rfc || '',
            pin: data?.pin || ''
        });
    }, [data]);

    // Validar NSS (11 dígitos)
    const validateNSS = (nss) => {
        const clean = nss.replace(/\D/g, '');
        if (!clean) {
            return { valid: true, message: '' };
        }
        if (clean.length !== 11) {
            return { valid: false, message: 'El NSS debe tener 11 dígitos' };
        }
        return { valid: true, message: 'NSS válido' };
    };

    // Validar RFC (13 caracteres: 4 letras + 6 números + 3 alfanuméricos)
    const validateRFC = (rfc) => {
        const clean = rfc.toUpperCase().trim();
        if (!clean) {
            return { valid: true, message: '' };
        }

        // Formato: AAAA000000XXX
        const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

        if (clean.length !== 13) {
            return { valid: false, message: 'El RFC debe tener 13 caracteres' };
        }
        if (!rfcPattern.test(clean)) {
            return { valid: false, message: 'Formato de RFC inválido' };
        }
        return { valid: true, message: 'RFC válido' };
    };

    // Validar PIN (4 dígitos)
    const validatePIN = (pin) => {
        const clean = pin.replace(/\D/g, '');
        if (!clean) {
            return { valid: true, message: '' };
        }
        if (clean.length !== 4) {
            return { valid: false, message: 'El PIN debe tener 4 dígitos' };
        }
        return { valid: true, message: 'PIN válido' };
    };

    // Formatear NSS (XX-XX-XX-XXXX-X)
    const formatNSS = (value) => {
        const numbers = value.replace(/\D/g, '').slice(0, 11);
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 4) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
        if (numbers.length <= 6) return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4)}`;
        if (numbers.length <= 10) return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6)}`;
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 10)}-${numbers.slice(10)}`;
    };

    const handleNSSChange = (e) => {
        const formatted = formatNSS(e.target.value);
        const clean = formatted.replace(/\D/g, '');

        const newData = { ...employeeData, nss: clean };
        setEmployeeData(newData);
        onChange(newData);
        setValidation(prev => ({ ...prev, nss: validateNSS(clean) }));
    };

    const handleRFCChange = (e) => {
        const value = e.target.value.toUpperCase().slice(0, 13);

        const newData = { ...employeeData, rfc: value };
        setEmployeeData(newData);
        onChange(newData);
        setValidation(prev => ({ ...prev, rfc: validateRFC(value) }));
    };

    const handlePINChange = (e) => {
        const numbers = e.target.value.replace(/\D/g, '').slice(0, 4);

        const newData = { ...employeeData, pin: numbers };
        setEmployeeData(newData);
        onChange(newData);
        setValidation(prev => ({ ...prev, pin: validatePIN(numbers) }));
    };

    if (loading) {
        return (
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-blue-700 text-center">Cargando datos de empleado...</p>
            </div>
        );
    }

    return (
        <div className="mb-8">
            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7] flex items-center gap-2">
                <IdCard size={20} className="text-blue-600" />
                Información de Empleado
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* NSS */}
                <div>
                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                        <IdCard size={16} className="inline mr-1" />
                        Número de Seguridad Social (NSS) *
                    </label>
                    <input
                        type="text"
                        value={formatNSS(employeeData.nss)}
                        onChange={handleNSSChange}
                        placeholder="12-34-56-7890-1"
                        maxLength={15}
                        className={`w-full px-4 py-3 bg-white border ${validation.nss.valid ? 'border-[#D2D2D7]' : 'border-red-500'
                            } text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 ${validation.nss.valid ? 'focus:ring-blue-500' : 'focus:ring-red-500'
                            } transition-all font-mono`}
                    />
                    {validation.nss.message && (
                        <div className={`flex items-center gap-1 mt-1 text-xs ${validation.nss.valid ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {validation.nss.valid ? (
                                <CheckCircle size={12} />
                            ) : (
                                <AlertCircle size={12} />
                            )}
                            <span>{validation.nss.message}</span>
                        </div>
                    )}
                    <p className="text-xs text-[#6E6E73] mt-1">
                        Formato: XX-XX-XX-XXXX-X (11 dígitos)
                    </p>
                </div>

                {/* RFC */}
                <div>
                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                        <Shield size={16} className="inline mr-1" />
                        RFC (Registro Federal de Contribuyentes) *
                    </label>
                    <input
                        type="text"
                        value={employeeData.rfc}
                        onChange={handleRFCChange}
                        placeholder="ABCD123456XYZ"
                        maxLength={13}
                        className={`w-full px-4 py-3 bg-white border ${validation.rfc.valid ? 'border-[#D2D2D7]' : 'border-red-500'
                            } text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 ${validation.rfc.valid ? 'focus:ring-blue-500' : 'focus:ring-red-500'
                            } transition-all font-mono uppercase`}
                        style={{ textTransform: 'uppercase' }}
                    />
                    {validation.rfc.message && (
                        <div className={`flex items-center gap-1 mt-1 text-xs ${validation.rfc.valid ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {validation.rfc.valid ? (
                                <CheckCircle size={12} />
                            ) : (
                                <AlertCircle size={12} />
                            )}
                            <span>{validation.rfc.message}</span>
                        </div>
                    )}
                    <p className="text-xs text-[#6E6E73] mt-1">
                        13 caracteres: 4 letras + 6 números + 3 alfanuméricos
                    </p>
                </div>

                {/* PIN */}
                <div>
                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                        <Key size={16} className="inline mr-1" />
                        PIN de Acceso *
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={employeeData.pin}
                        onChange={handlePINChange}
                        placeholder="1234"
                        maxLength={4}
                        className={`w-full px-4 py-3 bg-white border ${validation.pin.valid ? 'border-[#D2D2D7]' : 'border-red-500'
                            } text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 ${validation.pin.valid ? 'focus:ring-blue-500' : 'focus:ring-red-500'
                            } transition-all font-mono text-2xl tracking-widest text-center`}
                    />
                    {validation.pin.message && (
                        <div className={`flex items-center gap-1 mt-1 text-xs ${validation.pin.valid ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {validation.pin.valid ? (
                                <CheckCircle size={12} />
                            ) : (
                                <AlertCircle size={12} />
                            )}
                            <span>{validation.pin.message}</span>
                        </div>
                    )}
                    <p className="text-xs text-[#6E6E73] mt-1">
                        4 dígitos numéricos para control de asistencia
                    </p>
                </div>
            </div>

            {/* Nota informativa */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-900 mb-1">
                            Información importante
                        </p>
                        <ul className="text-xs text-amber-800 space-y-1">
                            <li>• El NSS debe ser válido ante el IMSS</li>
                            <li>• El RFC debe coincidir con el SAT</li>
                            <li>• El PIN será usado para registro de asistencia biométrica</li>
                            <li>• Todos los campos son obligatorios para empleados</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeFormEnhanced;
