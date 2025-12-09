import React, { useState, useEffect } from 'react';
import RoleList from './RoleList';
import RoleForm from './RoleForm';
import RoleDetail from './RoleDetail';
import SearchBar from '../../components/utils/SearchBar';
import AdNote from '../../components/alerts/AdNote';
import { Plus, Shield, Info } from 'lucide-react';
import {
    obtenerRoles,
    obtenerRolPorId,
    crearRol,
    actualizarRol,
    eliminarRol,
    obtenerModulos,
    transformarPermisosParaBackend,
    transformarPermisosParaFrontend
} from '../../services/rolesService';

const RolesPage = () => {
    const [roles, setRoles] = useState([]);
    const [modulos, setModulos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [viewingRole, setViewingRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        color: '#3b82f6',
        jerarquia: 10,
        permisos: {
            usuarios: { ver: false, crear: false, editar: false, eliminar: false },
            roles: { ver: false, crear: false, editar: false, eliminar: false },
            dispositivos: { ver: false, crear: false, editar: false, eliminar: false },
            asistencias: { ver: false, crear: false, editar: false, eliminar: false },
            reportes: { ver: false, crear: false, editar: false, eliminar: false },
            configuracion: { ver: false, crear: false, editar: false, eliminar: false }
        }
    });

    // Cargar roles y módulos al montar el componente
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            setError(null);
            const [rolesData, modulosData] = await Promise.all([
                obtenerRoles(),
                obtenerModulos()
            ]);

            // Transformar roles del backend al formato del frontend
            const rolesTransformados = rolesData.map(rol => ({
                id: rol.id,
                nombre: rol.nombre,
                descripcion: rol.descripcion,
                color: '#3b82f6', // Color por defecto (podemos guardar esto en BD después)
                usuariosAsignados: parseInt(rol.usuarios_asignados) || 0,
                esDefault: false, // Podemos añadir este campo a la BD después
                fechaCreacion: rol.fecha_creacion,
                jerarquia: rol.jerarquia,
                permisos: {} // Se cargará bajo demanda al ver/editar
            }));

            setRoles(rolesTransformados);
            setModulos(modulosData);
        } catch (err) {
            console.error('Error cargando datos:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
            jerarquia: 10,
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

    const handleEdit = async (role) => {
        try {
            setLoading(true);
            // Cargar el rol completo con sus permisos desde el backend
            const rolCompleto = await obtenerRolPorId(role.id);

            // Transformar permisos del backend al formato del frontend
            const permisosTransformados = rolCompleto.permisos && rolCompleto.permisos.length > 0
                ? transformarPermisosParaFrontend(rolCompleto.permisos)
                : {
                    usuarios: { ver: false, crear: false, editar: false, eliminar: false },
                    roles: { ver: false, crear: false, editar: false, eliminar: false },
                    dispositivos: { ver: false, crear: false, editar: false, eliminar: false },
                    asistencias: { ver: false, crear: false, editar: false, eliminar: false },
                    reportes: { ver: false, crear: false, editar: false, eliminar: false },
                    configuracion: { ver: false, crear: false, editar: false, eliminar: false }
                };

            setEditingRole(rolCompleto);
            setFormData({
                nombre: rolCompleto.nombre,
                descripcion: rolCompleto.descripcion,
                color: role.color || '#3b82f6',
                jerarquia: rolCompleto.jerarquia,
                permisos: permisosTransformados
            });
            setShowForm(true);
        } catch (err) {
            console.error('Error cargando rol:', err);
            alert('Error al cargar el rol: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (role) => {
        setViewingRole(role);
    };

    const handleSave = async () => {
        if (!formData.nombre.trim()) {
            alert('El nombre del rol es requerido');
            return;
        }

        try {
            setLoading(true);

            // Transformar permisos del frontend al formato del backend
            const permisosBackend = transformarPermisosParaBackend(formData.permisos, modulos);

            const rolData = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion || null,
                jerarquia: formData.jerarquia || 10,
                permisos: permisosBackend
            };

            if (editingRole) {
                // Actualizar rol existente
                await actualizarRol(editingRole.id, rolData);
                alert('Rol actualizado exitosamente');
            } else {
                // Crear nuevo rol
                await crearRol(rolData);
                alert('Rol creado exitosamente');
            }

            // Recargar la lista de roles
            await cargarDatos();
            setShowForm(false);
        } catch (err) {
            console.error('Error guardando rol:', err);
            alert('Error al guardar el rol: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
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
            try {
                setLoading(true);
                await eliminarRol(id);
                alert('Rol eliminado exitosamente');
                await cargarDatos();
            } catch (err) {
                console.error('Error eliminando rol:', err);
                alert('Error al eliminar el rol: ' + err.message);
            } finally {
                setLoading(false);
            }
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

    // Mostrar loading
    if (loading && roles.length === 0) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-[#6E6E73]">Cargando roles...</p>
                </div>
            </div>
        );
    }

    // Mostrar error
    if (error) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <p className="text-red-600 font-semibold mb-2">Error al cargar roles</p>
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={cargarDatos}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Filtrar roles
    const filteredRoles = roles.filter(role =>
        role.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.descripcion && role.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
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