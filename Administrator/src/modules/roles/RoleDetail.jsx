import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Edit2, Shield, Users, Calendar,
    Check, X, Search, Mail, Phone, Building2,
    User, Clock, MapPin, UserPlus
} from 'lucide-react';
import { getUsuarios, obtenerRolesDeUsuario } from '../../services/api';
import AssignUsersModal from './AssignUsersModal';

const RoleDetail = ({ role, onClose, onEdit }) => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);

    // Cargar usuarios con este rol desde la BD
    useEffect(() => {
        cargarUsuariosDelRol();
    }, [role.id]);

    const cargarUsuariosDelRol = async () => {
        try {
            setLoading(true);
            const todosLosUsuarios = await getUsuarios();

            // Verificar qué usuarios tienen este rol asignado
            const usuariosConRol = [];
            for (const usuario of todosLosUsuarios) {
                try {
                    const roles = await obtenerRolesDeUsuario(usuario.id);
                    const tieneEsteRol = roles.some(r => r.id_rol === role.id);
                    if (tieneEsteRol) {
                        usuariosConRol.push(usuario);
                    }
                } catch (error) {
                    // Si hay error al obtener roles de un usuario, continuar con el siguiente
                    console.error(`Error obteniendo roles del usuario ${usuario.id}:`, error);
                }
            }

            setUsuarios(usuariosConRol);
        } catch (error) {
            console.error('Error al cargar usuarios del rol:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsuarios = usuarios.filter(user =>
        user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.departamento && user.departamento.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const modulos = [
        { id: 'usuarios', nombre: 'Usuarios' },
        { id: 'roles', nombre: 'Roles y Permisos' },
        { id: 'dispositivos', nombre: 'Dispositivos' },
        { id: 'asistencias', nombre: 'Asistencias' },
        { id: 'reportes', nombre: 'Reportes' },
        { id: 'configuracion', nombre: 'Configuración' }
    ];

    const permisos = [
        { id: 'ver', nombre: 'Ver' },
        { id: 'crear', nombre: 'Crear' },
        { id: 'editar', nombre: 'Editar' },
        { id: 'eliminar', nombre: 'Eliminar' }
    ];

    const getPermissionCount = () => {
        let count = 0;
        Object.values(role.permisos).forEach(modulo => {
            Object.values(modulo).forEach(permiso => {
                if (permiso) count++;
            });
        });
        return count;
    };

    const getInitials = (nombre) => {
        if (!nombre) return '??';
        const parts = nombre.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return nombre.substring(0, 2).toUpperCase();
    };

    const getEstadoColor = (activo) => {
        switch (activo) {
            case 'ACTIVO':
                return 'bg-green-50 text-green-600 border border-green-200';
            case 'SUSPENDIDO':
                return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
            case 'BAJA':
                return 'bg-red-50 text-red-600 border border-red-200';
            default:
                return 'bg-gray-50 text-gray-600 border border-gray-200';
        }
    };

    return (
        <>
            {showAssignModal && (
                <AssignUsersModal
                    role={role}
                    onClose={() => setShowAssignModal(false)}
                    onUpdate={cargarUsuariosDelRol}
                />
            )}
            <div className="min-h-screen bg-[#FBFBFD] p-6">
                <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-[#6E6E73] hover:text-[#1D1D1F] transition-colors mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Volver a Roles
                    </button>

                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div
                                className="w-16 h-16 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${role.color}20` }}
                            >
                                <Shield
                                    className="w-8 h-8"
                                    style={{ color: role.color }}
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold text-[#1D1D1F]">{role.nombre}</h1>
                                    {role.esDefault && (
                                        <span className="inline-flex items-center gap-1 text-sm text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                                            Rol por defecto
                                        </span>
                                    )}
                                </div>
                                <p className="text-[#6E6E73] mb-3">{role.descripcion}</p>
                                <div className="flex items-center gap-4 text-sm text-[#6E6E73]">
                                    <span className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {usuarios.length} usuarios
                                    </span>
                                    <span className="text-[#D2D2D7]">|</span>
                                    <span className="flex items-center gap-1">
                                        <Shield className="w-4 h-4" />
                                        {getPermissionCount()}/24 permisos
                                    </span>
                                    <span className="text-[#D2D2D7]">|</span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        Creado: {new Date(role.fechaCreacion).toLocaleDateString('es-MX')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-colors font-medium shadow-sm"
                        >
                            <Edit2 className="w-5 h-5" />
                            Editar Rol
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Permisos */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-sm p-5">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#1D1D1F]">
                                <Shield className="w-5 h-5" />
                                Permisos Asignados
                            </h2>
                            <div className="space-y-4">
                                {modulos.map((modulo) => {
                                    const permisosActivos = permisos.filter(p =>
                                        role.permisos[modulo.id][p.id]
                                    );

                                    if (permisosActivos.length === 0) return null;

                                    return (
                                        <div key={modulo.id} className="border-b border-[#E5E5E7] pb-3 last:border-0">
                                            <h3 className="text-sm font-medium text-[#1D1D1F] mb-2">
                                                {modulo.nombre}
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {permisosActivos.map((permiso) => (
                                                    <span
                                                        key={permiso.id}
                                                        className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                        {permiso.nombre}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Lista de Usuarios */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2 text-[#1D1D1F]">
                                    <Users className="w-5 h-5" />
                                    Usuarios con este Rol ({filteredUsuarios.length})
                                </h2>
                                <button
                                    onClick={() => setShowAssignModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-sm"
                                    style={{ backgroundColor: role.color }}
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Asignar Usuarios
                                </button>
                            </div>

                            {/* Buscador */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#86868B]" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, email o departamento..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Lista de usuarios */}
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="text-[#6E6E73]">Cargando usuarios...</div>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {filteredUsuarios.length > 0 ? (
                                        filteredUsuarios.map((usuario) => (
                                            <div
                                                key={usuario.id}
                                                className="bg-[#F5F5F7] rounded-lg p-4 border border-[#E5E5E7] hover:border-[#D2D2D7] hover:shadow-sm transition-all duration-200"
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Avatar */}
                                                    <div
                                                        className="w-12 h-12 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0"
                                                        style={{ backgroundColor: role.color }}
                                                    >
                                                        {getInitials(usuario.nombre)}
                                                    </div>

                                                    {/* Información */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <h3 className="font-medium text-[#1D1D1F] mb-0.5">
                                                                    {usuario.nombre}
                                                                </h3>
                                                                <p className="text-sm text-[#6E6E73]">
                                                                    {usuario.puesto || 'Sin puesto asignado'}
                                                                </p>
                                                            </div>
                                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getEstadoColor(usuario.activo)}`}>
                                                                <Check className="w-3 h-3" />
                                                                {usuario.activo}
                                                            </span>
                                                        </div>

                                                        {/* Detalles en grid */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                            <div className="flex items-center gap-2 text-[#6E6E73]">
                                                                <Mail className="w-4 h-4 flex-shrink-0" />
                                                                <span className="truncate">{usuario.email}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[#6E6E73]">
                                                                <User className="w-4 h-4 flex-shrink-0" />
                                                                <span>{usuario.username}</span>
                                                            </div>
                                                            {usuario.telefono && (
                                                                <div className="flex items-center gap-2 text-[#6E6E73]">
                                                                    <Phone className="w-4 h-4 flex-shrink-0" />
                                                                    <span>{usuario.telefono}</span>
                                                                </div>
                                                            )}
                                                            {usuario.departamento && (
                                                                <div className="flex items-center gap-2 text-[#6E6E73]">
                                                                    <Building2 className="w-4 h-4 flex-shrink-0" />
                                                                    <span>{usuario.departamento}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2 text-[#6E6E73]">
                                                                <Clock className="w-4 h-4 flex-shrink-0" />
                                                                <span>
                                                                    {usuario.estado === 'CONECTADO' ? (
                                                                        <span className="text-green-600">● Conectado</span>
                                                                    ) : (
                                                                        <span className="text-[#6E6E73]">○ Desconectado</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {usuario.created_at && (
                                                                <div className="flex items-center gap-2 text-[#6E6E73]">
                                                                    <Calendar className="w-4 h-4 flex-shrink-0" />
                                                                    <span>
                                                                        Desde: {new Date(usuario.created_at).toLocaleDateString('es-MX')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <User className="w-12 h-12 text-[#86868B] mx-auto mb-3" />
                                            <p className="text-[#6E6E73]">
                                                {searchTerm
                                                    ? 'No se encontraron usuarios con ese criterio'
                                                    : 'No hay usuarios asignados a este rol'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default RoleDetail;