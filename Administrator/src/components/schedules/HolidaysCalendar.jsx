import React, { useState, useEffect } from 'react';
import { FiCalendar, FiPlus, FiTrash2, FiEdit2, FiRefreshCw, FiX } from 'react-icons/fi';
import { API_CONFIG } from '../../config/Apiconfig';
import DynamicLoader from '../common/DynamicLoader';

const API_URL = API_CONFIG.BASE_URL;

const HolidaysCalendar = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showModal, setShowModal] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        fecha: '',
        es_obligatorio: true,
        tipo: 'empresa',
        descripcion: ''
    });

    useEffect(() => {
        fetchHolidays();
    }, [selectedYear]);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/dias-festivos?year=${selectedYear}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setHolidays(result.data);
            }
        } catch (error) {
            console.error('Error al cargar días festivos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/dias-festivos/sincronizar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ year: selectedYear })
            });
            const result = await response.json();
            if (result.success) {
                fetchHolidays();
                alert(`Sincronización exitosa: ${result.data.insertados} insertados, ${result.data.actualizados} actualizados`);
            }
        } catch (error) {
            console.error('Error al sincronizar:', error);
            alert('Error al sincronizar días festivos');
        } finally {
            setSyncing(false);
        }
    };

    const handleCreate = () => {
        setEditingHoliday(null);
        setFormData({
            nombre: '',
            fecha: '',
            es_obligatorio: true,
            tipo: 'empresa',
            descripcion: ''
        });
        setShowModal(true);
    };

    const handleEdit = (holiday) => {
        setEditingHoliday(holiday);
        setFormData({
            nombre: holiday.nombre,
            fecha: holiday.fecha,
            es_obligatorio: holiday.es_obligatorio,
            tipo: holiday.tipo,
            descripcion: holiday.descripcion || ''
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('auth_token');
            const url = editingHoliday
                ? `${API_URL}/api/dias-festivos/${editingHoliday.id}`
                : `${API_URL}/api/dias-festivos`;

            const response = await fetch(url, {
                method: editingHoliday ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (result.success) {
                setShowModal(false);
                fetchHolidays();
            } else {
                alert(result.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar día festivo');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este día festivo?')) return;

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/dias-festivos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                fetchHolidays();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const groupByMonth = () => {
        const grouped = {};
        holidays.forEach(holiday => {
            const date = new Date(holiday.fecha);
            const month = date.toLocaleString('es-MX', { month: 'long' });
            if (!grouped[month]) grouped[month] = [];
            grouped[month].push(holiday);
        });
        return grouped;
    };

    const getTipoColor = (tipo) => {
        switch (tipo) {
            case 'oficial': return 'bg-blue-100 text-blue-800';
            case 'local': return 'bg-purple-100 text-purple-800';
            case 'empresa': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const groupedHolidays = groupByMonth();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        {[...Array(5)].map((_, i) => {
                            const year = new Date().getFullYear() - 1 + i;
                            return <option key={year} value={year} className="dark:text-white">{year}</option>;
                        })}
                    </select>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {holidays.length} día{holidays.length !== 1 ? 's' : ''} festivo{holidays.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar API'}
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <FiPlus className="w-4 h-4" />
                        Agregar Festivo
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            {loading ? (
                <DynamicLoader text="Cargando calendario..." />
            ) : holidays.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <FiCalendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No hay días festivos para {selectedYear}</p>
                    <button
                        onClick={handleSync}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                        Sincronizar desde API
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(groupedHolidays).map(([month, monthHolidays]) => (
                        <div key={month} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                                <h3 className="text-white font-semibold capitalize">{month}</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {monthHolidays.map(holiday => {
                                    const date = new Date(holiday.fecha);
                                    const day = date.getDate();
                                    const dayName = date.toLocaleString('es-MX', { weekday: 'short' });

                                    return (
                                        <div
                                            key={holiday.id}
                                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                                        >
                                            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex flex-col items-center justify-center">
                                                <span className="text-xs text-blue-600 dark:text-blue-400 uppercase">{dayName}</span>
                                                <span className="text-lg font-bold text-blue-900 dark:text-blue-300">{day}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                                                    {holiday.nombre}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTipoColor(holiday.tipo)}`}>
                                                        {holiday.tipo}
                                                    </span>
                                                    {holiday.es_obligatorio && (
                                                        <span className="text-xs text-red-600 dark:text-red-400">Obligatorio</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <button
                                                    onClick={() => handleEdit(holiday)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <FiEdit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(holiday.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingHoliday ? 'Editar' : 'Agregar'} Día Festivo
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.fecha}
                                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                                <select
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="empresa">Empresa</option>
                                    <option value="oficial">Oficial</option>
                                    <option value="local">Local</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción (opcional)</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="es_obligatorio"
                                    checked={formData.es_obligatorio}
                                    onChange={(e) => setFormData({ ...formData, es_obligatorio: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <label htmlFor="es_obligatorio" className="text-sm text-gray-700 dark:text-gray-300">
                                    Obligatorio (bloquea registro de asistencia)
                                </label>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HolidaysCalendar;
