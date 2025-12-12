import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Users, Edit2, Trash2, ArrowLeft, Save, X, AlertCircle } from 'lucide-react';
import { obtenerHorarios, crearHorario, actualizarHorario, eliminarHorario, obtenerEmpleadosPorHorario } from '../../services/horariosService';

const NewSchedulesPage = () => {
    const [horarios, setHorarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'create', 'edit'
    const [selectedHorario, setSelectedHorario] = useState(null);
    const [empleadosAsignados, setEmpleadosAsignados] = useState([]);

    // Estados del formulario
    const [formData, setFormData] = useState({
        date_ini: '',
        date_fin: '',
        estado: 'Activo',
        config_horario: 'Semanal',
        tipo: 'continuo',
        dias: [],
        turnos: []
    });

    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const diasLabel = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const horariosData = await obtenerHorarios();
            setHorarios(horariosData);
        } catch (error) {
            console.error('Error cargando datos:', error);
            alert('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setFormData({
            date_ini: '',
            date_fin: '',
            estado: 'Activo',
            config_horario: 'Semanal',
            tipo: 'continuo',
            dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
            turnos: [{ entrada: '09:00', salida: '18:00' }]
        });
        setView('create');
    };

    const handleEdit = async (horario) => {
        setSelectedHorario(horario);

        // Cargar empleados asignados
        const empAsignados = await obtenerEmpleadosPorHorario(horario.id);
        setEmpleadosAsignados(empAsignados);

        // Parsear config_excep
        const config = typeof horario.config_excep === 'string'
            ? JSON.parse(horario.config_excep)
            : horario.config_excep;

        setFormData({
            date_ini: horario.date_ini || '',
            date_fin: horario.date_fin || '',
            estado: horario.estado,
            config_horario: horario.config_horario,
            tipo: config.tipo || 'continuo',
            dias: config.dias || [],
            turnos: config.turnos || []
        });
        setView('edit');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este horario?')) return;

        try {
            await eliminarHorario(id);
            alert('Horario eliminado correctamente');
            cargarDatos();
        } catch (error) {
            console.error('Error eliminando horario:', error);
            alert(error.response?.data?.error || 'Error al eliminar horario');
        }
    };

    const handleSave = async () => {
        try {
            // Calcular total de horas
            const totalHoras = formData.turnos.reduce((total, turno) => {
                const [hI, mI] = turno.entrada.split(':').map(Number);
                const [hF, mF] = turno.salida.split(':').map(Number);
                const duracion = (hF * 60 + mF - (hI * 60 + mI)) / 60;
                return total + duracion;
            }, 0);

            // Construir config_excep
            const config_excep = {
                dias: formData.dias,
                turnos: formData.turnos,
                tipo: formData.tipo,
                total_horas: Math.round(totalHoras * 100) / 100
            };

            if (formData.tipo === 'quebrado' && formData.turnos.length === 2) {
                const [t1, t2] = formData.turnos;
                config_excep.descanso = `${t1.salida}-${t2.entrada}`;
            }

            const horarioData = {
                date_ini: formData.date_ini || null,
                date_fin: formData.date_fin || null,
                estado: formData.estado,
                config_horario: formData.config_horario,
                config_excep
            };

            if (view === 'edit') {
                await actualizarHorario(selectedHorario.id, horarioData);
                alert('Horario actualizado correctamente');
            } else {
                await crearHorario(horarioData);
                alert('Horario creado correctamente');
            }

            setView('list');
            cargarDatos();
        } catch (error) {
            console.error('Error guardando horario:', error);
            alert('Error al guardar horario');
        }
    };

    const handleCancel = () => {
        setView('list');
        setSelectedHorario(null);
        setEmpleadosAsignados([]);
    };

    const agregarTurno = () => {
        setFormData(prev => ({
            ...prev,
            turnos: [...prev.turnos, { entrada: '09:00', salida: '18:00' }]
        }));
    };

    const eliminarTurno = (index) => {
        setFormData(prev => ({
            ...prev,
            turnos: prev.turnos.filter((_, i) => i !== index)
        }));
    };

    const actualizarTurno = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            turnos: prev.turnos.map((t, i) => i === index ? { ...t, [field]: value } : t)
        }));
    };

    const toggleDia = (dia) => {
        setFormData(prev => ({
            ...prev,
            dias: prev.dias.includes(dia)
                ? prev.dias.filter(d => d !== dia)
                : [...prev.dias, dia]
        }));
    };

    // Vista de formulario
    if (view === 'create' || view === 'edit') {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCancel}
                                className="p-2 hover:bg-white rounded-lg transition-colors text-[#6E6E73] border border-[#E5E5E7]"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-[#1D1D1F]">
                                    {view === 'edit' ? 'Editar Horario' : 'Crear Nuevo Horario'}
                                </h1>
                                <p className="text-[#6E6E73] mt-1">
                                    Define las jornadas laborales (continuas o quebradas)
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#D2D2D7] p-6 space-y-6">
                        {/* Información básica */}
                        <div>
                            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                                Información Básica
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Tipo de Horario *
                                    </label>
                                    <select
                                        value={formData.tipo}
                                        onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                                        className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="continuo">Continuo (sin descanso extendido)</option>
                                        <option value="quebrado">Quebrado (con descanso de comida)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Fecha Inicio (Vigencia)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date_ini}
                                        onChange={(e) => setFormData(prev => ({ ...prev, date_ini: e.target.value }))}
                                        className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Fecha Fin (Vigencia)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date_fin}
                                        onChange={(e) => setFormData(prev => ({ ...prev, date_fin: e.target.value }))}
                                        className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Estado
                                    </label>
                                    <select
                                        value={formData.estado}
                                        onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                                        className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="Activo">Activo</option>
                                        <option value="Inactivo">Inactivo</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Configuración
                                    </label>
                                    <select
                                        value={formData.config_horario}
                                        onChange={(e) => setFormData(prev => ({ ...prev, config_horario: e.target.value }))}
                                        className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="Semanal">Semanal</option>
                                        <option value="Mensual">Mensual</option>
                                        <option value="Diario">Diario</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Días de la semana */}
                        <div>
                            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                                Días Laborales *
                            </h3>
                            <div className="grid grid-cols-7 gap-2">
                                {diasSemana.map(dia => (
                                    <button
                                        key={dia}
                                        onClick={() => toggleDia(dia)}
                                        className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                                            formData.dias.includes(dia)
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'bg-white border-[#D2D2D7] text-[#6E6E73] hover:border-blue-400'
                                        }`}
                                    >
                                        {diasLabel[dia].slice(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Turnos */}
                        <div>
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E5E5E7]">
                                <h3 className="text-lg font-semibold text-[#1D1D1F]">
                                    Turnos / Jornadas *
                                </h3>
                                {formData.tipo === 'quebrado' && formData.turnos.length < 2 && (
                                    <button
                                        onClick={agregarTurno}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        <Plus size={16} />
                                        Agregar Turno
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {formData.turnos.map((turno, index) => (
                                    <div key={index} className="flex items-center gap-4 p-4 bg-[#F5F5F7] rounded-lg">
                                        <div className="flex-1 grid grid-cols-2 gap-4">
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
                                        {formData.turnos.length > 1 && (
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

                            {formData.tipo === 'continuo' && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-800">
                                        <strong>Horario Continuo:</strong> Un solo turno sin descanso extendido de comida.
                                        Ideal para jornadas de 6-9 horas con break corto.
                                    </p>
                                </div>
                            )}

                            {formData.tipo === 'quebrado' && (
                                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle size={18} className="text-purple-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-purple-800">
                                        <strong>Horario Quebrado:</strong> Dos turnos con descanso intermedio de comida.
                                        Ejemplo: 8:00-13:00 y 15:00-19:00 con 2 horas de descanso.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Empleados asignados (solo en edición) */}
                        {view === 'edit' && (
                            <div>
                                <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                                    Empleados Asignados ({empleadosAsignados.length})
                                </h3>
                                {empleadosAsignados.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {empleadosAsignados.map(emp => (
                                            <div key={emp.id} className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-lg">
                                                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                                                    {emp.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-[#1D1D1F]">{emp.nombre}</div>
                                                    <div className="text-xs text-[#6E6E73]">{emp.email}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[#6E6E73] text-sm">No hay empleados asignados a este horario</p>
                                )}
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E7]">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                <Save size={18} />
                                Guardar Horario
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-6 py-3 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors font-medium"
                            >
                                <X size={18} />
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Vista de lista
    return (
        <div className="min-h-screen bg-[#FBFBFD] p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-[#1D1D1F]">Gestión de Horarios</h1>
                        <p className="text-[#6E6E73] mt-1">Administra los horarios laborales de tu organización</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={20} />
                        Crear Horario
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                        <p className="text-[#6E6E73]">Cargando horarios...</p>
                    </div>
                ) : horarios.length === 0 ? (
                    <div className="bg-white rounded-xl border border-[#D2D2D7] p-12 text-center">
                        <Calendar className="w-20 h-20 text-[#6E6E73] mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
                            No hay horarios registrados
                        </h3>
                        <p className="text-[#6E6E73] mb-6">
                            Crea tu primer horario para comenzar a gestionar las jornadas laborales
                        </p>
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            <Plus size={20} />
                            Crear Primer Horario
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {horarios.map(horario => {
                            const config = typeof horario.config_excep === 'string'
                                ? JSON.parse(horario.config_excep)
                                : horario.config_excep;

                            // Generar nombre automático basado en los turnos
                            const nombreHorario = config.tipo === 'continuo'
                                ? `Horario Continuo ${config.turnos[0]?.entrada || ''} - ${config.turnos[0]?.salida || ''}`
                                : `Horario Quebrado (${config.turnos.length} turnos)`;

                            return (
                                <div key={horario.id} className="bg-white rounded-xl border border-[#D2D2D7] overflow-hidden hover:shadow-lg transition-shadow">
                                    <div className={`p-4 ${horario.estado === 'Activo' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gray-400'} text-white`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold mb-1">
                                                    {nombreHorario}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm opacity-90">
                                                    <span className="px-2 py-0.5 bg-white/20 rounded">
                                                        {config.tipo === 'continuo' ? 'Continuo' : 'Quebrado'}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{config.total_horas}h/día</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(horario)}
                                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(horario.id)}
                                                    disabled={horario.empleados_asignados > 0}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        horario.empleados_asignados > 0
                                                            ? 'bg-white/10 text-white/50 cursor-not-allowed'
                                                            : 'bg-white/20 hover:bg-white/30'
                                                    }`}
                                                    title={horario.empleados_asignados > 0 ? 'No se puede eliminar (empleados asignados)' : 'Eliminar horario'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        {/* Turnos */}
                                        <div>
                                            <div className="text-sm font-medium text-[#6E6E73] mb-2">Jornada Laboral</div>
                                            <div className="space-y-2">
                                                {config.turnos.map((turno, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-lg">
                                                        <Clock size={16} className="text-blue-600" />
                                                        <span className="font-semibold text-[#1D1D1F]">
                                                            {turno.entrada} - {turno.salida}
                                                        </span>
                                                        {config.tipo === 'quebrado' && idx === 0 && (
                                                            <span className="text-xs text-[#6E6E73]">Turno {idx + 1}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            {config.descanso && (
                                                <div className="mt-2 text-xs text-[#6E6E73]">
                                                    Descanso: {config.descanso}
                                                </div>
                                            )}
                                        </div>

                                        {/* Días */}
                                        <div>
                                            <div className="text-sm font-medium text-[#6E6E73] mb-2">Días Laborales</div>
                                            <div className="flex flex-wrap gap-2">
                                                {config.dias.map(dia => (
                                                    <span key={dia} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                                        {diasLabel[dia]}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Empleados */}
                                        <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E7]">
                                            <div className="flex items-center gap-2 text-sm text-[#6E6E73]">
                                                <Users size={16} />
                                                <span className="font-semibold text-[#1D1D1F]">
                                                    {horario.empleados_asignados}
                                                </span>
                                                <span>empleado{horario.empleados_asignados !== 1 ? 's' : ''} asignado{horario.empleados_asignados !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="text-xs text-[#6E6E73]">
                                                {horario.config_horario}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewSchedulesPage;
