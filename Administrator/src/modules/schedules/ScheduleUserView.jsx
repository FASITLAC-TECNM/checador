import { useState, useMemo } from 'react';
import { User, Clock, Calendar, ChevronDown, ChevronRight, Edit2, Trash2, Plus } from 'lucide-react';

const ScheduleUserView = ({ schedules, usuarios, onAddSchedule, onEditSchedule, onDeleteSchedule }) => {
    const [expandedUsers, setExpandedUsers] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const diasSemanaMap = {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
    };

    const diasOrden = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    // Agrupar schedules por usuario
    const schedulesPorUsuario = useMemo(() => {
        const agrupados = {};

        usuarios.forEach(usuario => {
            const bloquesUsuario = schedules.filter(s => s.id_usuario === usuario.id);
            if (bloquesUsuario.length > 0 || searchTerm === '') {
                agrupados[usuario.id] = {
                    usuario,
                    bloques: bloquesUsuario
                };
            }
        });

        return agrupados;
    }, [schedules, usuarios, searchTerm]);

    // Filtrar usuarios por búsqueda
    const usuariosFiltrados = useMemo(() => {
        if (!searchTerm) return Object.values(schedulesPorUsuario);

        return Object.values(schedulesPorUsuario).filter(({ usuario, bloques }) => {
            const matchNombre = usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchUsername = usuario.username.toLowerCase().includes(searchTerm.toLowerCase());
            const matchDescripcion = bloques.some(b =>
                b.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            return matchNombre || matchUsername || matchDescripcion;
        });
    }, [schedulesPorUsuario, searchTerm]);

    const toggleUserExpansion = (userId) => {
        const newExpanded = new Set(expandedUsers);
        if (newExpanded.has(userId)) {
            newExpanded.delete(userId);
        } else {
            newExpanded.add(userId);
        }
        setExpandedUsers(newExpanded);
    };

    const expandAll = () => {
        const allIds = new Set(usuarios.map(u => u.id));
        setExpandedUsers(allIds);
    };

    const collapseAll = () => {
        setExpandedUsers(new Set());
    };

    // Calcular estadísticas por usuario
    const calcularEstadisticas = (bloques) => {
        const totalBloques = bloques.length;
        const horasTotales = bloques.reduce((acc, bloque) => {
            const [hI, mI] = bloque.hora_inicio.split(':').map(Number);
            const [hF, mF] = bloque.hora_fin.split(':').map(Number);
            const duracion = (hF * 60 + mF) - (hI * 60 + mI);
            return acc + duracion;
        }, 0);

        const diasUnicos = new Set(bloques.map(b => b.dia_semana)).size;

        return {
            totalBloques,
            horasTotales: Math.round(horasTotales / 60 * 10) / 10,
            diasUnicos
        };
    };

    // Agrupar bloques por día
    const agruparBloquesPorDia = (bloques) => {
        const agrupados = {};
        diasOrden.forEach(dia => {
            const bloquesDia = bloques.filter(b => b.dia_semana === dia);
            if (bloquesDia.length > 0) {
                agrupados[dia] = bloquesDia.sort((a, b) => {
                    return a.hora_inicio.localeCompare(b.hora_inicio);
                });
            }
        });
        return agrupados;
    };

    if (usuariosFiltrados.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-20 h-20 bg-[#F5F5F7] rounded-full flex items-center justify-center mb-4">
                    <User className="w-10 h-10 text-[#86868B]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
                    No se encontraron usuarios
                </h3>
                <p className="text-[#6E6E73] text-center max-w-md">
                    {searchTerm ? 'Intenta con otro término de búsqueda' : 'No hay usuarios con horarios asignados'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Barra de búsqueda y controles */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-[#D2D2D7]">
                <div className="flex items-center justify-between gap-4">
                    <input
                        type="text"
                        placeholder="Buscar por nombre de usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B]"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={expandAll}
                            className="px-3 py-2 text-sm bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors font-medium"
                        >
                            Expandir Todo
                        </button>
                        <button
                            onClick={collapseAll}
                            className="px-3 py-2 text-sm bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors font-medium"
                        >
                            Contraer Todo
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de usuarios con sus horarios */}
            <div className="space-y-3">
                {usuariosFiltrados.map(({ usuario, bloques }) => {
                    const isExpanded = expandedUsers.has(usuario.id);
                    const stats = calcularEstadisticas(bloques);
                    const bloquesPorDia = agruparBloquesPorDia(bloques);

                    return (
                        <div
                            key={usuario.id}
                            className="bg-white rounded-xl shadow-sm border border-[#D2D2D7] overflow-hidden"
                        >
                            {/* Header del usuario */}
                            <div
                                className="p-5 cursor-pointer hover:bg-[#F5F5F7] transition-colors"
                                onClick={() => toggleUserExpansion(usuario.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button className="text-[#6E6E73] hover:text-[#1D1D1F]">
                                            {isExpanded ? (
                                                <ChevronDown size={20} />
                                            ) : (
                                                <ChevronRight size={20} />
                                            )}
                                        </button>

                                        {/* Avatar */}
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                                            {usuario.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                        </div>

                                        {/* Info del usuario */}
                                        <div>
                                            <h3 className="text-lg font-semibold text-[#1D1D1F]">
                                                {usuario.nombre}
                                            </h3>
                                            <p className="text-sm text-[#6E6E73]">
                                                @{usuario.username}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Estadísticas */}
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {stats.totalBloques}
                                            </div>
                                            <div className="text-xs text-[#6E6E73]">Bloques</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {stats.horasTotales}h
                                            </div>
                                            <div className="text-xs text-[#6E6E73]">Horas/semana</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {stats.diasUnicos}
                                            </div>
                                            <div className="text-xs text-[#6E6E73]">Días</div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddSchedule && onAddSchedule(usuario);
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                                        >
                                            <Plus size={16} />
                                            Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Contenido expandible */}
                            {isExpanded && (
                                <div className="border-t border-[#E5E5E7] bg-[#FBFBFD] p-5">
                                    <div className="space-y-4">
                                        {Object.entries(bloquesPorDia).map(([dia, bloquesDia]) => (
                                            <div key={dia}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Calendar size={16} className="text-[#6E6E73]" />
                                                    <h4 className="font-semibold text-[#1D1D1F]">
                                                        {diasSemanaMap[dia]}
                                                    </h4>
                                                    <span className="text-xs text-[#6E6E73]">
                                                        ({bloquesDia.length} bloque{bloquesDia.length !== 1 ? 's' : ''})
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {bloquesDia.map(bloque => (
                                                        <div
                                                            key={bloque.id}
                                                            className="bg-white rounded-lg border border-[#E5E5E7] p-4 hover:shadow-md transition-all"
                                                        >
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div
                                                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                                    style={{ backgroundColor: `${bloque.color}20` }}
                                                                >
                                                                    <Clock
                                                                        size={20}
                                                                        style={{ color: bloque.color }}
                                                                    />
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => onEditSchedule && onEditSchedule(bloque)}
                                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => onDeleteSchedule && onDeleteSchedule(bloque.id)}
                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <Clock size={14} className="text-[#6E6E73]" />
                                                                    <span className="font-semibold text-[#1D1D1F]">
                                                                        {bloque.hora_inicio} - {bloque.hora_fin}
                                                                    </span>
                                                                </div>

                                                                {bloque.descripcion && (
                                                                    <p className="text-xs text-[#6E6E73] line-clamp-2">
                                                                        {bloque.descripcion}
                                                                    </p>
                                                                )}

                                                                <div className="mt-2 pt-2 border-t border-[#E5E5E7]">
                                                                    <span className="text-xs text-[#6E6E73]">
                                                                        Duración: {(() => {
                                                                            const [hI, mI] = bloque.hora_inicio.split(':').map(Number);
                                                                            const [hF, mF] = bloque.hora_fin.split(':').map(Number);
                                                                            const duracion = (hF * 60 + mF) - (hI * 60 + mI);
                                                                            const horas = Math.floor(duracion / 60);
                                                                            const minutos = duracion % 60;
                                                                            return `${horas}h ${minutos}min`;
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {bloques.length === 0 && (
                                            <p className="text-center text-[#6E6E73] py-4">
                                                Este usuario no tiene horarios asignados
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ScheduleUserView;
