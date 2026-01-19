import { useState, useEffect } from 'react';
import { History, Filter, Download } from 'lucide-react';
import HistoryList from './HistoryList';
import { useNotification } from '../../context/NotificationContext';
import { obtenerEventosRecientes, exportarEventosCSV } from '../../services/eventosService';

const HistoryPage = () => {
    const notification = useNotification();
    const [filterType, setFilterType] = useState('todos');
    const [filterDate, setFilterDate] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Función para mapear tipo_evento a categoría del historial
    const mapearTipoEvento = (tipoEvento) => {
        const mapeo = {
            'notificacion': 'asistencia',
            'anuncio': 'asistencia',
            'alerta': 'asistencia',
            'recordatorio': 'asistencia'
        };
        return mapeo[tipoEvento] || 'asistencia';
    };

    // Función para mapear estado a acción
    const mapearAccion = (estado) => {
        if (typeof estado === 'boolean') {
            return estado ? 'Activo' : 'Inactivo';
        }
        const mapeo = {
            'Entrada': 'Registro de Entrada',
            'Salida': 'Registro de Salida',
            'Ambos': 'Registro'
        };
        return mapeo[estado] || 'Evento';
    };

    // Cargar eventos desde la BD
    useEffect(() => {
        cargarEventos();
    }, []);

    const cargarEventos = async () => {
        try {
            setLoading(true);
            const data = await obtenerEventosRecientes(100);
            setEventos(data);
        } catch (error) {
            console.error('Error al cargar eventos:', error);
            notification.error('Error', 'No se pudieron cargar los eventos del historial');
        } finally {
            setLoading(false);
        }
    };

    // Mapear eventos de BD a formato del historial
    const historyRecords = eventos.map(evento => ({
        id: evento.id,
        tipo: mapearTipoEvento(evento.tipo_evento),
        accion: mapearAccion(evento.estado),
        descripcion: evento.descripcion || evento.titulo,
        usuario: 'Sistema',
        fecha: evento.created_at || new Date().toISOString(),
        detalles: {
            titulo: evento.titulo,
            estado: evento.estado,
            tipo_evento: evento.tipo_evento
        }
    }));

    const filteredRecords = historyRecords.filter(record => {
        const matchesType = filterType === 'todos' || record.tipo === filterType;
        const matchesSearch =
            record.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.usuario.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesDate = true;
        if (filterDate !== 'todos') {
            const recordDate = new Date(record.fecha);
            const today = new Date();

            if (filterDate === 'hoy') {
                matchesDate = recordDate.toDateString() === today.toDateString();
            } else if (filterDate === 'semana') {
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = recordDate >= weekAgo;
            } else if (filterDate === 'mes') {
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                matchesDate = recordDate >= monthAgo;
            }
        }

        return matchesType && matchesSearch && matchesDate;
    });

    const handleExport = () => {
        if (filteredRecords.length === 0) {
            notification.warning('Sin datos', 'No hay eventos para exportar');
            return;
        }

        try {
            const eventosParaExportar = filteredRecords.map(record => ({
                id: record.id,
                titulo: record.detalles?.titulo || record.descripcion,
                descripcion: record.descripcion,
                estado: record.detalles?.estado || '',
                tipo_evento: record.detalles?.tipo_evento || '',
                created_at: record.fecha
            }));

            exportarEventosCSV(eventosParaExportar);
            notification.success('Exportado', 'El historial se exportó correctamente a CSV');
        } catch (error) {
            console.error('Error al exportar:', error);
            notification.error('Error', 'No se pudo exportar el historial');
        }
    };

    const getTipoStats = () => {
        const stats = {
            usuario: historyRecords.filter(r => r.tipo === 'usuario').length,
            rol: historyRecords.filter(r => r.tipo === 'rol').length,
            dispositivo: historyRecords.filter(r => r.tipo === 'dispositivo').length,
            departamento: historyRecords.filter(r => r.tipo === 'departamento').length,
            asistencia: historyRecords.filter(r => r.tipo === 'asistencia').length
        };
        return stats;
    };

    const stats = getTipoStats();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-[#6E6E73]">Cargando historial...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FBFBFD] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-[#1D1D1F] flex items-center gap-2">
                            <History size={32} />
                            Historial de Actividades
                        </h2>
                        <p className="text-[#6E6E73] mt-2">
                            Registro completo de todas las acciones realizadas en el sistema
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <Download size={20} />
                        Exportar
                    </button>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 border border-[#E5E5E7] shadow-sm">
                        <p className="text-[#86868B] text-xs uppercase mb-1">Usuarios</p>
                        <p className="text-2xl font-bold text-[#1D1D1F]">{stats.usuario}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[#E5E5E7] shadow-sm">
                        <p className="text-[#86868B] text-xs uppercase mb-1">Roles</p>
                        <p className="text-2xl font-bold text-[#1D1D1F]">{stats.rol}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[#E5E5E7] shadow-sm">
                        <p className="text-[#86868B] text-xs uppercase mb-1">Dispositivos</p>
                        <p className="text-2xl font-bold text-[#1D1D1F]">{stats.dispositivo}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[#E5E5E7] shadow-sm">
                        <p className="text-[#86868B] text-xs uppercase mb-1">Departamentos</p>
                        <p className="text-2xl font-bold text-[#1D1D1F]">{stats.departamento}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[#E5E5E7] shadow-sm">
                        <p className="text-[#86868B] text-xs uppercase mb-1">Asistencias</p>
                        <p className="text-2xl font-bold text-[#1D1D1F]">{stats.asistencia}</p>
                    </div>
                </div>

                {/* Filtros y búsqueda */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-[#D2D2D7]">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Buscar en el historial..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:outline-none focus:border-blue-600 transition-colors placeholder-[#86868B]"
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:outline-none focus:border-blue-600"
                        >
                            <option value="todos">Todos los tipos</option>
                            <option value="asistencia">Asistencias</option>
                            <option value="usuario">Usuarios</option>
                            <option value="rol">Roles</option>
                            <option value="dispositivo">Dispositivos</option>
                            <option value="departamento">Departamentos</option>
                        </select>
                        <select
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:outline-none focus:border-blue-600"
                        >
                            <option value="todos">Todo el tiempo</option>
                            <option value="hoy">Hoy</option>
                            <option value="semana">Última semana</option>
                            <option value="mes">Último mes</option>
                        </select>
                    </div>
                </div>

                {filteredRecords.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-[#D2D2D7]">
                        <History className="w-16 h-16 text-[#86868B] mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
                            No hay eventos en el historial
                        </h3>
                        <p className="text-[#86868B]">
                            {searchTerm || filterType !== 'todos' || filterDate !== 'todos'
                                ? 'No se encontraron eventos con los filtros aplicados'
                                : 'Los eventos aparecerán aquí cuando se registren'}
                        </p>
                    </div>
                ) : (
                    <HistoryList records={filteredRecords} />
                )}
            </div>
        </div>
    );
};

export default HistoryPage;