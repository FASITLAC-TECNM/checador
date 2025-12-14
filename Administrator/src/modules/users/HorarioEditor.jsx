import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Save, X, Calendar, AlertCircle, CalendarDays } from 'lucide-react';

const HorarioEditorV2 = ({ empleado, horario, onSave, onCancel }) => {
    const [config, setConfig] = useState({
        configuracion_semanal: {
            lunes: [],
            martes: [],
            miercoles: [],
            jueves: [],
            viernes: [],
            sabado: [],
            domingo: []
        },
        excepciones: {}
    });

    const [diaSeleccionado, setDiaSeleccionado] = useState('lunes');
    const [mostrarExcepciones, setMostrarExcepciones] = useState(false);

    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const diasLabel = {
        lunes: 'Lunes',
        martes: 'Martes',
        miercoles: 'Miércoles',
        jueves: 'Jueves',
        viernes: 'Viernes',
        sabado: 'Sábado',
        domingo: 'Domingo'
    };

    useEffect(() => {
        if (horario?.config_excep) {
            const parsedConfig = typeof horario.config_excep === 'string'
                ? JSON.parse(horario.config_excep)
                : horario.config_excep;
            setConfig(parsedConfig);
        }
    }, [horario]);

    const agregarIntervalo = (dia) => {
        setConfig(prev => ({
            ...prev,
            configuracion_semanal: {
                ...prev.configuracion_semanal,
                [dia]: [...prev.configuracion_semanal[dia], { inicio: '09:00', fin: '18:00' }]
            }
        }));
    };

    const eliminarIntervalo = (dia, index) => {
        setConfig(prev => ({
            ...prev,
            configuracion_semanal: {
                ...prev.configuracion_semanal,
                [dia]: prev.configuracion_semanal[dia].filter((_, i) => i !== index)
            }
        }));
    };

    const actualizarIntervalo = (dia, index, field, value) => {
        setConfig(prev => ({
            ...prev,
            configuracion_semanal: {
                ...prev.configuracion_semanal,
                [dia]: prev.configuracion_semanal[dia].map((intervalo, i) =>
                    i === index ? { ...intervalo, [field]: value } : intervalo
                )
            }
        }));
    };

    const copiarHorario = (diaOrigen) => {
        const intervalosACopiar = config.configuracion_semanal[diaOrigen];
        setConfig(prev => ({
            ...prev,
            configuracion_semanal: {
                ...prev.configuracion_semanal,
                [diaSeleccionado]: [...intervalosACopiar]
            }
        }));
    };

    const limpiarDia = (dia) => {
        setConfig(prev => ({
            ...prev,
            configuracion_semanal: {
                ...prev.configuracion_semanal,
                [dia]: []
            }
        }));
    };

    const calcularHorasDelDia = (dia) => {
        return config.configuracion_semanal[dia].reduce((total, intervalo) => {
            const [hI, mI] = intervalo.inicio.split(':').map(Number);
            const [hF, mF] = intervalo.fin.split(':').map(Number);
            const duracion = (hF * 60 + mF - (hI * 60 + mI)) / 60;
            return total + duracion;
        }, 0);
    };

    const calcularHorasSemanales = () => {
        return diasSemana.reduce((total, dia) => total + calcularHorasDelDia(dia), 0);
    };

    const handleGuardar = () => {
        onSave(config);
    };

    const intervalosDelDia = config.configuracion_semanal[diaSeleccionado];
    const horasDelDia = calcularHorasDelDia(diaSeleccionado);
    const horasSemanales = calcularHorasSemanales();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">Configurar Horario Semanal</h2>
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
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-sm text-blue-600 mb-1">Día Actual</div>
                            <div className="text-2xl font-bold text-blue-900">{horasDelDia.toFixed(1)}h</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="text-sm text-green-600 mb-1">Total Semanal</div>
                            <div className="text-2xl font-bold text-green-900">{horasSemanales.toFixed(1)}h</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="text-sm text-purple-600 mb-1">Intervalos Hoy</div>
                            <div className="text-2xl font-bold text-purple-900">{intervalosDelDia.length}</div>
                        </div>
                    </div>

                    {/* Selector de día */}
                    <div>
                        <label className="block text-sm font-medium text-[#1D1D1F] mb-3">
                            <Calendar size={16} className="inline mr-1" />
                            Seleccionar Día
                        </label>
                        <div className="grid grid-cols-7 gap-2">
                            {diasSemana.map(dia => {
                                const horas = calcularHorasDelDia(dia);
                                const numIntervalos = config.configuracion_semanal[dia].length;

                                return (
                                    <button
                                        key={dia}
                                        onClick={() => setDiaSeleccionado(dia)}
                                        className={`p-3 rounded-lg border-2 transition-all ${
                                            diaSeleccionado === dia
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : numIntervalos > 0
                                                ? 'bg-green-50 border-green-300 text-green-700 hover:border-green-500'
                                                : 'bg-white border-[#D2D2D7] text-[#6E6E73] hover:border-blue-400'
                                        }`}
                                    >
                                        <div className="font-semibold text-sm">{diasLabel[dia].slice(0, 3)}</div>
                                        {numIntervalos > 0 && (
                                            <div className="text-xs mt-1">
                                                {horas.toFixed(1)}h
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Herramientas rápidas */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    copiarHorario(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="px-3 py-2 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-lg text-sm"
                        >
                            <option value="">Copiar desde...</option>
                            {diasSemana.filter(d => d !== diaSeleccionado && config.configuracion_semanal[d].length > 0).map(dia => (
                                <option key={dia} value={dia}>{diasLabel[dia]}</option>
                            ))}
                        </select>

                        {intervalosDelDia.length > 0 && (
                            <button
                                onClick={() => limpiarDia(diaSeleccionado)}
                                className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm"
                            >
                                Limpiar {diasLabel[diaSeleccionado]}
                            </button>
                        )}
                    </div>

                    {/* Intervalos del día */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-[#1D1D1F]">
                                <Clock size={16} className="inline mr-1" />
                                Intervalos de {diasLabel[diaSeleccionado]}
                            </label>
                            <button
                                onClick={() => agregarIntervalo(diaSeleccionado)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                <Plus size={16} />
                                Agregar Intervalo
                            </button>
                        </div>

                        <div className="space-y-3">
                            {intervalosDelDia.length === 0 ? (
                                <div className="p-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                                    <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm mb-3">No hay intervalos configurados para este día</p>
                                    <button
                                        onClick={() => agregarIntervalo(diaSeleccionado)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm inline-flex items-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Agregar Primer Intervalo
                                    </button>
                                </div>
                            ) : (
                                intervalosDelDia.map((intervalo, index) => {
                                    const [hI, mI] = intervalo.inicio.split(':').map(Number);
                                    const [hF, mF] = intervalo.fin.split(':').map(Number);
                                    const duracion = ((hF * 60 + mF) - (hI * 60 + mI)) / 60;

                                    return (
                                        <div key={index} className="flex items-center gap-3 p-4 bg-[#F5F5F7] rounded-lg">
                                            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg font-bold text-sm">
                                                {index + 1}
                                            </div>

                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                                                        Inicio
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={intervalo.inicio}
                                                        onChange={(e) => actualizarIntervalo(diaSeleccionado, index, 'inicio', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                                                        Fin
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={intervalo.fin}
                                                        onChange={(e) => actualizarIntervalo(diaSeleccionado, index, 'fin', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-lg"
                                                    />
                                                </div>
                                            </div>

                                            <div className="text-right min-w-[60px]">
                                                <div className="text-xs text-[#6E6E73]">Duración</div>
                                                <div className="text-sm font-bold text-[#1D1D1F]">{duracion.toFixed(1)}h</div>
                                            </div>

                                            <button
                                                onClick={() => eliminarIntervalo(diaSeleccionado, index)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Resumen visual */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="font-semibold text-blue-900 mb-2">Resumen Semanal</div>
                                <div className="grid grid-cols-7 gap-1">
                                    {diasSemana.map(dia => {
                                        const horas = calcularHorasDelDia(dia);
                                        const intervalos = config.configuracion_semanal[dia].length;

                                        return (
                                            <div key={dia} className={`p-2 rounded text-center ${
                                                horas > 0 ? 'bg-white border border-blue-200' : 'bg-blue-100/50'
                                            }`}>
                                                <div className="text-xs font-medium text-blue-900">
                                                    {diasLabel[dia].slice(0, 3)}
                                                </div>
                                                {horas > 0 ? (
                                                    <>
                                                        <div className="text-sm font-bold text-blue-700">{horas.toFixed(1)}h</div>
                                                        <div className="text-[10px] text-blue-600">{intervalos} int.</div>
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-blue-400">--</div>
                                                )}
                                            </div>
                                        );
                                    })}
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

export default HorarioEditorV2;
