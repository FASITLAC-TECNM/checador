import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiClock } from 'react-icons/fi';
import ConfirmBox from '../components/ConfirmBox';
import Pagination from '../components/Pagination';
import ScheduleCard from '../components/cards/ScheduleCard';
import ScheduleModal from '../components/modals/ScheduleModal';
import ImportHorariosModal from '../components/modals/ImportHorariosModal';
import DynamicLoader from '../components/common/DynamicLoader';
import HolidaysCalendar from '../components/schedules/HolidaysCalendar';
import { useTour } from '../hooks/useTour';

import { API_CONFIG } from '../config/Apiconfig';
const API_URL = API_CONFIG.BASE_URL;

const Horarios = () => {
    const [horarios, setHorarios] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('activo');
    const [vista, setVista] = useState('cards'); // 'cards' | 'festivos'

    // Definición del Tour
    const tourSteps = [
        { element: '#search-input', popover: { title: 'Buscador', description: 'Encuentra horarios rápidamente por nombre de empleado.', side: "bottom", align: 'start' } },
        { element: '#status-filter', popover: { title: 'Filtros de Estado', description: 'Alterna entre horarios activos e inactivos.', side: "bottom", align: 'start' } },
        { element: '#view-toggle', popover: { title: 'Vista de Calendario', description: 'Cambia entre la lista de horarios y el calendario de días festivos.', side: "bottom", align: 'start' } },
        { element: '#import-button', popover: { title: 'Importación Masiva', description: 'Sube archivos CSV para asignar horarios a múltiples empleados a la vez.', side: "left", align: 'start' } },
        { element: '#create-button', popover: { title: 'Nuevo Horario', description: 'Crea un horario personalizado de forma manual.', side: "left", align: 'start' } }
    ];

    useTour('horarios', tourSteps, !loading);

    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [saving, setSaving] = useState(false);
    const [editingHorario, setEditingHorario] = useState(null);
    const [alertMsg, setAlertMsg] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    // Paginación
    const [pagina, setPagina] = useState(1);
    const porPagina = 9;

    useEffect(() => {
        fetchData();
    }, [busqueda]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const params = new URLSearchParams();
            if (busqueda) params.append('buscar', busqueda);

            const [horariosRes, empleadosRes] = await Promise.all([
                fetch(`${API_URL}/api/horarios?${params}`, { headers }),
                fetch(`${API_URL}/api/empleados`, { headers })
            ]);

            const horariosData = await horariosRes.json();
            const empleadosData = await empleadosRes.json();

            if (horariosData.success) {
                setHorarios(horariosData.data);
                setPagina(1); // Reset pagination on new search
            }
            if (empleadosData.success) {
                const empleadosConId = empleadosData.data.filter(emp => emp.id);
                setEmpleados(empleadosConId);
            }
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingHorario(null);
        setModalMode('create');
        setModalOpen(true);
    };

    const handleEdit = async (horario) => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/horarios/${horario.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setEditingHorario(result.data);
                setModalMode('edit');
                setModalOpen(true);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async (formData) => {
        try {
            setSaving(true);
            const token = localStorage.getItem('auth_token');

            const body = {
                empleados_ids: formData.empleados_ids,
                fecha_inicio: formData.fecha_inicio,
                fecha_fin: formData.fecha_fin || null,
                configuracion: {
                    configuracion_semanal: formData.configuracion_semanal,
                    tipo_periodo: formData.tipo_periodo || 'semestral',
                    excepciones: {}
                }
            };

            const url = modalMode === 'create'
                ? `${API_URL}/api/horarios`
                : `${API_URL}/api/horarios/${editingHorario.id}`;

            const response = await fetch(url, {
                method: modalMode === 'create' ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const result = await response.json();
            if (result.success) {
                setModalOpen(false);
                fetchData();
            } else {
                setAlertMsg(result.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error:', error);
            setAlertMsg('Error al guardar horario');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (horario) => {
        setConfirmAction({
            message: '¿Estás seguro de desactivar este horario?',
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const token = localStorage.getItem('auth_token');
                    const response = await fetch(`${API_URL}/api/horarios/${horario.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await response.json();
                    if (result.success) fetchData();
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        });
    };

    const handleReactivar = (horario) => {
        setConfirmAction({
            message: `¿Reactivar este horario?`,
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const token = localStorage.getItem('auth_token');
                    const response = await fetch(`${API_URL}/api/horarios/${horario.id}/reactivar`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await response.json();
                    if (result.success) fetchData();
                    else setAlertMsg(result.message || 'Error al reactivar');
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        });
    };

    const getEmpleadoNombre = (horario) => {
        if (horario.empleados && horario.empleados.length > 0) {
            if (horario.empleados.length === 1) return horario.empleados[0].nombre;
            return `${horario.empleados.length} empleados asignados`;
        }
        return 'Sin asignar';
    };

    const filteredHorarios = horarios.filter(h => {
        let matchesBusqueda = false;
        
        if (!busqueda) {
            matchesBusqueda = true;
        } else if (h.empleados && h.empleados.length > 0) {
            matchesBusqueda = h.empleados.some(emp => 
                emp.nombre?.toLowerCase().includes(busqueda.toLowerCase())
            );
        } else {
            matchesBusqueda = 'sin asignar'.includes(busqueda.toLowerCase());
        }

        if (!matchesBusqueda) return false;

        if (filtroEstado === 'activo') return h.es_activo !== false;
        if (filtroEstado === 'inactivo') return h.es_activo === false;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex flex-1 gap-3">
                    <div className="relative flex-1 max-w-md">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por empleado..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            id="search-input"
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        id="status-filter"
                        className="input w-auto cursor-pointer"
                    >
                        <option value="">Todos los estados</option>
                        <option value="activo">Activos</option>
                        <option value="inactivo">Inactivos</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    {/* Toggle de vista */}
                    <div id="view-toggle" className="flex bg-slate-100 dark:bg-gray-800 rounded-lg p-1 border border-slate-200 dark:border-gray-700">
                        <button
                            onClick={() => setVista('cards')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${vista === 'cards'
                                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400'
                                : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            Horarios
                        </button>
                        <button
                            onClick={() => setVista('festivos')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${vista === 'festivos'
                                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400'
                                : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            Días Festivos
                        </button>
                    </div>
                    {vista !== 'festivos' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setImportModalOpen(true)}
                                id="import-button"
                                className="btn-secondary flex items-center gap-2 border-dashed border-2 hover:border-blue-500 hover:text-blue-600 transition-colors bg-white dark:bg-gray-800"
                                title="Importar desde archivo del sistema Tec"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <span className="hidden sm:inline">Importar CSV</span>
                            </button>

                            <button
                                onClick={handleCreate}
                                id="create-button"
                                className="btn-primary flex items-center gap-2"
                            >
                                <FiPlus className="w-5 h-5" />
                                <span className="hidden sm:inline">Nuevo Horario</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {vista === 'festivos' ? (
                <HolidaysCalendar />
            ) : loading ? (
                <DynamicLoader text="Cargando horarios..." />
            ) : filteredHorarios.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <FiClock className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">No se encontraron horarios</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                        {filteredHorarios.slice((pagina - 1) * porPagina, pagina * porPagina).map((horario) => (
                            <ScheduleCard
                                key={horario.id}
                                horario={horario}
                                empleadoNombre={getEmpleadoNombre(horario)}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onReactivar={handleReactivar}
                            />
                        ))}
                    </div>
                    <Pagination
                        pagina={pagina}
                        totalPaginas={Math.ceil(filteredHorarios.length / porPagina)}
                        total={filteredHorarios.length}
                        porPagina={porPagina}
                        onChange={setPagina}
                    />
                </>
            )
            }

            {alertMsg && <ConfirmBox message={alertMsg} onConfirm={() => setAlertMsg(null)} />}
            {confirmAction && <ConfirmBox message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}

            <ScheduleModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                mode={modalMode}
                empleados={empleados}
                initialData={editingHorario}
                onSave={handleSave}
                saving={saving}
            />

            <ImportHorariosModal 
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={fetchData}
            />
        </div >
    );
};

export default Horarios;
