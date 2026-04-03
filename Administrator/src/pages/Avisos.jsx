import { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, Globe, Users, X, Check, AlertCircle
} from 'lucide-react';
import { API_CONFIG } from '../config/Apiconfig';
import DynamicLoader from '../components/common/DynamicLoader';

const API_URL = API_CONFIG.BASE_URL;

const Avisos = () => {
    // --- ESTADOS ---
    const [avisos, setAvisos] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [busquedaEmpleados, setBusquedaEmpleados] = useState('');

    // Estados del Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAviso, setEditingAviso] = useState(null);
    const [formData, setFormData] = useState({
        titulo: '',
        contenido: '',
        es_global: true,
        empleados: [] // Array of employee IDs
    });

    // Estados de confirmación
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [error, setError] = useState(null);

    // --- EFECTOS ---
    useEffect(() => {
        fetchAvisos();
        fetchEmpleados();
    }, []);

    // --- FUNCIONES DE API ---
    const fetchAvisos = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/avisos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setAvisos(result.data);
            }
        } catch (err) {
            console.error('Error al cargar avisos:', err);
            setError('Error al cargar los avisos');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmpleados = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            // Reutilizamos el endpoint de empleados existente
            const response = await fetch(`${API_URL}/api/usuarios?estado=activo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setEmpleados(result.data);
            }
        } catch (err) {
            console.error('Error al cargar empleados:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.titulo.trim() || !formData.contenido.trim()) {
            setError('Todos los campos son obligatorios');
            return;
        }

        if (!formData.es_global && formData.empleados.length === 0) {
            setError('Debe seleccionar al menos un empleado para avisos no globales');
            return;
        }

        try {
            const token = localStorage.getItem('auth_token');
            const url = editingAviso
                ? `${API_URL}/api/avisos/${editingAviso.id}`
                : `${API_URL}/api/avisos`;

            const method = editingAviso ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                setModalOpen(false);
                setEditingAviso(null);
                setFormData({ titulo: '', contenido: '', es_global: true, empleados: [] });
                fetchAvisos();
            } else {
                setError(result.message || 'Error al guardar el aviso');
            }
        } catch (err) {
            console.error('Error al guardar:', err);
            setError('Error de conexión al guardar el aviso');
        }
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/avisos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                setConfirmDelete(null);
                fetchAvisos();
            } else {
                setError(result.message || 'Error al eliminar');
            }
        } catch (err) {
            setError('Error al eliminar el aviso');
        }
    };

    // --- HANDLERS ---
    const handleOpenCreate = () => {
        setEditingAviso(null);
        setFormData({ titulo: '', contenido: '', es_global: true, empleados: [] });
        setModalOpen(true);
        setError(null);
    };

    const handleOpenEdit = (aviso) => {
        setEditingAviso(aviso);
        setFormData({
            titulo: aviso.titulo,
            contenido: aviso.contenido,
            es_global: aviso.es_global,
            empleados: aviso.empleados ? aviso.empleados.map(e => e.usuario_id) : []
        });
        setModalOpen(true);
        setError(null);
    };

    const toggleEmpleado = (id) => {
        setFormData(prev => {
            const newEmpleados = prev.empleados.includes(id)
                ? prev.empleados.filter(eId => eId !== id)
                : [...prev.empleados, id];
            return { ...prev, empleados: newEmpleados };
        });
    };

    // Filtrar avisos
    // Filtrar avisos en lista principal
    const avisosFiltrados = avisos.filter(a =>
        a.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.contenido.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Filtrar empleados en modal
    const empleadosFiltrados = empleados.filter(e =>
        (e.nombre?.toLowerCase() || '').includes(busquedaEmpleados.toLowerCase()) ||
        (e.apellidos?.toLowerCase() || '').includes(busquedaEmpleados.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-[calc(100vh-7rem)] p-4">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar avisos..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-colors"
                    />
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-5 h-5" /> Nuevo Aviso
                </button>
            </div>

            {/* ERROR GENERAL */}
            {error && !modalOpen && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* LISTA DE AVISOS */}
            {loading ? (
                <DynamicLoader text="Cargando avisos..." />
            ) : avisosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
                    <Globe className="w-12 h-12 mb-3 opacity-50" />
                    <p>No hay avisos registrados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {avisosFiltrados.map(aviso => (
                        <div key={aviso.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative group">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${aviso.es_global
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                    }`}>
                                    {aviso.es_global ? <Globe className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                    {aviso.es_global ? 'Global' : 'Personalizo'}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenEdit(aviso)}
                                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setConfirmDelete(aviso)}
                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                                {aviso.titulo}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 whitespace-pre-wrap">
                                {aviso.contenido}
                            </p>

                            <div className="text-xs text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <span>
                                    {new Date(aviso.fecha_registro).toLocaleDateString()}
                                </span>
                                {!aviso.es_global && aviso.empleados && (
                                    <span title={aviso.empleados.map(e => `${e.nombre} ${e.apellidos}`).join(', ')}>
                                        {aviso.empleados.length} destinatario(s)
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}


            {/* MODAL CREAR/EDITAR */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${!formData.es_global ? 'max-w-4xl' : 'max-w-lg'} overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300`}>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingAviso ? 'Editar Aviso' : 'Nuevo Aviso'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> {error}
                                </div>
                            )}

                            <div className={`grid ${!formData.es_global ? 'grid-cols-1 md:grid-cols-2 gap-6' : 'grid-cols-1 gap-4'}`}>
                                {/* LEFT COLUMN: GENERAL INFO */}
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                                            <span className={`text-[10px] font-medium transition-colors ${formData.titulo.length >= 50 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                {formData.titulo.length}/55
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.titulo}
                                            maxLength={55}
                                            onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white"
                                            placeholder="Ej: Mantenimiento programado"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contenido</label>
                                            <span className={`text-[10px] font-medium transition-colors ${formData.contenido.length >= 480 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                {formData.contenido.length}/512
                                            </span>
                                        </div>
                                        <textarea
                                            value={formData.contenido}
                                            maxLength={512}
                                            onChange={e => setFormData({ ...formData, contenido: e.target.value })}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white h-32 resize-none"
                                            placeholder="Escribe el contenido del aviso..."
                                            required
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, es_global: true }))}
                                            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${formData.es_global
                                                ? 'bg-white shadow-sm text-primary-600'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <Globe className="w-4 h-4" /> Global
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, es_global: false }))}
                                            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${!formData.es_global
                                                ? 'bg-white shadow-sm text-primary-600'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <Users className="w-4 h-4" /> Específico
                                        </button>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: EMPLOYEE SELECTION */}
                                {!formData.es_global && (
                                    <div className="space-y-3 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Seleccionar Destinatarios
                                            </label>
                                            <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full font-medium">
                                                {formData.empleados.length} seleccionados
                                            </span>
                                        </div>

                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar empleado..."
                                                value={busquedaEmpleados}
                                                onChange={(e) => setBusquedaEmpleados(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 transition-colors"
                                            />
                                        </div>

                                        <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 divide-y divide-gray-100 dark:divide-gray-600 shadow-inner">
                                            {empleadosFiltrados.length > 0 ? (
                                                empleadosFiltrados.map(emp => {
                                                    const seleccionado = formData.empleados.includes(emp.id);
                                                    return (
                                                        <div
                                                            key={emp.id}
                                                            onClick={() => toggleEmpleado(emp.id)}
                                                            className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-600/50 ${seleccionado ? 'bg-gray-50 dark:bg-gray-600/40' : ''}`}
                                                        >
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                {/* Avatar con foto o iniciales */}
                                                                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                                                                    {emp.foto
                                                                        ? <img src={emp.foto} alt={emp.nombre} className="w-full h-full object-cover" />
                                                                        : <>{emp.nombre?.charAt(0) || '?'}{emp.apellidos?.charAt(0) || ''}</>
                                                                    }
                                                                </div>
                                                                <div className="flex flex-col truncate leading-tight">
                                                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                                                        {emp.nombre} {emp.apellidos}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400 truncate">
                                                                        @{emp.usuario}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${seleccionado
                                                                ? 'bg-gray-700 border-gray-700 dark:bg-gray-300 dark:border-gray-300'
                                                                : 'border-gray-300 dark:border-gray-500'
                                                                }`}>
                                                                {seleccionado && <Check className="w-3 h-3 text-white dark:text-gray-800" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-8 text-center text-gray-400 text-sm">
                                                    No se encontraron empleados
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, empleados: [] }))}
                                                className="text-xs text-red-500 hover:text-red-700 hover:underline"
                                            >
                                                Limpiar selección
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                            >
                                {editingAviso ? 'Guardar Cambios' : 'Crear Aviso'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM DELETE MODAL */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            ¿Eliminar aviso?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                            Estás seguro de eliminar "{confirmDelete.titulo}". Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDelete.id)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Avisos;
