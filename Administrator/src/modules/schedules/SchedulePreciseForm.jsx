import { useState, useEffect, useMemo } from 'react';
import { X, Save, ArrowLeft, Calendar, Clock, Palette, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

const SchedulePreciseForm = ({ schedule, usuario, existingSchedules, onSave, onCancel }) => {
    const [formData, setFormData] = useState(schedule || {
        id: Date.now(),
        id_usuario: usuario.id,
        dia_semana: 'lunes',
        hora_inicio: '08:00',
        hora_fin: '12:00',
        descripcion: '',
        color: '#3B82F6',
        activo: true
    });

    const [horaInicioH, setHoraInicioH] = useState('08');
    const [horaInicioM, setHoraInicioM] = useState('00');
    const [horaFinH, setHoraFinH] = useState('12');
    const [horaFinM, setHoraFinM] = useState('00');

    const diasSemana = [
        { value: 'lunes', label: 'Lunes' },
        { value: 'martes', label: 'Martes' },
        { value: 'miercoles', label: 'Miércoles' },
        { value: 'jueves', label: 'Jueves' },
        { value: 'viernes', label: 'Viernes' },
        { value: 'sabado', label: 'Sábado' },
        { value: 'domingo', label: 'Domingo' }
    ];

    const coloresPredefinidos = [
        { color: '#3B82F6', nombre: 'Azul' },
        { color: '#10B981', nombre: 'Verde' },
        { color: '#F59E0B', nombre: 'Amarillo' },
        { color: '#EF4444', nombre: 'Rojo' },
        { color: '#8B5CF6', nombre: 'Morado' },
        { color: '#EC4899', nombre: 'Rosa' },
        { color: '#06B6D4', nombre: 'Cyan' },
        { color: '#84CC16', nombre: 'Lima' }
    ];

    // Arrays para selectores
    const horas = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutos = ['00', '15', '30', '45'];

    // Inicializar valores desde schedule si existe
    useEffect(() => {
        if (schedule) {
            const [hI, mI] = schedule.hora_inicio.split(':');
            const [hF, mF] = schedule.hora_fin.split(':');
            setHoraInicioH(hI);
            setHoraInicioM(mI);
            setHoraFinH(hF);
            setHoraFinM(mF);
        }
    }, [schedule]);

    // Actualizar formData cuando cambian las horas
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            hora_inicio: `${horaInicioH}:${horaInicioM}`,
            hora_fin: `${horaFinH}:${horaFinM}`
        }));
    }, [horaInicioH, horaInicioM, horaFinH, horaFinM]);

    // Convertir hora a minutos
    const horaAMinutos = (hora) => {
        const [h, m] = hora.split(':').map(Number);
        return h * 60 + m;
    };

    // Detectar conflictos en tiempo real
    const conflicto = useMemo(() => {
        const inicioActual = horaAMinutos(formData.hora_inicio);
        const finActual = horaAMinutos(formData.hora_fin);

        // Filtrar schedules del mismo día (excluyendo el actual si es edición)
        const schedulesDelDia = existingSchedules.filter(s =>
            s.dia_semana === formData.dia_semana &&
            s.id !== formData.id
        );

        for (const s of schedulesDelDia) {
            const inicioExistente = horaAMinutos(s.hora_inicio);
            const finExistente = horaAMinutos(s.hora_fin);

            // Verificar solapamiento
            if (inicioActual < finExistente && inicioExistente < finActual) {
                return {
                    existe: true,
                    bloque: s,
                    mensaje: `Se solapa con: ${s.hora_inicio} - ${s.hora_fin}`
                };
            }
        }

        return { existe: false };
    }, [formData.dia_semana, formData.hora_inicio, formData.hora_fin, formData.id, existingSchedules]);

    // Validaciones
    const validaciones = useMemo(() => {
        const inicioMin = horaAMinutos(formData.hora_inicio);
        const finMin = horaAMinutos(formData.hora_fin);
        const duracion = finMin - inicioMin;

        return {
            horaValida: finMin > inicioMin,
            duracionMinima: duracion >= 15, // Mínimo 15 minutos
            sinConflicto: !conflicto.existe
        };
    }, [formData.hora_inicio, formData.hora_fin, conflicto]);

    const esValido = validaciones.horaValida && validaciones.duracionMinima && validaciones.sinConflicto;

    // Calcular duración
    const calcularDuracion = () => {
        const inicioMin = horaAMinutos(formData.hora_inicio);
        const finMin = horaAMinutos(formData.hora_fin);
        const duracion = finMin - inicioMin;

        if (duracion <= 0) return '0min';

        const horas = Math.floor(duracion / 60);
        const mins = duracion % 60;

        if (horas === 0) return `${mins}min`;
        if (mins === 0) return `${horas}h`;
        return `${horas}h ${mins}min`;
    };

    const handleSubmit = () => {
        if (!esValido) {
            if (!validaciones.horaValida) {
                alert('La hora de fin debe ser mayor que la hora de inicio');
            } else if (!validaciones.duracionMinima) {
                alert('La duración mínima es de 15 minutos');
            } else if (!validaciones.sinConflicto) {
                alert('Este horario se solapa con otro existente');
            }
            return;
        }

        onSave(formData);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors text-[#6E6E73]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1D1D1F]">
                            {schedule?.id ? 'Editar Horario' : 'Nuevo Bloque de Horario'}
                        </h2>
                        <p className="text-[#6E6E73] mt-1">
                            Usuario: <span className="font-semibold text-[#1D1D1F]">{usuario.nombre}</span>
                        </p>
                    </div>
                </div>

                {/* Indicador de validación */}
                <div className="flex items-center gap-2">
                    {esValido ? (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                            <CheckCircle size={18} />
                            <span className="text-sm font-medium">Horario válido</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                            <AlertTriangle size={18} />
                            <span className="text-sm font-medium">Revisar horario</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 border border-[#D2D2D7]">
                {/* Sección: Día */}
                <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                        Día de la Semana
                    </h3>
                    <div className="grid grid-cols-7 gap-2">
                        {diasSemana.map(dia => (
                            <button
                                key={dia.value}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, dia_semana: dia.value }))}
                                className={`p-3 rounded-lg border-2 transition-all font-medium ${
                                    formData.dia_semana === dia.value
                                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                                        : 'border-[#E5E5E7] hover:border-blue-300 text-[#6E6E73]'
                                }`}
                            >
                                <div className="text-xs">{dia.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sección: Horarios con selectores precisos */}
                <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                        Horario Preciso
                    </h3>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Hora Inicio */}
                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-3">
                                <Clock size={16} className="inline mr-1" />
                                Hora Inicio
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={horaInicioH}
                                    onChange={(e) => setHoraInicioH(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
                                >
                                    {horas.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                                <span className="text-2xl font-bold text-[#6E6E73] flex items-center">:</span>
                                <select
                                    value={horaInicioM}
                                    onChange={(e) => setHoraInicioM(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
                                >
                                    {minutos.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Hora Fin */}
                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-3">
                                <Clock size={16} className="inline mr-1" />
                                Hora Fin
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={horaFinH}
                                    onChange={(e) => setHoraFinH(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
                                >
                                    {horas.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                                <span className="text-2xl font-bold text-[#6E6E73] flex items-center">:</span>
                                <select
                                    value={horaFinM}
                                    onChange={(e) => setHoraFinM(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
                                >
                                    {minutos.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Vista previa del bloque */}
                    <div className="mt-4 p-4 bg-[#F5F5F7] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-[#6E6E73]">Vista previa:</p>
                            <p className="text-sm font-semibold text-[#1D1D1F]">
                                Duración: {calcularDuracion()}
                            </p>
                        </div>
                        <div
                            className={`inline-block px-6 py-3 rounded-lg text-white font-medium shadow-md ${
                                conflicto.existe ? 'ring-2 ring-red-500' : ''
                            }`}
                            style={{ backgroundColor: formData.color }}
                        >
                            {diasSemana.find(d => d.value === formData.dia_semana)?.label}: {formData.hora_inicio} - {formData.hora_fin}
                        </div>
                    </div>

                    {/* Mensajes de validación */}
                    <div className="space-y-2 mt-3">
                        {!validaciones.horaValida && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertTriangle size={14} />
                                La hora de fin debe ser mayor que la hora de inicio
                            </div>
                        )}
                        {validaciones.horaValida && !validaciones.duracionMinima && (
                            <div className="flex items-center gap-2 text-orange-600 text-sm">
                                <AlertTriangle size={14} />
                                La duración mínima es de 15 minutos
                            </div>
                        )}
                        {conflicto.existe && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                                <AlertTriangle size={14} />
                                <div>
                                    <div className="font-semibold">¡Conflicto detectado!</div>
                                    <div>{conflicto.mensaje}</div>
                                    {conflicto.bloque.descripcion && (
                                        <div className="text-xs mt-1">"{conflicto.bloque.descripcion}"</div>
                                    )}
                                </div>
                            </div>
                        )}
                        {esValido && (
                            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                                <CheckCircle size={14} />
                                <span>Horario disponible sin conflictos</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sección: Descripción y Color */}
                <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                        Detalles Adicionales
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <FileText size={16} className="inline mr-1" />
                                Descripción (opcional)
                            </label>
                            <input
                                type="text"
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                placeholder="Ej: Turno Mañana, Reunión, Capacitación..."
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <Palette size={16} className="inline mr-1" />
                                Color del Bloque
                            </label>
                            <div className="flex gap-2">
                                {coloresPredefinidos.map(({ color, nombre }) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                                        className={`w-12 h-12 rounded-lg transition-all ${
                                            formData.color === color
                                                ? 'ring-4 ring-blue-500 ring-offset-2 scale-110'
                                                : 'hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: color }}
                                        title={nombre}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E7]">
                    <button
                        onClick={handleSubmit}
                        disabled={!esValido}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${
                            esValido
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <Save size={18} />
                        Guardar Horario
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex items-center gap-2 px-6 py-3 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors font-medium"
                    >
                        <X size={18} />
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SchedulePreciseForm;
