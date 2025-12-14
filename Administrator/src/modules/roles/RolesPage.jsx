import React, { useState, useEffect } from 'react';
import RoleList from './RoleList';
import RoleForm from './RoleForm';
import RoleDetail from './RoleDetail';
import SearchBar from '../../components/utils/SearchBar';
import AdNote from '../../components/alerts/AdNote';
import { Plus, Shield, Info, GripVertical, Save, X } from 'lucide-react';
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

    // Estados para reordenamiento
    const [isReordering, setIsReordering] = useState(false);
    const [reorderedRoles, setReorderedRoles] = useState([]);
    const [savingOrder, setSavingOrder] = useState(false);

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
                color: rol.color || '#3b82f6', // Color de la BD o por defecto
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
                color: rolCompleto.color || role.color || '#3b82f6',
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

    const handleView = async (role) => {
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

            // Combinar datos del rol con color e información completa
            const rolParaVista = {
                ...rolCompleto,
                color: rolCompleto.color || role.color || '#3b82f6',
                usuariosAsignados: parseInt(rolCompleto.usuarios_asignados) || 0,
                esDefault: role.esDefault || false,
                fechaCreacion: rolCompleto.fecha_creacion,
                permisos: permisosTransformados
            };

            setViewingRole(rolParaVista);
        } catch (err) {
            console.error('Error cargando rol:', err);
            alert('Error al cargar el rol: ' + err.message);
        } finally {
            setLoading(false);
        }
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
                color: formData.color || '#3b82f6',
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

    // Funciones para reordenamiento
    const handleStartReordering = () => {
        setIsReordering(true);
        setReorderedRoles([...filteredRoles]);
    };

    const handleCancelReordering = () => {
        setIsReordering(false);
        setReorderedRoles([]);
    };

    const handleSaveOrder = async () => {
        try {
            setSavingOrder(true);

            // Actualizar la jerarquía de cada rol (1 = mayor jerarquía, n = menor)
            for (let i = 0; i < reorderedRoles.length; i++) {
                const role = reorderedRoles[i];
                const nuevaJerarquia = i + 1;

                // Solo actualizar si cambió la jerarquía
                if (role.jerarquia !== nuevaJerarquia) {
                    await actualizarRol(role.id, {
                        nombre: role.nombre,
                        descripcion: role.descripcion,
                        color: role.color,
                        jerarquia: nuevaJerarquia,
                        permisos: [] // No modificar permisos
                    });
                }
            }

            alert('Jerarquía actualizada exitosamente');
            await cargarDatos();
            setIsReordering(false);
            setReorderedRoles([]);
        } catch (err) {
            console.error('Error guardando orden:', err);
            alert('Error al guardar el orden: ' + err.message);
        } finally {
            setSavingOrder(false);
        }
    };

    const handleDragStart = (e, index) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/html'));

        if (dragIndex === dropIndex) return;

        const newRoles = [...reorderedRoles];
        const [draggedRole] = newRoles.splice(dragIndex, 1);
        newRoles.splice(dropIndex, 0, draggedRole);

        setReorderedRoles(newRoles);
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
                        <div className="flex items-center gap-3">
                            {!isReordering ? (
                                <>
                                    <button
                                        onClick={handleStartReordering}
                                        className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl hover:bg-purple-700 transition-all duration-300 shadow-md hover:shadow-lg font-semibold"
                                    >
                                        <GripVertical className="w-5 h-5" />
                                        Reordenar
                                    </button>
                                    <button
                                        onClick={handleAdd}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all duration-300 shadow-md hover:shadow-lg font-semibold"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Nuevo Rol
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleCancelReordering}
                                        disabled={savingOrder}
                                        className="flex items-center gap-2 bg-gray-500 text-white px-5 py-3 rounded-xl hover:bg-gray-600 transition-all duration-300 shadow-md font-semibold disabled:opacity-50"
                                    >
                                        <X className="w-5 h-5" />
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveOrder}
                                        disabled={savingOrder}
                                        className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 shadow-md hover:shadow-lg font-semibold disabled:opacity-50"
                                    >
                                        {savingOrder ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                Guardar Orden
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Barra de búsqueda */}
                    {!isReordering && (
                        <SearchBar
                            placeholder="Buscar roles por nombre o descripción..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-6"
                        />
                    )}

                    {/* Banner de modo reordenamiento */}
                    {isReordering && (
                        <div className="mb-6 bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <GripVertical className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-purple-900 mb-1">Modo Reordenamiento Activo</h3>
                                    <p className="text-sm text-purple-700">
                                        Arrastra y suelta los roles para cambiar su jerarquía.
                                        Los roles en la parte superior tendrán mayor jerarquía (1),
                                        y los de abajo menor jerarquía (N).
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <RoleList
                        roles={isReordering ? reorderedRoles : filteredRoles}
                        onEdit={isReordering ? null : handleEdit}
                        onDelete={isReordering ? null : handleDelete}
                        onView={isReordering ? null : handleView}
                        isReordering={isReordering}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    />
                </div>
            </div>
        </div>
    );
};

export default RolesPage;