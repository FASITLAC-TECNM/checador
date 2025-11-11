import { useState } from 'react';
import { History, Filter, Download } from 'lucide-react';
import HistoryList from './HistoryList';

const HistoryPage = () => {
    const [filterType, setFilterType] = useState('todos');
    const [filterDate, setFilterDate] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');

    const historyRecords = [
        {
            id: 1,
            tipo: 'usuario',
            accion: 'Creación',
            descripcion: 'Se creó el usuario "Carlos Ramírez"',
            usuario: 'Admin',
            fecha: '2024-11-02T10:30:00',
            detalles: { nombre: 'Carlos Ramírez', rol: 'Supervisor' }
        },
        {
            id: 2,
            tipo: 'rol',
            accion: 'Edición',
            descripcion: 'Se modificaron los permisos del rol "Gerente"',
            usuario: 'Admin',
            fecha: '2024-11-02T09:15:00',
            detalles: { rol: 'Gerente', cambios: 'Permisos de usuarios' }
        },
        {
            id: 3,
            tipo: 'dispositivo',
            accion: 'Registro',
            descripcion: 'Se registró un nuevo dispositivo "Terminal Principal"',
            usuario: 'Admin',
            fecha: '2024-11-01T16:45:00',
            detalles: { dispositivo: 'Terminal Principal', tipo: 'Biométrico' }
        },
        {
            id: 4,
            tipo: 'usuario',
            accion: 'Eliminación',
            descripcion: 'Se eliminó el usuario "Juan Pérez"',
            usuario: 'Admin',
            fecha: '2024-11-01T14:20:00',
            detalles: { nombre: 'Juan Pérez', motivo: 'Baja de la empresa' }
        },
        {
            id: 5,
            tipo: 'departamento',
            accion: 'Creación',
            descripcion: 'Se creó el departamento "Marketing"',
            usuario: 'Admin',
            fecha: '2024-11-01T11:00:00',
            detalles: { departamento: 'Marketing', jefe: 'Ana López' }
        },
        {
            id: 6,
            tipo: 'asistencia',
            accion: 'Registro',
            descripcion: 'Entrada registrada para "María García"',
            usuario: 'Sistema',
            fecha: '2024-11-02T08:00:00',
            detalles: { empleado: 'María García', tipo: 'Entrada' }
        },
        {
            id: 7,
            tipo: 'rol',
            accion: 'Creación',
            descripcion: 'Se creó el rol "Técnico"',
            usuario: 'Admin',
            fecha: '2024-10-31T15:30:00',
            detalles: { rol: 'Técnico', permisos: 'Limitados' }
        },
        {
            id: 8,
            tipo: 'dispositivo',
            accion: 'Edición',
            descripcion: 'Se actualizó la configuración del dispositivo "Entrada RH"',
            usuario: 'Admin',
            fecha: '2024-10-31T12:00:00',
            detalles: { dispositivo: 'Entrada RH', cambios: 'IP y ubicación' }
        }
    ];

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
        alert('Exportando historial...\nEsta funcionalidad estará disponible próximamente.');
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
                            <option value="usuario">Usuarios</option>
                            <option value="rol">Roles</option>
                            <option value="dispositivo">Dispositivos</option>
                            <option value="departamento">Departamentos</option>
                            <option value="asistencia">Asistencias</option>
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

                <HistoryList records={filteredRecords} />
            </div>
        </div>
    );
};

export default HistoryPage;
