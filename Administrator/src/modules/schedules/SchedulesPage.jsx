import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Users as UsersIcon, Clock, Calendar, AlertTriangle } from 'lucide-react';
import ScheduleUserSelector from './ScheduleUserSelector';
import ScheduleWeekView from './ScheduleWeekView';
import SchedulePreciseForm from './SchedulePreciseForm';
import { getUsuarios } from '../../services/api';

const SchedulesPage = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cargar usuarios reales desde la BD
    useEffect(() => {
        cargarUsuarios();
    }, []);

    const cargarUsuarios = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getUsuarios();
            setUsuarios(data);
        } catch (err) {
            setError('Error al cargar usuarios desde la base de datos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Estados de horarios (simulados por ahora)
    const [schedules, setSchedules] = useState([
        {
            id: 1,
            id_usuario: null,
            dia_semana: 'lunes',
            hora_inicio: '08:00',
            hora_fin: '12:00',
            descripcion: 'Turno Mañana',
            color: '#10B981',
            activo: true
        },
        {
            id: 2,
            id_usuario: null,
            dia_semana: 'lunes',
            hora_inicio: '13:00',
            hora_fin: '17:00',
            descripcion: 'Turno Tarde',
            color: '#3B82F6',
            activo: true
        },
        {
            id: 3,
            id_usuario: null,
            dia_semana: 'martes',
            hora_inicio: '09:00',
            hora_fin: '13:30',
            descripcion: 'Jornada Matutina',
            color: '#8B5CF6',
            activo: true
        },
        {
            id: 4,
            id_usuario: null,
            dia_semana: 'miercoles',
            hora_inicio: '14:00',
            hora_fin: '18:30',
            descripcion: 'Turno Vespertino',
            color: '#F59E0B',
            activo: true
        },
        {
            id: 5,
            id_usuario: null,
            dia_semana: 'jueves',
            hora_inicio: '07:30',
            hora_fin: '15:00',
            descripcion: 'Turno Extendido',
            color: '#EF4444',
            activo: true
        }
    ]);

    // Asignar usuarios automáticamente a los horarios de ejemplo
    useEffect(() => {
        if (usuarios.length > 0) {
            setSchedules(prev => prev.map((schedule, index) => ({
                ...schedule,
                id_usuario: schedule.id_usuario || usuarios[index % usuarios.length]?.id || usuarios[0]?.id
            })));
        }
    }, [usuarios]);

    // Estados de navegación
    const [selectedUsuario, setSelectedUsuario] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [scheduleToEdit, setScheduleToEdit] = useState(null);

    // Obtener horarios del usuario seleccionado
    const schedulesDelUsuario = useMemo(() => {
        if (!selectedUsuario) return [];
        return schedules.filter(s => s.id_usuario === selectedUsuario.id);
    }, [schedules, selectedUsuario]);

    // Estadísticas globales
    const statsGlobales = useMemo(() => {
        const horasTotales = schedules.reduce((acc, s) => {
            const [hI, mI] = s.hora_inicio.split(':').map(Number);
            const [hF, mF] = s.hora_fin.split(':').map(Number);
            const duracion = (hF * 60 + mF) - (hI * 60 + mI);
            return acc + duracion;
        }, 0);

        const usuariosConHorarios = new Set(schedules.map(s => s.id_usuario)).size;

        return {
            totalBloques: schedules.length,
            horasTotales: Math.round(horasTotales / 60 * 10) / 10,
            usuariosConHorarios,
            totalUsuarios: usuarios.length
        };
    }, [schedules, usuarios]);

    // Handlers
    const handleSelectUser = (usuario) => {
        setSelectedUsuario(usuario);
        setShowForm(false);
        setScheduleToEdit(null);
    };

    const handleBackToSelector = () => {
        setSelectedUsuario(null);
        setShowForm(false);
        setScheduleToEdit(null);
    };

    const handleAddBlock = (dia, hora) => {
        const [horaNum] = hora.split(':').map(Number);
        const horaFin = `${(horaNum + 1).toString().padStart(2, '0')}:00`;

        setScheduleToEdit({
            id: null,
            id_usuario: selectedUsuario.id,
            dia_semana: dia,
            hora_inicio: hora,
            hora_fin: horaFin,
            descripcion: '',
            color: '#3B82F6',
            activo: true
        });
        setShowForm(true);
    };

    const handleEditBlock = (schedule) => {
        setScheduleToEdit(schedule);
        setShowForm(true);
    };

    const handleDeleteBlock = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este bloque de horario?')) {
            setSchedules(schedules.filter(s => s.id !== id));
        }
    };

    const handleSaveSchedule = (scheduleData) => {
        if (scheduleToEdit?.id) {
            // Actualizar horario existente
            setSchedules(schedules.map(s =>
                s.id === scheduleData.id ? scheduleData : s
            ));
        } else {
            // Crear nuevo horario
            const newSchedule = {
                ...scheduleData,
                id: Date.now()
            };
            setSchedules([...schedules, newSchedule]);
        }

        setShowForm(false);
        setScheduleToEdit(null);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setScheduleToEdit(null);
    };

    const handleQuickAddBlock = () => {
        setScheduleToEdit({
            id: null,
            id_usuario: selectedUsuario.id,
            dia_semana: 'lunes',
            hora_inicio: '08:00',
            hora_fin: '12:00',
            descripcion: '',
            color: '#3B82F6',
            activo: true
        });
        setShowForm(true);
    };

    // Mostrar loading
    if (loading) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6 flex items-center justify-center">
                <div className="text-center">
                    <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                    <div className="text-[#1D1D1F] text-xl font-semibold">Cargando usuarios...</div>
                </div>
            </div>
        );
    }

    // Mostrar error
    if (error) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6 flex items-center justify-center">
                <div className="bg-red-50 border border-red-300 rounded-xl p-6 max-w-md">
                    <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <p className="text-red-600 text-lg mb-4 text-center font-semibold">{error}</p>
                    <button
                        onClick={cargarUsuarios}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FBFBFD] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Vista de formulario */}
                {showForm && selectedUsuario ? (
                    <SchedulePreciseForm
                        schedule={scheduleToEdit}
                        usuario={selectedUsuario}
                        existingSchedules={schedulesDelUsuario}
                        onSave={handleSaveSchedule}
                        onCancel={handleCancelForm}
                    />
                ) : selectedUsuario ? (
                    /* Vista de calendario del usuario */
                    <>
                        {/* Header con navegación */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={handleBackToSelector}
                                className="flex items-center gap-2 px-4 py-2 text-[#6E6E73] hover:bg-white rounded-lg transition-colors border border-[#E5E5E7]"
                            >
                                <ArrowLeft size={18} />
                                Volver a usuarios
                            </button>

                            <button
                                onClick={handleQuickAddBlock}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm font-medium"
                            >
                                <Plus size={20} />
                                Agregar Bloque
                            </button>
                        </div>

                        <ScheduleWeekView
                            schedules={schedulesDelUsuario}
                            usuario={selectedUsuario}
                            onAddBlock={handleAddBlock}
                            onEditBlock={handleEditBlock}
                            onDeleteBlock={handleDeleteBlock}
                        />
                    </>
                ) : (
                    /* Vista de selección de usuario */
                    <>
                        {/* Header principal */}
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-[#1D1D1F] mb-3">Gestión de Horarios</h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                    <UsersIcon className="w-4 h-4" />
                                    <span className="font-semibold">{statsGlobales.usuariosConHorarios}</span>
                                    <span className="text-sm">de {statsGlobales.totalUsuarios} con horarios</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-semibold">{statsGlobales.totalBloques}</span>
                                    <span className="text-sm">bloques</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                                    <Calendar className="w-4 h-4" />
                                    <span className="font-semibold">{statsGlobales.horasTotales}h</span>
                                    <span className="text-sm">totales</span>
                                </div>
                            </div>
                        </div>

                        {/* Selector de usuarios */}
                        <ScheduleUserSelector
                            usuarios={usuarios}
                            schedules={schedules}
                            onSelectUser={handleSelectUser}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default SchedulesPage;
