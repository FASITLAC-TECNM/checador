import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSearch,
    FiX,
    FiShield,
    FiUsers,
    FiCheck,
    FiSave,
    FiMove,
    FiEye,
    FiLock,
    FiArrowLeft,
    FiUserPlus,
    FiMail,
    FiCalendar,
    FiSettings,
    FiClock,
    FiMonitor,
    FiFileText,
    FiBarChart2,
    FiRefreshCw
} from 'react-icons/fi';
import { useConfig } from '../context/ConfigContext';
import DynamicLoader from '../components/common/DynamicLoader';
import ConfirmBox from '../components/ConfirmBox';

import { API_CONFIG } from '../config/Apiconfig';
const API_URL = API_CONFIG.BASE_URL;

// Mapeo de categorías a iconos
const CATEGORIA_ICONS = {
    'USUARIO': FiUsers,
    'ROL': FiShield,
    'EMPLEADO': FiUsers,
    'DEPARTAMENTO': FiSettings,
    'HORARIO': FiClock,
    'ASISTENCIA': FiCalendar,
    'DISPOSITIVO': FiMonitor,
    'INCIDENCIA': FiFileText,
    'REPORTE': FiBarChart2,
    'CONFIGURACION': FiSettings
};

const Roles = () => {
    const [roles, setRoles] = useState([]);
    const [permisosCatalogo, setPermisosCatalogo] = useState({ lista: [], por_categoria: {} });
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('activo');

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    // View mode
    const [viewingRole, setViewingRole] = useState(null);
    const [roleUsuarios, setRoleUsuarios] = useState([]);
    const [loadingUsuarios, setLoadingUsuarios] = useState(false);

    // Assign users modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [allUsuarios, setAllUsuarios] = useState([]);
    const [selectedUsuarios, setSelectedUsuarios] = useState([]);
    const [searchUsuario, setSearchUsuario] = useState('');

    // Reordering
    const [isReordering, setIsReordering] = useState(false);
    const [reorderedRoles, setReorderedRoles] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [savingOrder, setSavingOrder] = useState(false);
    const [alertMsg, setAlertMsg] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    // Form data
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        color: '#3B82F6',
        posicion: 1,
        es_admin: false,
        es_empleado: false,
        permisos: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [rolesRes, permisosRes] = await Promise.all([
                fetch(`${API_URL}/api/roles?es_activo=all`, { headers }),
                fetch(`${API_URL}/api/roles/permisos/catalogo`, { headers })
            ]);

            const rolesData = await rolesRes.json();
            const permisosData = await permisosRes.json();

            if (rolesData.success) {
                // Ordenar por posición para que la lista visual sea correcta
                const rolesOrdenados = rolesData.data.sort((a, b) => a.posicion - b.posicion);
                setRoles(rolesOrdenados);
            }
            if (permisosData.success) setPermisosCatalogo(permisosData.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setFormData({
            nombre: '',
            descripcion: '',
            color: '#3B82F6',
            posicion: roles.length + 1,
            es_admin: false,
            es_empleado: false,
            permisos: []
        });
        setEditingId(null);
        setModalMode('create');
        setModalOpen(true);
        setMensaje(null);
    };

    const openEditModal = async (rol) => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/roles/${rol.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (result.success) {
                const data = result.data;
                setFormData({
                    nombre: data.nombre || '',
                    descripcion: data.descripcion || '',
                    color: data.color || '#3B82F6',
                    posicion: data.posicion || 1,
                    es_admin: data.es_admin || false,
                    es_empleado: data.es_empleado || false,
                    permisos: data.permisos_lista || []
                });
                setEditingId(rol.id);
                setModalMode('edit');
                setModalOpen(true);
                setMensaje(null);
            }
        } catch (error) { console.error(error); }
    };

    const openViewModal = async (rol) => {
        try {
            setLoadingUsuarios(true);
            const token = localStorage.getItem('auth_token');
            const [rolRes, usuariosRes] = await Promise.all([
                fetch(`${API_URL}/api/roles/${rol.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/roles/${rol.id}/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const rolData = await rolRes.json();
            const usuariosData = await usuariosRes.json();
            if (rolData.success) setViewingRole({ ...rolData.data, color: rol.color || '#3B82F6' });
            if (usuariosData.success) setRoleUsuarios(usuariosData.data);
        } catch (error) { console.error(error); } finally { setLoadingUsuarios(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim()) { setMensaje({ tipo: 'error', texto: 'El nombre es requerido' }); return; }
        try {
            setSaving(true);
            const token = localStorage.getItem('auth_token');
            const body = { ...formData };
            const url = modalMode === 'create' ? `${API_URL}/api/roles` : `${API_URL}/api/roles/${editingId}`;
            const response = await fetch(url, {
                method: modalMode === 'create' ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            if (result.success) {
                setModalOpen(false);
                fetchData();
                if (viewingRole && editingId === viewingRole.id) openViewModal({ ...viewingRole });
            } else {
                setMensaje({ tipo: 'error', texto: result.message || 'Error al guardar' });
            }
        } catch (error) { setMensaje({ tipo: 'error', texto: 'Error al guardar rol' }); } finally { setSaving(false); }
    };

    const handleDelete = (rol, e) => {
        e.stopPropagation();

        if (isRoleFixed(rol)) {
            setAlertMsg("Este es un rol de sistema protegido y no se puede desactivar.");
            return;
        }

        const hasUsers = rol.usuarios_count > 0;
        const warning = hasUsers
            ? `\n(Hay ${rol.usuarios_count} usuarios asignados que perderán sus permisos)`
            : '';

        setConfirmAction({
            message: `¿Desactivar el rol "${rol.nombre}"?${warning}`,
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const token = localStorage.getItem('auth_token');
                    const response = await fetch(`${API_URL}/api/roles/${rol.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    const result = await response.json();
                    if (result.success) { fetchData(); if (viewingRole && viewingRole.id === rol.id) setViewingRole(null); }
                    else { setAlertMsg(result.message || 'Error al eliminar'); }
                } catch (error) { console.error(error); }
            }
        });
    };

    const handleReactivar = (rol, e) => {
        e.stopPropagation();
        setConfirmAction({
            message: `¿Reactivar el rol "${rol.nombre}"?`,
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const token = localStorage.getItem('auth_token');
                    const response = await fetch(`${API_URL}/api/roles/${rol.id}/reactivar`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
                    const result = await response.json();
                    if (result.success) { fetchData(); }
                    else { setAlertMsg(result.message || 'Error al reactivar'); }
                } catch (error) { console.error(error); }
            }
        });
    };

    // --- UTILS ---
    const normalizePermiso = (codigo) => codigo ? codigo.toUpperCase().replace(/[\s-]/g, '_') : '';

    const togglePermiso = (codigo) => {
        setFormData(prev => {
            const codigoNorm = normalizePermiso(codigo);
            const existe = prev.permisos.some(p => normalizePermiso(p) === codigoNorm);
            return { ...prev, permisos: existe ? prev.permisos.filter(p => normalizePermiso(p) !== codigoNorm) : [...prev.permisos, codigo] };
        });
    };

    const toggleCategoriaCompleta = (categoria, permisos) => {
        const codigos = permisos.map(p => p.codigo);
        const codigosNorm = codigos.map(c => normalizePermiso(c));
        const todosSeleccionados = codigosNorm.every(cn => formData.permisos.some(fp => normalizePermiso(fp) === cn));
        setFormData(prev => ({
            ...prev,
            permisos: todosSeleccionados ? prev.permisos.filter(p => !codigosNorm.includes(normalizePermiso(p))) : [...new Set([...prev.permisos, ...codigos])]
        }));
    };

    const getInitials = (nombre) => {
        if (!nombre) return '?';
        const parts = nombre.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return nombre.substring(0, 2).toUpperCase();
    };

    const getPermisosCount = (permisos_lista) => permisos_lista?.length || 0;

    const filteredRoles = roles.filter(r => {
        const matchesBusqueda = r.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
            r.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

        if (!matchesBusqueda) return false;

        if (filtroEstado === 'activo') return r.es_activo !== false;
        if (filtroEstado === 'inactivo') return r.es_activo === false;
        return true;
    });

    // --- LÓGICA DE REORDENAMIENTO CORREGIDA ---

    // Función auxiliar para saber si un rol es inamovible
    const isRoleFixed = (rol) => {
        const nombre = rol.nombre?.toLowerCase();
        return nombre === 'administrador' || nombre === 'empleado' || rol.es_admin; // Agrega es_admin por seguridad
    };

    const handleStartReordering = () => {
        setIsReordering(true);
        // CARGAMOS TODOS LOS ROLES, no filtramos nada.
        // Esto asegura que si Admin es el #1, siga siendo el #1 en la lista visual.
        setReorderedRoles([...filteredRoles]);
    };

    const handleCancelReordering = () => {
        setIsReordering(false);
        setReorderedRoles([]);
        setDraggedIndex(null);
    };

    const handleSaveOrder = async () => {
        try {
            setSavingOrder(true);
            const token = localStorage.getItem('auth_token');

            // Actualizamos TODOS los roles para asegurar consistencia
            const updatePromises = reorderedRoles.map((rol, index) => {
                // La jerarquía visual (index 0 es el más alto) se mapea a posición 1
                const nuevaPosicion = index + 1;

                // Optimización: Solo enviar si cambió (aunque el backend debería manejarlo bien)
                if (rol.posicion !== nuevaPosicion) {
                    return fetch(`${API_URL}/api/roles/${rol.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ posicion: nuevaPosicion })
                    });
                }
                return Promise.resolve();
            });

            await Promise.all(updatePromises);
            await fetchData(); // Recargar para confirmar orden
            setIsReordering(false);
            setReorderedRoles([]);
        } catch (error) {
            console.error('Error al guardar el orden:', error);
            setAlertMsg('Hubo un error al guardar el orden.');
        } finally {
            setSavingOrder(false);
        }
    };

    const handleDragStart = (e, index) => {
        // Bloquear el inicio del arrastre si el item es fijo
        if (isRoleFixed(reorderedRoles[index])) {
            e.preventDefault();
            return;
        }
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Hack para imagen fantasma transparente si se quisiera, omitido por simplicidad
    };

    const handleDragOver = (e, index) => {
        e.preventDefault(); // Permitir drop por defecto

        if (draggedIndex === null) return;

        // CORRECCIÓN CRÍTICA:
        // 1. Si intento soltar sobre un rol FIJO (ej: Admin), NO PERMITIR.
        // 2. Si el rol que estoy arrastrando es FIJO (ya prevenido en Start), NO PERMITIR.
        const targetRole = reorderedRoles[index];

        if (isRoleFixed(targetRole)) {
            // No hacemos nada, efectivamente bloqueando el reordenamiento sobre este item
            return;
        }

        // Si llegamos aquí, el destino es un rol móvil
        if (draggedIndex !== index) {
            const newRoles = [...reorderedRoles];
            const [draggedRole] = newRoles.splice(draggedIndex, 1);
            newRoles.splice(index, 0, draggedRole);

            setReorderedRoles(newRoles);
            setDraggedIndex(index);
        }
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // --- ASSIGN MODAL LOGIC (reutilizada) ---
    const openAssignModal = async () => { /* ... igual ... */
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (result.success) {
                setAllUsuarios(result.data);
                setSelectedUsuarios(roleUsuarios.map(u => u.id));
                setShowAssignModal(true);
            }
        } catch (error) { console.error('Error:', error); }
    };

    const filteredUsuariosForAssign = allUsuarios.filter(u =>
        u.nombre?.toLowerCase().includes(searchUsuario.toLowerCase()) ||
        u.correo?.toLowerCase().includes(searchUsuario.toLowerCase())
    );

    const handleAssignSave = async () => { /* ... igual ... */
        try {
            setSaving(true);
            const token = localStorage.getItem('auth_token');
            const usuariosActuales = roleUsuarios.map(u => u.id);
            const usuariosAAgregar = selectedUsuarios.filter(id => !usuariosActuales.includes(id));
            const usuariosARemover = usuariosActuales.filter(id => !selectedUsuarios.includes(id));

            for (const userId of usuariosAAgregar) {
                await fetch(`${API_URL}/api/usuarios/${userId}/roles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ rol_id: viewingRole.id })
                });
            }
            for (const userId of usuariosARemover) {
                await fetch(`${API_URL}/api/usuarios/${userId}/roles/${viewingRole.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            const response = await fetch(`${API_URL}/api/roles/${viewingRole.id}/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (result.success) setRoleUsuarios(result.data);
            setShowAssignModal(false);
            fetchData();
        } catch (error) { console.error('Error:', error); } finally { setSaving(false); }
    };

    const permisoEstaActivo = (permisoCatalogo, permisosLista) => {
        if (!permisosLista || !Array.isArray(permisosLista)) return false;
        const codigoNormalizado = normalizePermiso(permisoCatalogo.codigo);
        return permisosLista.some(p => normalizePermiso(p) === codigoNormalizado);
    };

    // --- RENDER VISTA DETALLE (Con el botón Restaurado) ---
    if (viewingRole) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => { setViewingRole(null); setRoleUsuarios([]); }} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                        <FiArrowLeft className="w-5 h-5" /> Volver a Roles
                    </button>
                    <div className="flex-1"></div>
                    <button onClick={() => openEditModal(viewingRole)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm">
                        <FiEdit2 className="w-4 h-4" /> Editar Rol
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="card flex flex-col h-full transition-colors duration-200">
                        <div className="mb-6 pb-6 border-b border-slate-100 dark:border-gray-700">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${viewingRole.color}20` }}>
                                    <FiShield className="w-7 h-7" style={{ color: viewingRole.color }} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{viewingRole.nombre}</h1>
                                    <div className="flex gap-2 mt-1">
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">Jerarquía: {viewingRole.posicion}</span>
                                        {viewingRole.es_admin && <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 px-2 py-0.5 rounded"><FiLock className="w-3 h-3" /> Admin Total</span>}
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{viewingRole.descripcion || "Sin descripción asignada para este rol."}</p>
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2"><FiShield className="w-5 h-5 text-gray-400" /> Permisos Activos ({viewingRole.permisos_lista?.length || 0})</h2>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[600px]">
                            {Object.entries(permisosCatalogo.por_categoria || {}).map(([categoria, permisos]) => {
                                const permisosActivos = permisos.filter(p => permisoEstaActivo(p, viewingRole.permisos_lista));
                                if (permisosActivos.length === 0) return null;
                                const Icon = CATEGORIA_ICONS[categoria.toUpperCase()] || FiShield;
                                return (
                                    <div key={categoria} className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2"><Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" /><h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{categoria}</h3></div>
                                        <div className="p-3 flex flex-wrap gap-2">
                                            {permisosActivos.map(p => (<span key={p.codigo} className="inline-flex items-center gap-1.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-md shadow-sm"><FiCheck className="w-3 h-3 text-green-500" />{p.nombre}</span>))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="lg:col-span-2 card flex flex-col h-full transition-colors duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FiUsers className="w-5 h-5 text-gray-400" /> Usuarios Asignados ({roleUsuarios.length})</h2>
                            <button onClick={openAssignModal} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-colors text-sm font-medium"><FiUserPlus className="w-4 h-4" /> Asignar Usuarios</button>
                        </div>
                        {loadingUsuarios ? <div className="flex justify-center py-12 flex-1"><DynamicLoader size="small" /></div> : roleUsuarios.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex-1"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4"><FiUsers className="w-8 h-8 text-gray-300 dark:text-gray-600" /></div><p className="font-medium">No hay usuarios con este rol</p></div>
                        ) : (
                            <div className="space-y-3 overflow-y-auto max-h-[700px] pr-2">
                                {roleUsuarios.map(usuario => (
                                    <div key={usuario.id} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow group">
                                        <div className="flex-shrink-0">
                                            {usuario.foto ? <img src={usuario.foto} alt={usuario.nombre} className="w-12 h-12 rounded-full object-cover border border-gray-200" /> : <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{ backgroundColor: viewingRole.color }}>{getInitials(usuario.nombre)}</div>}
                                        </div>
                                        <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 dark:text-white truncate">{usuario.nombre}</p><p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1"><FiMail className="w-3 h-3" /> {usuario.correo}</p></div>
                                        <div className="flex items-center gap-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide border ${usuario.estado_cuenta === 'activo' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>{usuario.estado_cuenta}</span></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Assign Modal */}
                {showAssignModal && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowAssignModal(false)}></div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col relative z-10 transition-colors duration-200">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Asignar Usuarios</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Rol: {viewingRole.nombre}</p>
                                </div>
                                <button onClick={() => setShowAssignModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 flex-1 overflow-hidden flex flex-col">
                                <div className="relative mb-4 flex-shrink-0">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" value={searchUsuario} onChange={(e) => setSearchUsuario(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" placeholder="Buscar usuario..." />
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {filteredUsuariosForAssign.map(usuario => {
                                        const isSelected = selectedUsuarios.includes(usuario.id);
                                        return (
                                            <button key={usuario.id} onClick={() => setSelectedUsuarios(prev => isSelected ? prev.filter(id => id !== usuario.id) : [...prev, usuario.id])} className={`w-full p-3 rounded-lg border-2 text-left transition-all ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${isSelected ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200'}`}>{getInitials(usuario.nombre)}</div>
                                                    <div className="flex-1"><p className="font-medium text-gray-900 dark:text-white">{usuario.nombre}</p><p className="text-sm text-gray-500 dark:text-gray-400">{usuario.correo}</p></div>
                                                    {isSelected && <div className="w-6 h-6 rounded-full flex items-center justify-center text-white bg-primary-600"><FiCheck className="w-4 h-4" /></div>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="border-t p-4 bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700 rounded-b-xl flex justify-between items-center flex-shrink-0">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{selectedUsuarios.length} usuarios seleccionados</span>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600">Cancelar</button>
                                    <button onClick={handleAssignSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-70">{saving ? 'Guardando...' : <><FiSave className="w-4 h-4" /> Guardar</>}</button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Edit Modal - Reutilizado abajo */}
                {modalOpen && createPortal(
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col transition-colors duration-200">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{modalMode === 'create' ? 'Nuevo Rol' : 'Editar Rol'}</h2>
                                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg text-gray-500 dark:text-gray-400"><FiX className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                                    <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2"><FiFileText className="w-5 h-5" /> Información Básica</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Rol *</label><input type="text" value={formData.nombre} onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label><div className="flex items-center gap-3"><input type="color" value={formData.color} onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))} className="h-10 w-20 p-1 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" /><span className="text-sm text-gray-500 dark:text-gray-400 font-mono uppercase">{formData.color}</span></div></div>
                                    </div>
                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label><textarea value={formData.descripcion} onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none" rows={3} /></div>
                                    <div className="flex gap-6"><label className="flex items-center gap-2 cursor-pointer dropdown-item"><input type="checkbox" checked={formData.es_admin} onChange={(e) => setFormData(prev => ({ ...prev, es_admin: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700" /><span className="text-sm text-gray-700 dark:text-gray-300">Es Administrador</span></label><label className="flex items-center gap-2 cursor-pointer dropdown-item"><input type="checkbox" checked={formData.es_empleado} onChange={(e) => setFormData(prev => ({ ...prev, es_empleado: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700" /><span className="text-sm text-gray-700 dark:text-gray-300">Es Empleado</span></label></div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                                    <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2"><FiShield className="w-5 h-5" /> Permisos por Módulo</h3>
                                    <div className="space-y-4">
                                        {Object.entries(permisosCatalogo.por_categoria || {}).map(([categoria, permisos]) => {
                                            const Icon = CATEGORIA_ICONS[categoria.toUpperCase()] || FiShield;
                                            const todosSeleccionados = permisos.every(p => formData.permisos.some(fp => normalizePermiso(fp) === normalizePermiso(p.codigo)));
                                            return (
                                                <div key={categoria} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                                                    <div className="bg-gray-100 dark:bg-gray-700/50 p-3 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${formData.color}20` }}><Icon className="w-5 h-5" style={{ color: formData.color }} /></div><div><h4 className="font-medium text-gray-900 dark:text-white">{categoria}</h4><p className="text-xs text-gray-500 dark:text-gray-400">{permisos.filter(p => formData.permisos.some(fp => normalizePermiso(fp) === normalizePermiso(p.codigo))).length}/{permisos.length} permisos</p></div></div><button type="button" onClick={() => toggleCategoriaCompleta(categoria, permisos)} className={`text-xs px-3 py-1 rounded transition-colors ${todosSeleccionados ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>{todosSeleccionados ? 'Desmarcar todo' : 'Marcar todo'}</button></div>
                                                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {permisos.map(permiso => (
                                                            <label key={permiso.codigo} className="flex items-center gap-2 cursor-pointer group"><input type="checkbox" checked={formData.permisos.some(fp => normalizePermiso(fp) === normalizePermiso(permiso.codigo))} onChange={() => togglePermiso(permiso.codigo)} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700" /><span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{permiso.nombre}</span></label>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700"><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Cancelar</button><button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Guardando...' : <><FiSave className="w-5 h-5" /> Guardar Cambios</>}</button></div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {alertMsg && createPortal(
                    <ConfirmBox message={alertMsg} onConfirm={() => setAlertMsg(null)} />,
                    document.body
                )}

                {confirmAction && createPortal(
                    <ConfirmBox
                        message={confirmAction.message}
                        onConfirm={confirmAction.onConfirm}
                        onCancel={() => setConfirmAction(null)}
                    />,
                    document.body
                )}
            </div>
        );
    }

    // --- MAIN LIST VIEW (CARDS CLICKEABLES) ---
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                {!isReordering ? (
                    <>
                        <div className="flex flex-1 gap-3">
                            <div className="relative flex-1 max-w-md">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar rol..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="input pl-10"
                                />
                            </div>
                            <select
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value)}
                                className="input px-4 cursor-pointer"
                            >
                                <option value="">Todos los estados</option>
                                <option value="activo">Activos</option>
                                <option value="inactivo">Inactivos</option>
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleStartReordering}
                                className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                            >
                                <FiMove className="w-5 h-5" />
                                Reordenar
                            </button>
                            <button
                                onClick={openCreateModal}
                                className="btn-primary flex items-center gap-2"
                            >
                                <FiPlus className="w-5 h-5" />
                                Nuevo Rol
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-between">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 flex items-center gap-2">
                            <FiMove className="w-5 h-5 text-purple-600" />
                            <span className="text-purple-700 font-medium">Arrastra para reordenar la jerarquía</span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleCancelReordering} disabled={savingOrder} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 shadow-sm">
                                <FiX className="w-5 h-5" /> Cancelar
                            </button>
                            <button onClick={handleSaveOrder} disabled={savingOrder} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm">
                                {savingOrder ? 'Guardando...' : <><FiSave className="w-5 h-5" /> Guardar Orden</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* List */}
            {loading ? (
                <DynamicLoader text="Cargando roles..." />
            ) : (
                <div className="space-y-3">
                    {(isReordering ? reorderedRoles : filteredRoles).map((rol, index) => {
                        const esFijo = isRoleFixed(rol);

                        return (
                            <div
                                key={rol.id}
                                draggable={isReordering && !esFijo}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                onClick={() => !isReordering && openViewModal(rol)}
                                className={`card p-0 transition-all overflow-hidden group hover:-translate-y-1
                                    ${rol.es_activo === false ? 'bg-slate-50 opacity-70 border-slate-200' : 'bg-white'}
                                    ${isReordering
                                        ? esFijo
                                            ? 'opacity-60 border-slate-200 bg-slate-50'
                                            : 'cursor-move border-purple-300 shadow-sm'
                                        : rol.es_activo === false
                                            ? 'border-red-200 hover:border-red-300 cursor-pointer'
                                            : 'cursor-pointer'
                                    }
                                    ${draggedIndex === index ? 'opacity-50' : ''}`}
                                style={{
                                    boxShadow: !isReordering ? `0 2px 8px -2px ${rol.color || '#3B82F6'}30` : 'none'
                                }}
                            >
                                <div className="flex items-center gap-4 p-5">
                                    {/* Handle de reordenamiento o Número */}
                                    {isReordering && (
                                        <div className="flex items-center gap-3 min-w-[60px]">
                                            {esFijo ? (
                                                <FiLock className="w-5 h-5 text-gray-400" title="Rol fijo" />
                                            ) : (
                                                <FiMove className="w-6 h-6 text-purple-500 cursor-move" />
                                            )}
                                            <div className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center
                                                ${esFijo ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'}`}>
                                                {index + 1}
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: `${rol.color || '#3B82F6'}20` }}
                                    >
                                        <FiShield className="w-7 h-7" style={{ color: rol.color || '#3B82F6' }} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`font-semibold text-lg ${rol.es_activo === false ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{rol.nombre}</h3>
                                            {rol.es_activo === false && <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded">Desactivado</span>}
                                            {rol.es_admin && <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded"><FiLock className="w-3 h-3" /> Admin</span>}
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 line-clamp-1">{rol.descripcion || 'Sin descripción'}</p>
                                        <div className="flex items-center gap-6 text-sm">
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <FiUsers className="w-4 h-4" />
                                                <span className="font-medium">{rol.usuarios_count || 0}</span> usuarios
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <FiShield className="w-4 h-4" />
                                                <span className="font-medium">{getPermisosCount(rol.permisos_lista)}</span> permisos
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {!isReordering && (
                                        <div className="flex items-center gap-2 relative z-10">
                                            {rol.es_activo === false ? (
                                                <button
                                                    onClick={(e) => handleReactivar(rol, e)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg transition-colors"
                                                    title="Reactivar rol"
                                                >
                                                    <FiRefreshCw className="w-4 h-4" /> Reactivar
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditModal(rol); }}
                                                        className="p-2 text-gray-500 hover:bg-primary-50 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-primary-400 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <FiEdit2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { handleDelete(rol, e); }}
                                                        className={`p-2 rounded-lg transition-colors ${esFijo ? 'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400'}`}
                                                        title={esFijo ? "Rol de sistema protegido" : "Desactivar"}
                                                    >
                                                        <FiTrash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {isReordering && (
                                        <div className={`font-semibold ${esFijo ? 'text-gray-400' : 'text-purple-600'}`}>
                                            {esFijo ? 'Fijo' : `Nivel ${index + 1}`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal - Reutilizado */}
            {modalOpen && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col transition-colors duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{modalMode === 'create' ? 'Nuevo Rol' : 'Editar Rol'}</h2>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg text-gray-500 dark:text-gray-400"><FiX className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Formulario con Color Picker */}
                            {mensaje && (
                                <div className={`p-4 rounded-lg ${mensaje.tipo === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'}`}>
                                    {mensaje.texto}
                                </div>
                            )}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2"><FiFileText className="w-5 h-5" /> Información Básica</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Rol *</label>
                                        <input type="text" value={formData.nombre} onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={formData.color}
                                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                                className="h-10 w-20 p-1 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                                            />
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono uppercase">{formData.color}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                    <textarea value={formData.descripcion} onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none" rows={3} />
                                </div>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer dropdown-item"><input type="checkbox" checked={formData.es_admin} onChange={(e) => setFormData(prev => ({ ...prev, es_admin: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700" /><span className="text-sm text-gray-700 dark:text-gray-300">Es Administrador</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer dropdown-item"><input type="checkbox" checked={formData.es_empleado} onChange={(e) => setFormData(prev => ({ ...prev, es_empleado: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700" /><span className="text-sm text-gray-700 dark:text-gray-300">Es Empleado</span></label>
                                </div>
                            </div>
                            {/* Permisos */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2"><FiShield className="w-5 h-5" /> Permisos por Módulo</h3>
                                <div className="space-y-4">
                                    {Object.entries(permisosCatalogo.por_categoria || {}).map(([categoria, permisos]) => {
                                        const Icon = CATEGORIA_ICONS[categoria.toUpperCase()] || FiShield;
                                        const todosSeleccionados = permisos.every(p => formData.permisos.some(fp => normalizePermiso(fp) === normalizePermiso(p.codigo)));
                                        return (
                                            <div key={categoria} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                                                <div className="bg-gray-100 dark:bg-gray-700/50 p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${formData.color}20` }}><Icon className="w-5 h-5" style={{ color: formData.color }} /></div>
                                                        <div><h4 className="font-medium text-gray-900 dark:text-white">{categoria}</h4><p className="text-xs text-gray-500 dark:text-gray-400">{permisos.filter(p => formData.permisos.some(fp => normalizePermiso(fp) === normalizePermiso(p.codigo))).length}/{permisos.length} permisos</p></div>
                                                    </div>
                                                    <button type="button" onClick={() => toggleCategoriaCompleta(categoria, permisos)} className={`text-xs px-3 py-1 rounded transition-colors ${todosSeleccionados ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>{todosSeleccionados ? 'Desmarcar todo' : 'Marcar todo'}</button>
                                                </div>
                                                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {permisos.map(permiso => (
                                                        <label key={permiso.codigo} className="flex items-center gap-2 cursor-pointer group">
                                                            <input type="checkbox" checked={formData.permisos.some(fp => normalizePermiso(fp) === normalizePermiso(permiso.codigo))} onChange={() => togglePermiso(permiso.codigo)} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{permiso.nombre}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Guardando...' : <><FiSave className="w-5 h-5" /> Guardar Cambios</>}</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {alertMsg && createPortal(
                <ConfirmBox message={alertMsg} onConfirm={() => setAlertMsg(null)} />,
                document.body
            )}

            {confirmAction && createPortal(
                <ConfirmBox
                    message={confirmAction.message}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirmAction(null)}
                />,
                document.body
            )}
        </div>
    );
};

export default Roles;