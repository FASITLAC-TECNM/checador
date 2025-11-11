import { useState, useMemo } from 'react';
import { Plus, Shield, Search, Filter } from 'lucide-react';
import PermissionList from './PermissionList';
import PermissionForm from './PermissionForm';

const PermissionsPage = () => {
    // Datos iniciales de permisos
    const [permissions, setPermissions] = useState([
        {
            id: 1,
            nombre: 'Ver Usuarios',
            clave: 'usuarios.ver',
            descripcion: 'Permite visualizar la lista de usuarios y sus detalles',
            modulo: 'Usuarios',
            tipo: 'Ver',
            color: '#3B82F6',
            activo: true
        },
        {
            id: 2,
            nombre: 'Crear Usuario',
            clave: 'usuarios.crear',
            descripcion: 'Permite agregar nuevos usuarios al sistema',
            modulo: 'Usuarios',
            tipo: 'Crear',
            color: '#10B981',
            activo: true
        },
        {
            id: 3,
            nombre: 'Editar Usuario',
            clave: 'usuarios.editar',
            descripcion: 'Permite modificar la información de usuarios existentes',
            modulo: 'Usuarios',
            tipo: 'Editar',
            color: '#F59E0B',
            activo: true
        },
        {
            id: 4,
            nombre: 'Eliminar Usuario',
            clave: 'usuarios.eliminar',
            descripcion: 'Permite eliminar usuarios del sistema',
            modulo: 'Usuarios',
            tipo: 'Eliminar',
            color: '#EF4444',
            activo: true
        },
        {
            id: 5,
            nombre: 'Ver Roles',
            clave: 'roles.ver',
            descripcion: 'Permite visualizar roles y permisos asignados',
            modulo: 'Roles',
            tipo: 'Ver',
            color: '#3B82F6',
            activo: true
        },
        {
            id: 6,
            nombre: 'Crear Rol',
            clave: 'roles.crear',
            descripcion: 'Permite crear nuevos roles en el sistema',
            modulo: 'Roles',
            tipo: 'Crear',
            color: '#10B981',
            activo: true
        },
        {
            id: 7,
            nombre: 'Ver Departamentos',
            clave: 'departamentos.ver',
            descripcion: 'Permite visualizar la estructura de departamentos',
            modulo: 'Departamentos',
            tipo: 'Ver',
            color: '#3B82F6',
            activo: true
        },
        {
            id: 8,
            nombre: 'Exportar Reportes',
            clave: 'reportes.exportar',
            descripcion: 'Permite exportar reportes en diferentes formatos',
            modulo: 'Reportes',
            tipo: 'Exportar',
            color: '#6366F1',
            activo: true
        }
    ]);

    const [selectedPermission, setSelectedPermission] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [moduloFilter, setModuloFilter] = useState('');
    const [tipoFilter, setTipoFilter] = useState('');

    // Obtener módulos únicos
    const modulos = useMemo(() => {
        return [...new Set(permissions.map(p => p.modulo))].sort();
    }, [permissions]);

    // Obtener tipos únicos
    const tipos = useMemo(() => {
        return [...new Set(permissions.map(p => p.tipo))].sort();
    }, [permissions]);

    // Filtrar permisos
    const filteredPermissions = useMemo(() => {
        return permissions.filter(permission => {
            const matchesSearch =
                permission.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                permission.clave.toLowerCase().includes(searchTerm.toLowerCase()) ||
                permission.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesModulo = !moduloFilter || permission.modulo === moduloFilter;
            const matchesTipo = !tipoFilter || permission.tipo === tipoFilter;

            return matchesSearch && matchesModulo && matchesTipo;
        });
    }, [permissions, searchTerm, moduloFilter, tipoFilter]);

    // Estadísticas
    const stats = useMemo(() => {
        return {
            total: permissions.length,
            activos: permissions.filter(p => p.activo).length,
            modulos: new Set(permissions.map(p => p.modulo)).size,
            tipos: new Set(permissions.map(p => p.tipo)).size
        };
    }, [permissions]);

    const handlePermissionClick = (permission) => {
        setSelectedPermission(permission);
        setShowForm(true);
    };

    const handleAddNew = () => {
        setSelectedPermission(null);
        setShowForm(true);
    };

    const handleSave = (permissionData) => {
        if (selectedPermission) {
            // Actualizar permiso existente
            setPermissions(permissions.map(p =>
                p.id === permissionData.id ? permissionData : p
            ));
        } else {
            // Crear nuevo permiso
            const newPermission = {
                ...permissionData,
                id: Date.now()
            };
            setPermissions([...permissions, newPermission]);
        }

        setShowForm(false);
        setSelectedPermission(null);
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este permiso?')) {
            setPermissions(permissions.filter(p => p.id !== id));
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setSelectedPermission(null);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setModuloFilter('');
        setTipoFilter('');
    };

    return (
        <div className="min-h-screen bg-[#FBFBFD] p-6">
            <div className="max-w-7xl mx-auto">
                {showForm ? (
                    <PermissionForm
                        permission={selectedPermission}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                ) : (
                    <>
                        {/* Header con estadísticas */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-3xl font-bold text-[#1D1D1F]">Permisos</h2>
                                <div className="flex items-center gap-4 mt-2">
                                    <p className="text-[#6E6E73] text-sm">
                                        {stats.total} permisos registrados
                                    </p>
                                    <span className="text-[#D2D2D7]">|</span>
                                    <p className="text-green-600 text-sm">
                                        {stats.activos} activos
                                    </p>
                                    <span className="text-[#D2D2D7]">|</span>
                                    <p className="text-[#6E6E73] text-sm">
                                        {stats.modulos} módulos
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleAddNew}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-all duration-300 shadow-sm font-medium"
                            >
                                <Plus size={20} />
                                Nuevo Permiso
                            </button>
                        </div>

                        {/* Estadísticas en cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-xl border border-[#E5E5E7] shadow-sm p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[#6E6E73] text-sm">Total Permisos</p>
                                        <p className="text-2xl font-bold text-[#1D1D1F]">{stats.total}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-[#E5E5E7] shadow-sm p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-[#6E6E73] text-sm">Activos</p>
                                        <p className="text-2xl font-bold text-[#1D1D1F]">{stats.activos}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-[#E5E5E7] shadow-sm p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-[#6E6E73] text-sm">Módulos</p>
                                        <p className="text-2xl font-bold text-[#1D1D1F]">{stats.modulos}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-[#E5E5E7] shadow-sm p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-[#6E6E73] text-sm">Tipos</p>
                                        <p className="text-2xl font-bold text-[#1D1D1F]">{stats.tipos}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Barra de búsqueda y filtros */}
                        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#D2D2D7]">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Buscador */}
                                <div className="md:col-span-2 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6E6E73]" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, clave o descripción..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-[#86868B]"
                                    />
                                </div>

                                {/* Filtro por módulo */}
                                <div>
                                    <select
                                        value={moduloFilter}
                                        onChange={(e) => setModuloFilter(e.target.value)}
                                        className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                    >
                                        <option value="">Todos los módulos</option>
                                        {modulos.map(modulo => (
                                            <option key={modulo} value={modulo}>{modulo}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filtro por tipo */}
                                <div>
                                    <select
                                        value={tipoFilter}
                                        onChange={(e) => setTipoFilter(e.target.value)}
                                        className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                    >
                                        <option value="">Todos los tipos</option>
                                        {tipos.map(tipo => (
                                            <option key={tipo} value={tipo}>{tipo}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Botón para limpiar filtros */}
                            {(searchTerm || moduloFilter || tipoFilter) && (
                                <div className="mt-4 flex items-center justify-between pt-4 border-t border-[#E5E5E7]">
                                    <span className="text-[#6E6E73] text-sm">
                                        {filteredPermissions.length} permiso{filteredPermissions.length !== 1 ? 's' : ''} encontrado{filteredPermissions.length !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                                    >
                                        Limpiar filtros
                                    </button>
                                </div>
                            )}
                        </div>

                        <PermissionList
                            permissions={filteredPermissions}
                            onEdit={handlePermissionClick}
                            onDelete={handleDelete}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default PermissionsPage;
