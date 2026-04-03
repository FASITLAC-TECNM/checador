import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiGrid, FiList, FiUsers, FiMapPin, FiRefreshCw, FiEdit2, FiTrash2 } from 'react-icons/fi';
import ConfirmBox from '../components/ConfirmBox';
import DepartamentsCard from '../components/cards/DepartamentsCard';
import DepartamentsModal from '../components/modals/DepartamentsModal';
import MapaDepartamentos from '../components/DepartamentsMap';
import DynamicLoader from '../components/common/DynamicLoader';
import { useTour } from '../hooks/useTour';

import { API_CONFIG } from '../config/Apiconfig';
const API_URL = API_CONFIG.BASE_URL;

const Departamentos = () => {
    const [departamentos, setDepartamentos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('activo');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingId, setEditingId] = useState(null);
    const [editingData, setEditingData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [alertMsg, setAlertMsg] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    // Definición del Tour
    const tourSteps = [
        { element: '#deptos-search', popover: { title: 'Buscador de Sedes', description: 'Localiza departamentos o sucursales por nombre.', side: "bottom" } },
        { element: '#deptos-view-toggle', popover: { title: 'Modo de Vista', description: 'Cambia entre vista de tarjetas o tabla detallada.', side: "bottom" } },
        { element: '#deptos-create-btn', popover: { title: 'Gestión de Estructura', description: 'Crea nuevos departamentos y asigna sus responsables.', side: "left" } },
        { element: '#deptos-list', popover: { title: 'Listado de Departamentos', description: 'Aquí verás el personal asignado y el número de geocercas configuradas.', side: "right" } },
        { element: '#deptos-map-container', popover: { title: 'Geocercas y Perímetros', description: 'Define zonas de validez geográfica. Los empleados solo podrán marcar asistencia si su GPS se encuentra dentro de los círculos configurados.', side: "left" } }
    ];

    useTour('departamentos', tourSteps, !loading);

    // Estado para controlar el foco del mapa
    const [focusedDepto, setFocusedDepto] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [deptosRes, usuariosRes] = await Promise.all([
                fetch(`${API_URL}/api/departamentos`, { headers }),
                fetch(`${API_URL}/api/usuarios`, { headers })
            ]);

            const deptosData = await deptosRes.json();
            const usuariosData = await usuariosRes.json();

            if (deptosData.success) setDepartamentos(deptosData.data);
            if (usuariosData.success) setUsuarios(usuariosData.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingId(null);
        setModalMode('create');
        setModalOpen(true);
    };

    const handleEdit = async (depto) => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/departamentos/${depto.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success) {
                setEditingId(depto.id);
                setModalMode('edit');
                setEditingData(result.data);
                setModalOpen(true);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async (data) => {
        try {
            setSaving(true);
            const token = localStorage.getItem('auth_token');
            const url = modalMode === 'create'
                ? `${API_URL}/api/departamentos`
                : `${API_URL}/api/departamentos/${editingId}`;

            const response = await fetch(url, {
                method: modalMode === 'create' ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                setModalOpen(false);
                fetchData();
            } else {
                setAlertMsg(result.message || 'Error al guardar');
            }
        } catch (error) {
            console.error(error);
            setAlertMsg('Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (depto) => {
        setConfirmAction({
            message: `¿Desactivar el departamento "${depto.nombre}" ? `,
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const token = localStorage.getItem('auth_token');
                    const response = await fetch(`${API_URL}/api/departamentos/${depto.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await response.json();
                    if (result.success) fetchData();
                } catch (error) {
                    console.error(error);
                }
            }
        });
    };

    const handleReactivar = (depto) => {
        setConfirmAction({
            message: `¿Reactivar el departamento "${depto.nombre}" ? `,
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const token = localStorage.getItem('auth_token');
                    const response = await fetch(`${API_URL}/api/departamentos/${depto.id}/reactivar`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await response.json();
                    if (result.success) fetchData();
                    else setAlertMsg(result.message || 'Error al reactivar');
                } catch (error) { console.error(error); }
            }
        });
    };

    // Handler para cuando se hace click en una card
    const handleFocusMap = (depto) => {
        if (depto.ubicacion && depto.ubicacion.zonas && depto.ubicacion.zonas.length > 0) {
            setFocusedDepto(depto);
        } else {
            // Opcional: Avisar que no tiene ubicación
            // console.log("El departamento no tiene zonas geográficas");
        }
    };

    const filteredDepartamentos = departamentos.filter(d => {
        const matchesBusqueda = d.nombre.toLowerCase().includes(busqueda.toLowerCase());

        if (!matchesBusqueda) return false;

        if (filtroEstado === 'activo') return d.es_activo !== false;
        if (filtroEstado === 'inactivo') return d.es_activo === false;
        return true;
    });

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Toolbar */}
            <div className="flex justify-between items-center gap-4 flex-shrink-0">
                <div className="flex flex-1 gap-3">
                    <div className="relative flex-1 max-w-md" id="deptos-search">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar departamentos..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="input w-auto cursor-pointer"
                    >
                        <option value="">Todos los estados</option>
                        <option value="activo">Activos</option>
                        <option value="inactivo">Inactivos</option>
                    </select>

                    {/* Toggle Vista */}
                    <div id="deptos-view-toggle" className="flex bg-slate-100 dark:bg-gray-800 rounded-lg p-1 border border-slate-200 dark:border-gray-700">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                            title="Vista Tarjetas"
                        >
                            <FiGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                            title="Vista Lista"
                        >
                            <FiList className="w-5 h-5" />
                        </button>
                    </div>

                </div>
                <button id="deptos-create-btn" onClick={handleCreate} className="btn-primary flex items-center gap-2">
                    <FiPlus /> Nuevo Departamento
                </button>
            </div>

            {/* Content Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_minmax(400px,_1fr)] xl:grid-cols-[1fr_minmax(500px,_1fr)] gap-6">

                {/* Listado Scrollable */}
                <div id="deptos-list" className="overflow-y-auto pr-2 pb-4 flex flex-col gap-4">
                    {loading ? (
                        <DynamicLoader text="Cargando departamentos..." />
                    ) : filteredDepartamentos.length === 0 ? (
                        <div className="text-center p-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">No se encontraron departamentos</div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                            {filteredDepartamentos.map(depto => (
                                <DepartamentsCard
                                    key={depto.id}
                                    onReactivar={handleReactivar}
                                    depto={depto}
                                    onEdit={() => handleEdit(depto)}
                                    onDelete={() => handleDelete(depto)}
                                    onFocus={handleFocusMap}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="card p-0 overflow-hidden mb-4">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-500 dark:text-gray-400">
                                    <thead className="bg-slate-50 dark:bg-gray-800 text-xs uppercase text-slate-700 dark:text-gray-300 border-b border-slate-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-5 py-3.5 font-bold">Departamento</th>
                                            <th className="px-5 py-3.5 font-bold text-center whitespace-nowrap">Personal / Zonas</th>
                                            <th className="px-5 py-3.5 font-bold text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {filteredDepartamentos.map(depto => {
                                            const hexColor = depto.es_activo === false
                                                ? '#EF4444'
                                                : (depto.color?.startsWith('#') ? depto.color : `#${depto.color || '6B7280'}`);

                                            return (
                                                <tr
                                                    key={depto.id}
                                                    onClick={() => handleFocusMap(depto)}
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors group ${depto.es_activo === false ? 'opacity-70 bg-gray-50/50 dark:bg-gray-800/50' : ''}`}
                                                >
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-10 rounded shadow-sm border border-slate-200" style={{ backgroundColor: hexColor }} />
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`font-bold truncate text-base ${depto.es_activo === false ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>
                                                                        {depto.nombre}
                                                                    </div>
                                                                    {depto.es_activo === false && <span className="text-[10px] uppercase tracking-wider font-bold text-red-700 bg-red-50 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/50">Inactivo</span>}
                                                                </div>
                                                                <div className="text-xs text-slate-500 dark:text-gray-400 line-clamp-1 mt-0.5">{depto.descripcion || 'Sin descripción'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 text-slate-700 dark:text-gray-300 text-xs font-semibold" title="Empleados">
                                                                <FiUsers className="w-3.5 h-3.5 text-primary-500" /> {depto.empleados_count || 0}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 text-slate-700 dark:text-gray-300 text-xs font-semibold" title="Zonas">
                                                                <FiMapPin className="w-3.5 h-3.5 text-orange-500" /> {depto.ubicacion?.zonas?.length || 0}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {depto.es_activo === false ? (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleReactivar(depto); }}
                                                                    className="p-1.5 text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-green-400 rounded-lg transition-colors"
                                                                    title="Reactivar"
                                                                >
                                                                    <FiRefreshCw className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleEdit(depto); }}
                                                                        className="p-1.5 text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-primary-400 rounded-lg transition-colors"
                                                                        title="Editar"
                                                                    >
                                                                        <FiEdit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDelete(depto); }}
                                                                        className="p-1.5 text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-red-400 rounded-lg transition-colors"
                                                                        title="Desactivar"
                                                                    >
                                                                        <FiTrash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mapa General Fijo */}
                <div id="deptos-map-container" className="card p-0 xl:min-w-[500px]">
                    <MapaDepartamentos
                        departamentos={filteredDepartamentos}
                        focusedDepto={focusedDepto} // Pasamos el departamento seleccionado
                    />
                </div>
            </div>

            {alertMsg && <ConfirmBox message={alertMsg} onConfirm={() => setAlertMsg(null)} />}
            {confirmAction && <ConfirmBox message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}

            {/* Modal */}
            <DepartamentsModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                mode={modalMode}
                initialData={editingData}
                usuarios={usuarios}
                onSave={handleSave}
                saving={saving}
            />
        </div>
    );
};

export default Departamentos;