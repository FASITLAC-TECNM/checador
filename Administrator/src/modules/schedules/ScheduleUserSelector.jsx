import { useState, useMemo } from 'react';
import { Search, User, Clock, Calendar } from 'lucide-react';

const ScheduleUserSelector = ({ usuarios, schedules, onSelectUser }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Calcular estadísticas por usuario
    const usuariosConStats = useMemo(() => {
        return usuarios.map(usuario => {
            const bloquesUsuario = schedules.filter(s => s.id_usuario === usuario.id);
            const horasTotales = bloquesUsuario.reduce((acc, bloque) => {
                const [hI, mI] = bloque.hora_inicio.split(':').map(Number);
                const [hF, mF] = bloque.hora_fin.split(':').map(Number);
                const duracion = (hF * 60 + mF) - (hI * 60 + mI);
                return acc + duracion;
            }, 0);

            const diasUnicos = new Set(bloquesUsuario.map(b => b.dia_semana)).size;

            return {
                ...usuario,
                totalBloques: bloquesUsuario.length,
                horasTotales: Math.round(horasTotales / 60 * 10) / 10,
                diasActivos: diasUnicos
            };
        });
    }, [usuarios, schedules]);

    // Filtrar usuarios
    const usuariosFiltrados = useMemo(() => {
        if (!searchTerm) return usuariosConStats;

        return usuariosConStats.filter(usuario => {
            const matchNombre = usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchUsername = usuario.username.toLowerCase().includes(searchTerm.toLowerCase());
            const matchEmail = usuario.email?.toLowerCase().includes(searchTerm.toLowerCase());

            return matchNombre || matchUsername || matchEmail;
        });
    }, [usuariosConStats, searchTerm]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2">Seleccionar Usuario</h2>
                <p className="text-[#6E6E73]">Elige un usuario para gestionar sus horarios semanales</p>
            </div>

            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6E6E73]" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nombre, username o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B] shadow-sm"
                />
            </div>

            {/* Grid de usuarios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {usuariosFiltrados.map(usuario => (
                    <div
                        key={usuario.id}
                        onClick={() => onSelectUser(usuario)}
                        className="bg-white rounded-xl border border-[#E5E5E7] p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
                    >
                        {/* Header del usuario */}
                        <div className="flex items-center gap-3 mb-4">
                            {/* Avatar */}
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                                {usuario.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>

                            {/* Info básica */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-[#1D1D1F] truncate group-hover:text-blue-600 transition-colors">
                                    {usuario.nombre}
                                </h3>
                                <p className="text-sm text-[#6E6E73] truncate">@{usuario.username}</p>
                            </div>
                        </div>

                        {/* Estadísticas */}
                        <div className="space-y-2 pt-3 border-t border-[#E5E5E7]">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[#6E6E73] flex items-center gap-1.5">
                                    <Clock size={14} />
                                    Bloques
                                </span>
                                <span className="font-semibold text-[#1D1D1F]">
                                    {usuario.totalBloques}
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[#6E6E73] flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    Horas/semana
                                </span>
                                <span className="font-semibold text-blue-600">
                                    {usuario.horasTotales}h
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[#6E6E73] flex items-center gap-1.5">
                                    <User size={14} />
                                    Días activos
                                </span>
                                <span className="font-semibold text-green-600">
                                    {usuario.diasActivos}/7
                                </span>
                            </div>
                        </div>

                        {/* Badge de estado */}
                        {usuario.totalBloques === 0 && (
                            <div className="mt-3 pt-3 border-t border-[#E5E5E7]">
                                <span className="inline-flex items-center text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded">
                                    Sin horarios asignados
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Mensaje si no hay resultados */}
            {usuariosFiltrados.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-20 h-20 bg-[#F5F5F7] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-10 h-10 text-[#86868B]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
                        No se encontraron usuarios
                    </h3>
                    <p className="text-[#6E6E73]">
                        Intenta con otro término de búsqueda
                    </p>
                </div>
            )}
        </div>
    );
};

export default ScheduleUserSelector;
