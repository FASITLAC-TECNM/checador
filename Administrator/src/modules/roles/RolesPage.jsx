import React, { useState } from 'react';
import RoleList from './RoleList';
import RoleForm from './RoleForm';
import RoleDetail from './RoleDetail';
import SearchBar from '../../components/utils/SearchBar';
import AdNote from '../../components/alerts/AdNote';
import { Plus, Shield, Info } from 'lucide-react';

const RolesPage = () => {
    const [roles, setRoles] = useState([
        {
            id: 1,
            nombre: 'Administrador',
            descripcion: 'Acceso completo al sistema',
            color: '#ef4444',
            usuariosAsignados: 3,
            esDefault: false,
            fechaCreacion: '2024-01-10',
            permisos: {
                usuarios: { ver: true, crear: true, editar: true, eliminar: true },
                roles: { ver: true, crear: true, editar: true, eliminar: true },
                dispositivos: { ver: true, crear: true, editar: true, eliminar: true },
                asistencias: { ver: true, crear: true, editar: true, eliminar: true },
                reportes: { ver: true, crear: true, editar: true, eliminar: true },
                configuracion: { ver: true, crear: true, editar: true, eliminar: true }
            }
        },
        {
            id: 2,
            nombre: 'Supervisor',
            descripcion: 'Gestión de equipos y reportes',
            color: '#3b82f6',
            usuariosAsignados: 8,
            esDefault: false,
            fechaCreacion: '2024-01-10',
            permisos: {
                usuarios: { ver: true, crear: false, editar: true, eliminar: false },
                roles: { ver: true, crear: false, editar: false, eliminar: false },
                dispositivos: { ver: true, crear: false, editar: false, eliminar: false },
                asistencias: { ver: true, crear: true, editar: true, eliminar: false },
                reportes: { ver: true, crear: true, editar: false, eliminar: false },
                configuracion: { ver: false, crear: false, editar: false, eliminar: false }
            }
        },
        {
            id: 3,
            nombre: 'Empleado',
            descripcion: 'Acceso básico para registro de asistencia',
            color: '#10b981',
            usuariosAsignados: 45,
            esDefault: true,
            fechaCreacion: '2024-01-10',
            permisos: {
                usuarios: { ver: false, crear: false, editar: false, eliminar: false },
                roles: { ver: false, crear: false, editar: false, eliminar: false },
                dispositivos: { ver: false, crear: false, editar: false, eliminar: false },
                asistencias: { ver: true, crear: true, editar: false, eliminar: false },
                reportes: { ver: true, crear: false, editar: false, eliminar: false },
                configuracion: { ver: false, crear: false, editar: false, eliminar: false }
            }
        },
        {
            id: 4,
            nombre: 'Recursos Humanos',
            descripcion: 'Gestión de personal y asistencias',
            color: '#8b5cf6',
            usuariosAsignados: 5,
            esDefault: false,
            fechaCreacion: '2024-02-15',
            permisos: {
                usuarios: { ver: true, crear: true, editar: true, eliminar: false },
                roles: { ver: true, crear: false, editar: false, eliminar: false },
                dispositivos: { ver: true, crear: true, editar: true, eliminar: false },
                asistencias: { ver: true, crear: true, editar: true, eliminar: true },
                reportes: { ver: true, crear: true, editar: true, eliminar: false },
                configuracion: { ver: true, crear: false, editar: true, eliminar: false }
            }
        }
    ]);

    const [showForm, setShowForm] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [viewingRole, setViewingRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        color: '#3b82f6',
        permisos: {
            usuarios: { ver: false, crear: false, editar: false, eliminar: false },
            roles: { ver: false, crear: false, editar: false, eliminar: false },
            dispositivos: { ver: false, crear: false, editar: false, eliminar: false },
            asistencias: { ver: false, crear: false, editar: false, eliminar: false },
            reportes: { ver: false, crear: false, editar: false, eliminar: false },
            configuracion: { ver: false, crear: false, editar: false, eliminar: false }
        }
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePermissionChange = (modulo, permiso) => {
        setFormData(prev => ({
            ...prev,
            permisos: {
                ...prev.permisos,
                [modulo]: {
                    ...prev.permisos[modulo],
                    [permiso]: !prev.permisos[modulo][permiso]
                }
            }
        }));
    };

    const handleAdd = () => {
        setEditingRole(null);
        setFormData({
            nombre: '',
            descripcion: '',
            color: '#3b82f6',
            permisos: {
                usuarios: { ver: false, crear: false, editar: false, eliminar: false },
                roles: { ver: false, crear: false, editar: false, eliminar: false },
                dispositivos: { ver: false, crear: false, editar: false, eliminar: false },
                asistencias: { ver: false, crear: false, editar: false, eliminar: false },
                reportes: { ver: false, crear: false, editar: false, eliminar: false },
                configuracion: { ver: false, crear: false, editar: false, eliminar: false }
            }
        });
        setShowForm(true);
    };

    const handleEdit = (role) => {
        setEditingRole(role);
        setFormData({
            nombre: role.nombre,
            descripcion: role.descripcion,
            color: role.color,
            permisos: role.permisos
        });
        setShowForm(true);
    };

    const handleView = (role) => {
        setViewingRole(role);
    };

    const handleSave = () => {
        if (!formData.nombre.trim()) {
            alert('El nombre del rol es requerido');
            return;
        }

        if (editingRole) {
            setRoles(roles.map(r =>
                r.id === editingRole.id
                    ? { ...editingRole, ...formData }
                    : r
            ));
        } else {
            setRoles([...roles, {
                ...formData,
                id: Date.now(),
                usuariosAsignados: 0,
                esDefault: false,
                fechaCreacion: new Date().toISOString().split('T')[0]
            }]);
        }
        setShowForm(false);
    };

    const handleDelete = (id) => {
        const role = roles.find(r => r.id === id);
        if (role?.esDefault) {
            alert('No se puede eliminar el rol por defecto');
            return;
        }
        if (role?.usuariosAsignados > 0) {
            alert(`No se puede eliminar este rol porque tiene ${role.usuariosAsignados} usuarios asignados`);
            return;
        }
        if (confirm('¿Está seguro de eliminar este rol?')) {
            setRoles(roles.filter(r => r.id !== id));
        }
    };

    const handleClose = () => {
        setShowForm(false);
        setEditingRole(null);
    };

    const handleCloseDetail = () => {
        setViewingRole(null);
    };

    // Si está viendo el detalle de un rol
    if (viewingRole) {
        return (
            <RoleDetail
                role={viewingRole}
                onClose={handleCloseDetail}
                onEdit={() => {
                    setViewingRole(null);
                    handleEdit(viewingRole);
                }}
            />
        );
    }

    // Si está mostrando el formulario
    if (showForm) {
        return (
            <RoleForm
                formData={formData}
                editingRole={editingRole}
                onClose={handleClose}
                onSave={handleSave}
                onChange={handleInputChange}
                onPermissionChange={handlePermissionChange}
            />
        );
    }

    // Filtrar roles
    const filteredRoles = roles.filter(role =>
        role.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Mostrar lista de roles
    const totalUsuarios = roles.reduce((sum, role) => sum + role.usuariosAsignados, 0);

    return (
        <div className="min-h-screen bg-[#FBFBFD] p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-[#1D1D1F] mb-3">Roles y Permisos</h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                    <Shield className="w-4 h-4" />
                                    <span className="font-semibold">{roles.length}</span>
                                    <span className="text-sm">roles</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                                    <span className="font-semibold">{totalUsuarios}</span>
                                    <span className="text-sm">usuarios asignados</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all duration-300 shadow-md hover:shadow-lg font-semibold"
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Rol
                        </button>
                    </div>

                    {/* Barra de búsqueda */}
                    <SearchBar
                        placeholder="Buscar roles por nombre o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-6"
                    />
                    <RoleList
                        roles={filteredRoles}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onView={handleView}
                    />
                </div>
            </div>
        </div>
    );
};

export default RolesPage;