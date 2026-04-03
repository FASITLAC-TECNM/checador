import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FiArrowLeft,
    FiMail,
    FiPhone,
    FiClock,
    FiShield,
    FiCalendar,
    FiBriefcase,
    FiFileText,
    FiHash,
    FiAlertCircle,
    FiSmartphone,
    FiWifi,
    FiCpu,
    FiUserCheck,
    FiActivity,
    FiCheckCircle,
    FiXCircle,
    FiAlertTriangle,
    FiFilter,
    FiRefreshCw,
    FiChevronDown, // Nuevo icono importado
    FiEdit2,
    FiSave,
    FiLock,
    FiUnlock,
    FiChevronLeft,
    FiChevronRight
} from 'react-icons/fi';
import { AiFillAndroid } from 'react-icons/ai';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

import { API_CONFIG } from '../config/Apiconfig';
import { useConfig } from '../context/ConfigContext';
import DynamicLoader from '../components/common/DynamicLoader';
import ConfirmBox from '../components/ConfirmBox';
const API_URL = API_CONFIG.BASE_URL;

const DIAS_SEMANA = [
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
];

const COLORS = {
    puntual: '#22c55e',
    retardo: '#eab308',
    falta: '#ef4444',
    gris: '#94a3b8'
};

const PerfilUsuario = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const { formatTime } = useConfig();

    // Estados de datos
    const [usuario, setUsuario] = useState(null);
    const [empleadoId, setEmpleadoId] = useState(null);
    const [dispositivo, setDispositivo] = useState(null);
    const [estadisticas, setEstadisticas] = useState(null);
    const [historial, setHistorial] = useState([]);

    // Estados de filtros de tiempo
    const [rangoTiempo, setRangoTiempo] = useState('siempre');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    // Estado para el menú desplegable de fechas
    const [showDateMenu, setShowDateMenu] = useState(false);

    // Estados de carga y error
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);
    const [error, setError] = useState(null);

    // Estado de edición
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [credenciales, setCredenciales] = useState({
        tiene_pin: false,
        tiene_dactilar: false,
        tiene_facial: false
    });
    const [newPin, setNewPin] = useState('');
    const [saving, setSaving] = useState(false);

    // Estado para modal de asistencia manual
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualData, setManualData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        usar_horario: true,
        hora_entrada: '08:00',
        hora_salida: '17:00',
        motivo: ''
    });

    // Estado para alertas personalizadas
    const [alertMsg, setAlertMsg] = useState(null);
    const [manualLoading, setManualLoading] = useState(false);

    // --- NUEVO: Estado para selección múltiple de horario ---
    // Removed viewMode state as we only support schedule view now
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes
        return new Date(d.setDate(diff));
    });
    const [selectedBlocks, setSelectedBlocks] = useState([]); // [{ date: 'YYYY-MM-DD', start: 'HH:MM', end: 'HH:MM' }]
    const [horarioEmpleado, setHorarioEmpleado] = useState(null);

    useEffect(() => {
        if (showManualModal) {
            setSelectedBlocks([]);
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            setCurrentWeekStart(new Date(d.setDate(diff)));
        }
    }, [showManualModal]);

    const fetchHorario = async (empId, token) => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/empleados/${empId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                // Fix: Access horario_config directly from result.data
                let config = result.data.horario_config || result.data.horario?.configuracion;

                if (typeof config === 'string') {
                    try { config = JSON.parse(config); } catch (e) { config = null; }
                }
                setHorarioEmpleado(config);
            }
        } catch (error) {
            console.error("Error fetching horario:", error);
        }
    };

    useEffect(() => {
        if (usuario) {
            setFormData({
                nombre: usuario.nombre || '',
                usuario: usuario.usuario || '',
                correo: usuario.correo || '',
                telefono: usuario.telefono || '',
                rfc: usuario.rfc || '',
                nss: usuario.nss || ''
            });
        }
    }, [usuario]);

    useEffect(() => {
        if (empleadoId) {
            fetchCredenciales(empleadoId);
        }
    }, [empleadoId]);

    useEffect(() => {
        fetchUsuario();
    }, [username]);

    const fetchUsuario = async () => {
        try {
            setLoading(true);
            setError(null);
            setEmpleadoId(null); // Resetear para evitar datos basura
            const token = localStorage.getItem('auth_token');

            const response = await fetch(`${API_URL}/api/usuarios/username/${username}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (result.success) {
                const userData = result.data;
                const esEmpleado = userData.es_empleado || userData.roles?.some(r => r.nombre === 'Empleado');
                userData.es_empleado = esEmpleado;

                setUsuario(userData);

                if (esEmpleado) {
                    let idEmpleadoEncontrado = userData.empleado_id || userData.id_empleado;
                    if (!idEmpleadoEncontrado && userData.rfc) {
                        try {
                            const empResponse = await fetch(`${API_URL}/api/empleados/buscar/rfc/${userData.rfc}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const empResult = await empResponse.json();
                            if (empResult.success && empResult.data) {
                                idEmpleadoEncontrado = empResult.data.id;
                            }
                        } catch (e) {
                            console.error("Error buscando ID de empleado por RFC", e);
                        }
                    }

                    if (idEmpleadoEncontrado) {
                        setEmpleadoId(idEmpleadoEncontrado);
                        await Promise.all([
                            fetchDispositivo(idEmpleadoEncontrado, token),
                            fetchEstadisticas(idEmpleadoEncontrado, token, { rango: 'siempre' }),
                            fetchHistorial(idEmpleadoEncontrado, token),
                            fetchHorario(idEmpleadoEncontrado, token)
                        ]);
                    }
                }
            } else {
                setError(result.message || 'Usuario no encontrado');
            }
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setError('Error al cargar los datos del usuario');
        } finally {
            setLoading(false);
        }
    };

    const fetchDispositivo = async (idEmpleado, token) => {
        try {
            const response = await fetch(`${API_URL}/api/movil?empleado_id=${idEmpleado}&es_activo=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                setDispositivo(result.data[0]);
            }
        } catch (err) {
            console.error('Error al cargar dispositivo:', err);
        }
    };

    const fetchEstadisticas = async (idEmpleado, token, filtros = {}) => {
        try {
            setLoadingStats(true);
            let url = `${API_URL}/api/reportes/estadisticas-empleado/${idEmpleado}`;

            const params = new URLSearchParams();

            if (filtros.rango === 'intervalo' && filtros.inicio && filtros.fin) {
                params.append('fecha_inicio', filtros.inicio);
                params.append('fecha_fin', filtros.fin);
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setEstadisticas(result.data);
            }
        } catch (err) {
            console.error('Error al cargar estadísticas:', err);
        } finally {
            setLoadingStats(false);
        }
    };

    const fetchHistorial = async (idEmpleado, token) => {
        try {
            const response = await fetch(`${API_URL}/api/reportes/detalle-asistencias?empleado_id=${idEmpleado}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                setHistorial(result.data.slice(0, 10));
            }
        } catch (err) {
            console.error('Error al cargar historial:', err);
        }
    };

    const fetchCredenciales = async (idEmpleado) => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/credenciales/empleado/${idEmpleado}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 404) {
                // Es normal si no tiene credenciales aun
                setCredenciales([]);
                return;
            }

            const result = await response.json();
            if (result.success) {
                setCredenciales(result.data);
            }
        } catch (err) {
            console.error('Error al cargar credenciales:', err);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('auth_token');

            // 1. Actualizar datos de usuario
            const userUpdate = {
                nombre: formData.nombre,
                usuario: formData.usuario,
                correo: formData.correo,
                telefono: formData.telefono,
                rfc: formData.rfc, // Si es empleado, el backend lo maneja
                nss: formData.nss,
                es_empleado: usuario.es_empleado // Mantener estado
            };

            const responseUser = await fetch(`${API_URL}/api/usuarios/${usuario.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userUpdate)
            });

            const resultUser = await responseUser.json();
            if (!resultUser.success) {
                throw new Error(resultUser.message || 'Error al actualizar usuario');
            }

            // 2. Actualizar PIN si se proporcionó
            if (newPin && empleadoId) {
                if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
                    throw new Error('El PIN debe ser numérico de 6 dígitos');
                }

                const responsePin = await fetch(`${API_URL}/api/credenciales/pin`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        empleado_id: empleadoId,
                        pin: newPin
                    })
                });
                const resultPin = await responsePin.json();
                if (!resultPin.success) {
                    throw new Error(resultPin.message || 'Error al actualizar PIN');
                }
            }

            // Recargar datos
            await fetchUsuario();
            setIsEditing(false);
            setNewPin('');

        } catch (err) {
            console.error('Error al guardar:', err);
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleActualizarEstadisticas = () => {
        if (!empleadoId) return;
        const token = localStorage.getItem('auth_token');
        fetchEstadisticas(empleadoId, token, {
            rango: rangoTiempo,
            inicio: fechaInicio,
            fin: fechaFin
        });
        // Cerrar el menú si está abierto
        setShowDateMenu(false);
    };

    const getInitials = (nombre) => {
        if (!nombre) return '?';
        const parts = nombre.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return nombre.substring(0, 2).toUpperCase();
    };

    const getEstadoBadge = (estado) => {
        const estados = {
            activo: { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', label: 'Activo' },
            baja: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', label: 'Baja' },
            suspendido: { dot: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', label: 'Suspendido' }
        };
        return estados[estado] || estados.activo;
    };

    const formatFecha = (fecha) => {
        if (!fecha) return 'Sin definir';
        return new Date(fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const chartData = useMemo(() => {
        if (!estadisticas?.asistencias) return [];
        const retardos = (parseInt(estadisticas.asistencias.retardos) || 0);
        return [
            { name: 'Puntuales', value: parseInt(estadisticas.asistencias.puntuales) || 0, color: COLORS.puntual },
            { name: 'Retardos', value: retardos, color: COLORS.retardo },
            { name: 'Faltas', value: parseInt(estadisticas.asistencias.faltas) || 0, color: COLORS.falta },
        ].filter(item => item.value > 0);
    }, [estadisticas]);

    if (loading) return <DynamicLoader text="Cargando perfil..." />;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

    const estadoBadge = getEstadoBadge(usuario?.estado_cuenta);
    const horarioConfig = usuario?.horario?.configuracion?.configuracion_semanal;



    // ... (rest of the component)

    const handleRegistrarManual = async (e) => {
        e.preventDefault();
        try {
            setManualLoading(true);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/asistencias/manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    empleado_id: empleadoId,
                    ...manualData
                })
            });
            const result = await response.json();
            if (result.success) {
                setAlertMsg('Asistencia registrada correctamente');
                setShowManualModal(false);
                // Recargar datos
                handleActualizarEstadisticas();
                fetchHistorial(empleadoId, token);
            } else {
                setAlertMsg(result.message || 'Error al registrar asistencia');
            }
        } catch (error) {
            console.error('Error:', error);
            setAlertMsg('Error al registrar asistencia');
        } finally {
            setManualLoading(false);
        }
    };

    // --- NUEVO: Helpers para calendario semanal ---
    const getWeekDays = (startDate) => {
        const days = [];
        const current = new Date(startDate);
        for (let i = 0; i < 7; i++) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    };

    const formatDateISO = (date) => date.toISOString().split('T')[0];
    const formatDayName = (date) => {
        const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        return days[date.getDay()];
    };

    const getTurnosDia = (date) => {
        if (!horarioEmpleado) return [];
        const dayName = formatDayName(date);

        if (horarioEmpleado.configuracion_semanal && horarioEmpleado.configuracion_semanal[dayName]) {
            return horarioEmpleado.configuracion_semanal[dayName];
        }

        if (horarioEmpleado.dias && horarioEmpleado.dias.includes(dayName)) {
            return horarioEmpleado.turnos || [];
        }
        return [];
    };

    const isBlockSelected = (dateStr, start, end) => {
        return selectedBlocks.some(b => b.date === dateStr && b.start === start && b.end === end);
    };

    const toggleBlock = (dateStr, start, end) => {
        if (isBlockSelected(dateStr, start, end)) {
            setSelectedBlocks(prev => prev.filter(b => !(b.date === dateStr && b.start === start && b.end === end)));
        } else {
            setSelectedBlocks(prev => [...prev, { date: dateStr, start, end }]);
        }
    };

    const handleRegisterBatch = async () => {
        if (selectedBlocks.length === 0) return;
        setManualLoading(true);
        const token = localStorage.getItem('auth_token');
        let successCount = 0;
        let errors = [];

        for (const block of selectedBlocks) {
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/api/asistencias/manual`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        empleado_id: empleadoId,
                        fecha: block.date,
                        hora_entrada: block.start,
                        hora_salida: block.end,
                        usar_horario: false, // We pass specific times
                        motivo: 'Asistencia manual en lote'
                    })
                });
                const result = await response.json();
                if (result.success) successCount++;
                else errors.push(`${block.date}: ${result.message}`);
            } catch (err) {
                errors.push(`${block.date}: Error de red`);
            }
        }

        setManualLoading(false);
        if (successCount > 0) {
            setAlertMsg(`Se registraron ${successCount} asistencias correctamente.`);
            setShowManualModal(false);
            fetchHistorial(empleadoId, token);
            fetchEstadisticas(empleadoId, token, { rango: rangoTiempo });
        }
        if (errors.length > 0) {
            setAlertMsg(`Errores:\n${errors.join('\n')}`);
        }
    };

    const changeWeek = (offset) => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + (offset * 7));
        setCurrentWeekStart(newStart);
    };

    // ... (rest of render)

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Modal de Asistencia Manual */}
            {showManualModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Registrar Asistencia Manual
                            </h3>

                        </div>


                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                                    <FiChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                    Semana del {currentWeekStart.toLocaleDateString()}
                                </span>
                                <button onClick={() => changeWeek(1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                                    <FiChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-2 min-w-[600px] overflow-x-auto">
                                {getWeekDays(currentWeekStart).map((date, i) => {
                                    const dateStr = formatDateISO(date);
                                    const dayName = formatDayName(date);
                                    const turnos = getTurnosDia(date);

                                    const now = new Date();
                                    const isToday = dateStr === formatDateISO(now);
                                    const isFuture = date > new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

                                    return (
                                        <div key={i} className={`flex flex-col gap-2 p-2 rounded-lg border ${isToday ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 border-gray-100 dark:bg-gray-700/30 dark:border-gray-700'}`}>
                                            <div className="text-center mb-1">
                                                <div className="text-xs font-bold text-gray-500 uppercase">{dayName.substring(0, 3)}</div>
                                                <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : isFuture ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {date.getDate()}
                                                </div>
                                            </div>

                                            {turnos.length > 0 ? (
                                                turnos.map((t, idx) => {
                                                    const isSelected = isBlockSelected(dateStr, t.inicio || t.entrada, t.fin || t.salida);
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => !isFuture && toggleBlock(dateStr, t.inicio || t.entrada, t.fin || t.salida)}
                                                            disabled={isFuture}
                                                            className={`text-xs p-2 rounded border transition-all text-center ${isFuture
                                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500'
                                                                : isSelected
                                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-blue-400'
                                                                }`}
                                                        >
                                                            {t.inicio || t.entrada} - {t.fin || t.salida}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-xs text-gray-400 text-center py-4 italic">Sin turno</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowManualModal(false)}
                                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRegisterBatch}
                                    disabled={manualLoading || selectedBlocks.length === 0}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm font-medium"
                                >
                                    {manualLoading ? 'Procesando...' : `Registrar ${selectedBlocks.length} Asistencias`}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">
                    <FiArrowLeft className="w-5 h-5" /> Volver
                </button>

                <div className="flex gap-2">


                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <FiEdit2 className="w-4 h-4" /> Editar Perfil
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setNewPin('');
                                    setFormData({
                                        nombre: usuario.nombre || '',
                                        usuario: usuario.usuario || '',
                                        correo: usuario.correo || '',
                                        telefono: usuario.telefono || '',
                                        rfc: usuario.rfc || '',
                                        nss: usuario.nss || ''
                                    });
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium"
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <FiRefreshCw className="w-4 h-4 animate-spin" /> Guardando...
                                    </>
                                ) : (
                                    <>
                                        <FiSave className="w-4 h-4" /> Guardar Cambios
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* COLUMNA IZQUIERDA */}
                <div className="lg:col-span-4 space-y-6 w-full lg:sticky lg:top-6 lg:h-[calc(100vh-100px)] overflow-y-auto pr-2 pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="card p-0 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-start gap-5">
                                <div className="flex-shrink-0">
                                    {usuario?.foto ? (
                                        <img src={usuario.foto} alt={usuario.nombre} className="w-20 h-20 rounded-full object-cover border border-gray-200 dark:border-gray-600 shadow-sm" />
                                    ) : (
                                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl border border-blue-100 dark:border-blue-800 shadow-sm">
                                            {getInitials(usuario?.nombre)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap w-full">
                                        {isEditing ? (
                                            <div className="w-full mb-2">
                                                <input
                                                    type="text"
                                                    value={formData.nombre}
                                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Nombre completo"
                                                />
                                            </div>
                                        ) : (
                                            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight truncate">{usuario?.nombre}</h1>
                                        )}
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${estadoBadge.bg} ${estadoBadge.text} border-transparent`}>
                                            {estadoBadge.label}
                                        </span>
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.usuario}
                                            onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                                            className="w-full px-3 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Usuario"
                                        />
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">@{usuario?.usuario}</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                <div className="flex items-center gap-3 text-sm group">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400"><FiMail className="w-4 h-4" /></div>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={formData.correo}
                                            onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                                            className="w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Correo electrónico"
                                        />
                                    ) : (
                                        <span className="text-gray-600 dark:text-gray-300 truncate">{usuario?.correo || 'Sin correo'}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm group">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400"><FiPhone className="w-4 h-4" /></div>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            value={formData.telefono}
                                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                            className="w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Teléfono"
                                        />
                                    ) : (
                                        <span className="text-gray-600 dark:text-gray-300">{usuario?.telefono || 'Sin teléfono'}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm group">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400"><FiCalendar className="w-4 h-4" /></div>
                                    <span className="text-gray-600 dark:text-gray-300">Registrado: {formatFecha(usuario?.fecha_registro)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {usuario?.es_empleado && (
                        <div className="card p-5">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                                <FiFileText className="w-4 h-4 text-blue-500" /> Datos Laborales
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">RFC</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.rfc}
                                            onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                                            className="w-32 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm font-mono text-right focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="RFC"
                                        />
                                    ) : (
                                        <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">{usuario?.rfc || 'N/A'}</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">NSS</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.nss}
                                            onChange={(e) => setFormData({ ...formData, nss: e.target.value })}
                                            className="w-32 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm font-mono text-right focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="NSS"
                                        />
                                    ) : (
                                        <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">{usuario?.nss || 'N/A'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {usuario?.es_empleado && (
                        <div className="card p-5">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                                <FiLock className="w-4 h-4 text-purple-500" /> Credenciales de Acceso
                            </h3>
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1 py-2 border-b border-gray-50 dark:border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">PIN de Acceso</span>
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="password"
                                                    value={newPin}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                        setNewPin(val);
                                                    }}
                                                    className="w-32 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm font-mono text-center focus:ring-2 focus:ring-purple-500 outline-none"
                                                    placeholder="Nuevo PIN"
                                                />
                                            </div>
                                        ) : (
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${credenciales.tiene_pin ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'}`}>
                                                {credenciales.tiene_pin ? 'Configurado' : 'No configurado'}
                                            </span>
                                        )}
                                    </div>
                                    {isEditing && <span className="text-xs text-gray-400">Ingrese 6 dígitos para cambiar. Dejar vacío para mantener.</span>}
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Huella Dactilar</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${credenciales.tiene_dactilar ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'}`}>
                                            {credenciales.tiene_dactilar ? 'Registrada' : 'No registrada'}
                                        </span>
                                        {isEditing && <span className="text-xs text-gray-400 italic hidden sm:inline">(Solo lectura)</span>}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Reconocimiento Facial</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${credenciales.tiene_facial ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'}`}>
                                            {credenciales.tiene_facial ? 'Registrado' : 'No registrado'}
                                        </span>
                                        {isEditing && <span className="text-xs text-gray-400 italic hidden sm:inline">(Solo lectura)</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card p-5">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                            <FiShield className="w-4 h-4 text-blue-500" /> Roles
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {usuario?.roles && usuario.roles.length > 0 ? (
                                usuario.roles.map((rol, i) => (
                                    <span key={i} className={`px-3 py-1 text-xs font-medium rounded-lg border ${rol.es_admin ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
                                        {rol.nombre}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-gray-400 italic">Sin roles</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="lg:col-span-8 space-y-6 w-full lg:h-[calc(100vh-100px)] overflow-y-auto pr-2 pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                    {/* APARTADO ESTADÍSTICAS */}
                    {usuario?.es_empleado && (
                        <div className="card p-0 overflow-visible relative z-10">

                            {/* HEADER COMBINADO */}
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
                                    <FiActivity className="w-5 h-5 text-blue-600" /> Desempeño y Asistencia
                                </h2>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowManualModal(true)}
                                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
                                    >
                                        <FiCheckCircle className="w-4 h-4" /> Registrar Asistencia
                                    </button>
                                    <button
                                        onClick={() => setShowManualModal(true)}
                                        className="sm:hidden p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
                                        title="Registrar Asistencia"
                                    >
                                        <FiCheckCircle className="w-4 h-4" />
                                    </button>
                                    <div className="relative w-full md:w-48">
                                        <select
                                            value={rangoTiempo}
                                            onChange={(e) => setRangoTiempo(e.target.value)}
                                            className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm appearance-none"
                                        >
                                            <option value="siempre">Histórico Completo</option>
                                            <option value="intervalo">Intervalo de Fechas</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <FiFilter className="w-4 h-4" />
                                        </div>
                                    </div>

                                    {rangoTiempo === 'intervalo' && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowDateMenu(!showDateMenu)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 shadow-sm whitespace-nowrap"
                                            >
                                                <FiCalendar className="w-4 h-4 text-gray-500" />
                                                <span className="hidden sm:inline">
                                                    {fechaInicio && fechaFin ? `${fechaInicio} - ${fechaFin}` : 'Seleccionar fechas'}
                                                </span>
                                                <span className="sm:hidden">Fechas</span>
                                                <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDateMenu ? 'rotate-180' : ''}`} />
                                            </button>

                                            {showDateMenu && (
                                                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 p-4 animate-in fade-in zoom-in-95 duration-100">
                                                    <div className="space-y-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Desde</label>
                                                            <input
                                                                type="date"
                                                                value={fechaInicio}
                                                                onChange={(e) => setFechaInicio(e.target.value)}
                                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Hasta</label>
                                                            <input
                                                                type="date"
                                                                value={fechaFin}
                                                                onChange={(e) => setFechaFin(e.target.value)}
                                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={handleActualizarEstadisticas}
                                                            disabled={loadingStats}
                                                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex justify-center items-center gap-2"
                                                        >
                                                            {loadingStats ? 'Cargando...' : 'Aplicar Filtro'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Botón de recarga simple si no es intervalo, o visual feedback */}
                                    {rangoTiempo === 'siempre' && (
                                        <button
                                            onClick={handleActualizarEstadisticas}
                                            disabled={loadingStats}
                                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Actualizar datos"
                                        >
                                            <FiRefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* CONTENIDO */}
                            <div className="p-6 relative z-0">
                                {estadisticas ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800">
                                                    <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase mb-1">Puntuales</p>
                                                    <div className="flex items-end justify-between">
                                                        <span className="text-xl font-bold text-green-700 dark:text-green-300">{estadisticas.asistencias?.puntuales || 0}</span>
                                                        <FiCheckCircle className="w-4 h-4 text-green-400" />
                                                    </div>
                                                </div>
                                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800">
                                                    <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase mb-1">Faltas</p>
                                                    <div className="flex items-end justify-between">
                                                        <span className="text-xl font-bold text-red-700 dark:text-red-300">{estadisticas.asistencias?.faltas || 0}</span>
                                                        <FiXCircle className="w-4 h-4 text-red-400" />
                                                    </div>
                                                </div>
                                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl border border-yellow-100 dark:border-yellow-800">
                                                    <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold uppercase mb-1">Retardos</p>
                                                    <div className="flex items-end justify-between">
                                                        <span className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{estadisticas.asistencias?.retardos || 0}</span>
                                                        <FiAlertTriangle className="w-4 h-4 text-yellow-400" />
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Total</p>
                                                    <div className="flex items-end justify-between">
                                                        <span className="text-xl font-bold text-gray-700 dark:text-gray-300">{estadisticas.asistencias?.total || 0}</span>
                                                        <FiActivity className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>

                                            {chartData.length > 0 ? (
                                                <div className="w-full relative" style={{ height: 160 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={chartData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={35}
                                                                outerRadius={55}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                {chartData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <RechartsTooltip />
                                                            <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="h-40 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs italic bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                                    Sin datos de asistencia aún
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full">
                                            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Historial Reciente</h3>
                                            </div>
                                            <div className="flex-1 overflow-y-auto max-h-[250px] p-0">
                                                {historial.length > 0 ? (
                                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                            {historial.map((registro, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                                                                        {new Date(registro.fecha_registro).toLocaleDateString()}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">
                                                                        {formatTime(registro.fecha_registro)}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                                                        {(() => {
                                                                            const e = registro.estado;
                                                                            const map = {
                                                                                puntual: { cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Puntual' },
                                                                                aprobado: { cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Aprobado' },
                                                                                salida_puntual: { cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Salida puntual' },
                                                                                salida_temprana: { cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Salida temprana' },
                                                                                retardo: { cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Retardo' },
                                                                                retardo_a: { cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', label: 'Retardo A' },
                                                                                retardo_b: { cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', label: 'Retardo B' },
                                                                                falta: { cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Falta' },
                                                                                falta_por_retardo: { cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Falta (retardos)' },
                                                                            };
                                                                            const info = map[e] || { cls: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: e };
                                                                            return (
                                                                                <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full ${info.cls}`}>
                                                                                    {info.label}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                                                        <FiClock className="w-6 h-6 mb-2 opacity-50" />
                                                        <p className="text-xs">Sin registros</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-400">
                                        <div className="animate-pulse flex flex-col items-center">
                                            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                                            <div className="h-3 w-24 bg-gray-200 rounded"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Horario semanal */}
                    {usuario?.es_empleado && (
                        <div className="card p-0">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900/30">
                                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FiClock className="w-5 h-5 text-blue-600" /> Horario Semanal
                                </h2>
                                {usuario?.horario ? (
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${usuario.horario.es_activo ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                        {usuario.horario.es_activo ? 'VIGENTE' : 'INACTIVO'}
                                    </span>
                                ) : null}
                            </div>

                            <div className="p-6">
                                {usuario?.horario && horarioConfig ? (
                                    <>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <FiCalendar className="w-4 h-4 text-blue-500" />
                                            <span>Periodo: <span className="font-medium text-gray-900">{formatFecha(usuario.horario.fecha_inicio)}</span></span>
                                            {usuario.horario.fecha_fin && <span> al <span className="font-medium text-gray-900">{formatFecha(usuario.horario.fecha_fin)}</span></span>}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {DIAS_SEMANA.map((dia) => {
                                                const turnos = horarioConfig[dia.key] || [];
                                                const tieneTurnos = turnos.length > 0;
                                                return (
                                                    <div key={dia.key} className={`p-3 rounded-xl border ${tieneTurnos ? 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700' : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800'}`}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className={`text-sm font-bold ${tieneTurnos ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>{dia.label}</span>
                                                            {!tieneTurnos && <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Descanso</span>}
                                                        </div>
                                                        <div className="space-y-1">
                                                            {tieneTurnos ? turnos.map((turno, idx) => (
                                                                <div key={idx} className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1.5 rounded-md flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                                    {formatTime(turno.inicio)} - {formatTime(turno.fin)}
                                                                </div>
                                                            )) : (
                                                                <div className="h-6"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-10 text-gray-400">
                                        <FiClock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No se ha configurado un horario para este empleado.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── EQUIVALENCIAS DE RETARDOS (Reglamento Art. 80) ── */}
                    {usuario?.es_empleado && empleadoId && (
                        <EquivalenciasPanel empleadoId={empleadoId} />
                    )}

                    {/* Dispositivo Asignado */}
                    {usuario?.es_empleado && (
                        <div className="card p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900/30">
                                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FiSmartphone className="w-5 h-5 text-blue-600" /> Dispositivo Móvil
                                </h2>
                                {dispositivo ? (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                                        <FiUserCheck className="w-3.5 h-3.5" /> ASIGNADO
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">SIN DISPOSITIVO</span>
                                )}
                            </div>

                            {dispositivo ? (
                                <div className="p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <AiFillAndroid className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Sistema Operativo</p>
                                                    <p className="font-bold text-gray-900 dark:text-white text-lg">{dispositivo.sistema_operativo}</p>
                                                </div>
                                            </div>
                                            {dispositivo.es_root && (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-md border border-red-100">
                                                    <FiAlertCircle className="w-3 h-3" /> ACCESO ROOT DETECTADO
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <FiWifi className="w-4 h-4" /> IP
                                                </div>
                                                <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{dispositivo.ip || '--'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <FiCpu className="w-4 h-4" /> MAC
                                                </div>
                                                <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{dispositivo.mac || '--'}</span>
                                            </div>
                                            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <FiCalendar className="w-3 h-3" /> Asignado
                                                </div>
                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatFecha(dispositivo.fecha_registro)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-400">
                                    <FiSmartphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No tiene un dispositivo móvil vinculado actualmente.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Alertas Personalizadas */}
            {alertMsg && (
                <ConfirmBox
                    message={alertMsg}
                    onConfirm={() => setAlertMsg(null)}
                />
            )}
        </div>
    );
};

/**
 * Panel de Equivalencias de Retardos (Reglamento Art. 80)
 * Muestra los retardos A/B del mes actual, cuántos faltan para generar una falta
 * y las notas malas acumuladas.
 */
const EquivalenciasPanel = ({ empleadoId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        const finMes = hoy.toISOString().split('T')[0];

        fetch(`${API_URL}/api/asistencias/empleado/${empleadoId}/equivalencias?inicio=${inicioMes}&fin=${finMes}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(r => { if (r.success) setData(r.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [empleadoId]);

    if (loading) return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}
            </div>
        </div>
    );

    if (!data) return null;

    const eqA = data.configuracion_equivalencias.retardos_a_por_falta;  // 10
    const eqB = data.configuracion_equivalencias.retardos_b_por_falta;   // 5
    const notasMalas = data.notas_malas_acumuladas;
    const notasParaSuspension = 5;

    // Barra: cuántos RetA restan para la próxima falta
    const restantesA = data.desglose_equivalencias.retardos_a_restantes;
    const restantesB = data.desglose_equivalencias.retardos_b_restantes;

    const mesActual = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-100 dark:border-orange-900/30">
            {/* Header */}
            <div className="px-6 py-4 border-b border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiAlertTriangle className="w-5 h-5 text-orange-500" />
                    Equivalencias Art. 80 — {mesActual}
                </h2>
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-md uppercase tracking-wide">Reglamento RRHH</span>
            </div>

            <div className="p-6 space-y-5">

                {/* Contadores principales */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Retardo A */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase mb-1">Retardo A</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{data.retardos_a}</span>
                            <span className="text-xs text-amber-500">/{eqA} = falta</span>
                        </div>
                        <p className="text-[10px] text-amber-500 mt-1">11–20 min tarde</p>
                    </div>

                    {/* Retardo B */}
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800">
                        <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase mb-1">Retardo B</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">{data.retardos_b}</span>
                            <span className="text-xs text-orange-500">/{eqB} = falta</span>
                        </div>
                        <p className="text-[10px] text-orange-500 mt-1">21–29 min tarde</p>
                    </div>

                    {/* Faltas equivalentes */}
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800">
                        <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase mb-1">Faltas equiv.</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-red-700 dark:text-red-300">{data.faltas_equivalentes_por_retardos}</span>
                            <FiXCircle className="w-4 h-4 text-red-400" />
                        </div>
                        <p className="text-[10px] text-red-500 mt-1">Por acumulación</p>
                    </div>

                    {/* Notas malas */}
                    <div className={`p-3 rounded-xl border ${notasMalas >= notasParaSuspension ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700' : 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800'}`}>
                        <p className={`text-[10px] font-bold uppercase mb-1 ${notasMalas >= notasParaSuspension ? 'text-red-600' : 'text-purple-600 dark:text-purple-400'}`}>
                            Notas Malas
                        </p>
                        <div className="flex items-end justify-between">
                            <span className={`text-2xl font-bold ${notasMalas >= notasParaSuspension ? 'text-red-700 dark:text-red-300' : 'text-purple-700 dark:text-purple-300'}`}>
                                {notasMalas}
                            </span>
                            <span className="text-xs text-purple-400">/{notasParaSuspension} susp.</span>
                        </div>
                        <p className={`text-[10px] mt-1 ${notasMalas >= notasParaSuspension ? 'text-red-600 font-semibold' : 'text-purple-500'}`}>
                            {notasMalas >= notasParaSuspension ? '⚠️ Suspensión' : 'Art. 80a/80b'}
                        </p>
                    </div>
                </div>

                {/* Barras de progreso */}
                <div className="space-y-3">
                    {/* Progreso Retardo A */}
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Retardo A: {restantesA}/{eqA} para próxima falta</span>
                            <span className="font-medium">{Math.round((restantesA / eqA) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${(restantesA / eqA) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Progreso Retardo B */}
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Retardo B: {restantesB}/{eqB} para próxima falta</span>
                            <span className="font-medium">{Math.round((restantesB / eqB) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-orange-400 rounded-full transition-all duration-500"
                                style={{ width: `${(restantesB / eqB) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Notas malas → Suspensión */}
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Notas malas: {notasMalas}/{notasParaSuspension} para suspensión</span>
                            <span className="font-medium">{Math.min(Math.round((notasMalas / notasParaSuspension) * 100), 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${notasMalas >= notasParaSuspension ? 'bg-red-500' : 'bg-purple-400'}`}
                                style={{ width: `${Math.min((notasMalas / notasParaSuspension) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Totales de faltas */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{data.faltas_directas}</span> faltas directas ·{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">{data.faltas_por_acumulacion_sistema}</span> generadas por sistema
                    </div>
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-lg">
                        Total faltas: {data.faltas_totales}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerfilUsuario;
