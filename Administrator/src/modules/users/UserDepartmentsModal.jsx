import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Building2, CheckCircle } from 'lucide-react';
import { getDepartamentosEmpleado, asignarDepartamento, eliminarAsignacionDepartamento } from '../../services/empleadoDepartamentoService';
import { getDepartamentos } from '../../services/departamentosService';
import { useNotification } from '../../context/NotificationContext';

const UserDepartmentsModal = ({ empleadoId, onClose }) => {
    const notification = useNotification();
    const [departamentosAsignados, setDepartamentosAsignados] = useState([]);
    const [todosDepartamentos, setTodosDepartamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDepartamento, setSelectedDepartamento] = useState('');

    useEffect(() => {
        cargarDatos();
    }, [empleadoId]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [asignados, todos] = await Promise.all([
                getDepartamentosEmpleado(empleadoId),
                getDepartamentos()
            ]);
            setDepartamentosAsignados(asignados);
            setTodosDepartamentos(todos);
        } catch (error) {
            console.error('Error cargando departamentos:', error);
            notification.error('Error', 'No se pudieron cargar los departamentos');
        } finally {
            setLoading(false);
        }
    };

    const handleAsignar = async () => {
        if (!selectedDepartamento) {
            notification.warning('Selecciona un departamento', 'Debes seleccionar un departamento para asignar');
            return;
        }

        try {
            await asignarDepartamento(empleadoId, parseInt(selectedDepartamento));
            notification.success('Departamento asignado', 'El departamento se asignó correctamente');
            setSelectedDepartamento('');
            cargarDatos();
        } catch (error) {
            console.error('Error asignando departamento:', error);
            if (error.response?.data?.error) {
                notification.error('Error', error.response.data.error);
            } else {
                notification.error('Error', 'No se pudo asignar el departamento');
            }
        }
    };

    const handleEliminar = async (id, nombre) => {
        const confirmed = await notification.confirm(
            '¿Eliminar asignación?',
            `¿Estás seguro de que deseas eliminar la asignación del departamento "${nombre}"?`
        );

        if (!confirmed) return;

        try {
            await eliminarAsignacionDepartamento(id);
            notification.success('Asignación eliminada', 'La asignación del departamento se eliminó correctamente');
            cargarDatos();
        } catch (error) {
            console.error('Error eliminando asignación:', error);
            notification.error('Error', 'No se pudo eliminar la asignación');
        }
    };

    const departamentosDisponibles = todosDepartamentos.filter(
        dept => !departamentosAsignados.some(asig => asig.id_departamento === dept.id)
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Gestionar Departamentos</h2>
                            <p className="text-blue-100 text-sm">Asigna departamentos al empleado</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                    {loading ? (
                        <div className="py-12 text-center text-gray-400">
                            Cargando departamentos...
                        </div>
                    ) : (
                        <>
                            {/* Asignar nuevo departamento */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Asignar Departamento
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedDepartamento}
                                        onChange={(e) => setSelectedDepartamento(e.target.value)}
                                        className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none"
                                        disabled={departamentosDisponibles.length === 0}
                                    >
                                        <option value="">Seleccionar departamento...</option>
                                        {departamentosDisponibles.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAsignar}
                                        disabled={!selectedDepartamento}
                                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-semibold"
                                    >
                                        <Plus size={18} />
                                        Asignar
                                    </button>
                                </div>
                                {departamentosDisponibles.length === 0 && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        Todos los departamentos ya están asignados
                                    </p>
                                )}
                            </div>

                            {/* Lista de departamentos asignados */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">
                                    Departamentos Asignados ({departamentosAsignados.length})
                                </h3>
                                {departamentosAsignados.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-500">No hay departamentos asignados</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Asigna un departamento usando el selector de arriba
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {departamentosAsignados.map((asignacion) => (
                                            <div
                                                key={asignacion.id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                                        <Building2 size={20} className="text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">
                                                            {asignacion.departamento_nombre}
                                                        </p>
                                                        {asignacion.departamento_descripcion && (
                                                            <p className="text-sm text-gray-500">
                                                                {asignacion.departamento_descripcion}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Asignado: {new Date(asignacion.fecha_asignacion).toLocaleDateString('es-MX')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleEliminar(asignacion.id, asignacion.departamento_nombre)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Eliminar asignación"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold flex items-center gap-2"
                    >
                        <CheckCircle size={18} />
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserDepartmentsModal;
