import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Save, X, Calendar, AlertCircle } from 'lucide-react';

const HorarioEditor = ({ empleado, horario, onSave, onCancel }) => {
    const [config, setConfig] = useState({
        tipo: 'continuo',
        dias: [],
        turnos: [],
        total_horas: 0
    });

    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const diasLabel = {
        lunes: 'Lun',
        martes: 'Mar',
        miercoles: 'Mié',
        jueves: 'Jue',
        viernes: 'Vie',
        sabado: 'Sáb',
        domingo: 'Dom'
    };

    useEffect(() => {
        if (horario?.config_excep) {
            const parsedConfig = typeof horario.config_excep === 'string'
                ? JSON.parse(horario.config_excep)
                : horario.config_excep;
            setConfig(parsedConfig);
        }
    }, [horario]);

    const toggleDia = (dia) => {
        setConfig(prev => ({
            ...prev,
            dias: prev.dias.includes(dia)
                ? prev.dias.filter(d => d !== dia)
                : [...prev.dias, dia]
        }));
    };

    const agregarTurno = () => {
        setConfig(prev => ({
            ...prev,
            turnos: [...prev.turnos, { entrada: '09:00', salida: '18:00' }]
        }));
    };

    const eliminarTurno = (index) => {
        setConfig(prev => ({
            ...prev,
            turnos: prev.turnos.filter((_, i) => i !== index)
        }));
    };

    const actualizarTurno = (index, field, value) => {
        setConfig(prev => ({
            ...prev,
            turnos: prev.turnos.map((t, i) =>
                i === index ? { ...t, [field]: value } : t
            )
        }));
    };

    const calcularHorasTotales = () => {
        return config.turnos.reduce((total, turno) => {
            const [hI, mI] = turno.entrada.split(':').map(Number);
            const [hF, mF] = turno.salida.split(':').map(Number);
            const duracion = (hF * 60 + mF - (hI * 60 + mI)) / 60;
            return total + duracion;
        }, 0);
    };

    const handleGuardar = () => {
        const totalHoras = calcularHorasTotales();

        const configFinal = {
            ...config,
            total_horas: Math.round(totalHoras * 100) / 100
        };

        // Agregar campo descanso si es quebrado
        if (config.tipo === 'quebrado' && config.turnos.length >= 2) {
            const [t1, t2] = config.turnos;
            configFinal.descanso = `${t1.salida}-${t2.entrada}`;
        }

        onSave(configFinal);
    };

    const horasTotales = calcularHorasTotales();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">Editar Horario</h2>
                            <p className="text-blue-100 text-sm">{empleado?.nombre}</p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Tipo de horario */}
                    <div>
                        <label className="block text-sm font-medium text-[#1D1D1F] mb-3">
                            Tipo de Horario
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setConfig(prev => ({ ...prev, tipo: 'continuo' }))}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                    config.tipo === 'continuo'
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-[#D2D2D7] hover:border-blue-400'
                                }`}
                            >
                                <div className="font-semibold">Continuo</div>
                                <div className="text-xs mt-1 opacity-75">Un turno sin descanso extendido</div>
                            </button>
                            <button
                                onClick={() => setConfig(prev => ({ ...prev, tipo: 'quebrado' }))}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                    config.tipo === 'quebrado'
                                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                                        : 'border-[#D2D2D7] hover:border-purple-400'
                                }`}
                            >
                                <div className="font-semibold">Quebrado</div>
                                <div className="text-xs mt-1 opacity-75">Múltiples turnos con descanso</div>
                            </button>
                        </div>
                    </div>

                    {/* Días laborales */}
                    <div>
                        <label className="block text-sm font-medium text-[#1D1D1F] mb-3">
                            <Calendar size={16} className="inline mr-1" />
                            Días Laborales
                        </label>
                        <div className="grid grid-cols-7 gap-2">
                            {diasSemana.map(dia => (
                                <button
                                    key={dia}
                                    onClick={() => toggleDia(dia)}
                                    className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                                        config.dias.includes(dia)
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-[#D2D2D7] text-[#6E6E73] hover:border-blue-400'
                                    }`}
                                >
                                    {diasLabel[dia]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Turnos */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-[#1D1D1F]">
                                <Clock size={16} className="inline mr-1" />
                                Turnos / Jornadas
                            </label>
                            <button
                                onClick={agregarTurno}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                <Plus size={16} />
                                Agregar Turno
                            </button>
                        </div>

                        <div className="space-y-3">
                            {config.turnos.map((turno, index) => (
                                <div key={index} className="flex items-center gap-3 p-4 bg-[#F5F5F7] rounded-lg">
                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                                                Entrada {index + 1}
                                            </label>
                                            <input
                                                type="time"
                                                value={turno.entrada}
                                                onChange={(e) => actualizarTurno(index, 'entrada', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                                                Salida {index + 1}
                                            </label>
                                            <input
                                                type="time"
                                                value={turno.salida}
                                                onChange={(e) => actualizarTurno(index, 'salida', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    {config.turnos.length > 1 && (
                                        <button
                                            onClick={() => eliminarTurno(index)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {config.turnos.length === 0 && (
                            <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">No hay turnos configurados</p>
                                <button
                                    onClick={agregarTurno}
                                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Agregar Primer Turno
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Resumen */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="font-semibold text-blue-900 mb-1">Resumen del Horario</div>
                                <div className="text-sm text-blue-800 space-y-1">
                                    <div>• Tipo: <strong>{config.tipo === 'continuo' ? 'Continuo' : 'Quebrado'}</strong></div>
                                    <div>• Días laborales: <strong>{config.dias.length}</strong></div>
                                    <div>• Turnos: <strong>{config.turnos.length}</strong></div>
                                    <div>• Horas por día: <strong>{Math.round(horasTotales * 100) / 100}h</strong></div>
                                    <div>• Horas por semana: <strong>{Math.round(horasTotales * config.dias.length * 100) / 100}h</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer con botones */}
                <div className="sticky bottom-0 bg-white border-t border-[#E5E5E7] p-4 rounded-b-xl flex items-center gap-3">
                    <button
                        onClick={handleGuardar}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Save size={18} />
                        Guardar Horario
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HorarioEditor;
