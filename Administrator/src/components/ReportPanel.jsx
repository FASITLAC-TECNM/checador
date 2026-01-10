import { useState, useEffect } from 'react';
import { X, Download, Calendar, Filter, FileText, Building2, Globe, AlertCircle } from 'lucide-react';
import {
    obtenerDatosReporteEmpleado,
    obtenerDatosReporteDepartamento,
    obtenerDatosReporteGlobal,
    obtenerDatosReporteIncidencias
} from '../services/reportesService';
import { descargarReporte } from '../utils/reportGenerators';
import { getEmpleados } from '../services/empleadoService';
import { getDepartamentos } from '../services/departamentosService';

const ReportPanel = ({ isOpen, onClose, contexto = 'global', idContexto = null }) => {
    // Estados del formulario
    const [tipoReporte, setTipoReporte] = useState('individual');
    const [formato, setFormato] = useState('pdf');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
    const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState('');
    const [tipoIncidencia, setTipoIncidencia] = useState('');
    const [estadoIncidencia, setEstadoIncidencia] = useState('');
    const [incluirIncidencias, setIncluirIncidencias] = useState(true);
    const [incluirEstadisticas, setIncluirEstadisticas] = useState(true);
    const [incluirInactivos, setIncluirInactivos] = useState(false);

    // Estados de datos
    const [empleados, setEmpleados] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState(null);

    // Cargar datos iniciales
    useEffect(() => {
        if (isOpen) {
            cargarDatosIniciales();
            configurarDefectos();
        }
    }, [isOpen, contexto, idContexto]);

    const cargarDatosIniciales = async () => {
        try {
            setLoading(true);
            const [emps, depts] = await Promise.all([
                getEmpleados(),
                getDepartamentos()
            ]);
            setEmpleados(emps);
            setDepartamentos(depts);
            setError(null);
        } catch (error) {
            console.error('Error cargando datos:', error);
            setError('No se pudieron cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const configurarDefectos = () => {
        // Configurar fechas por defecto (último mes)
        const hoy = new Date();
        const haceUnMes = new Date(hoy);
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);

        setFechaFin(hoy.toISOString().split('T')[0]);
        setFechaInicio(haceUnMes.toISOString().split('T')[0]);

        // Configurar según el contexto
        if (contexto === 'usuario' && idContexto) {
            setTipoReporte('individual');
            setEmpleadoSeleccionado(idContexto);
        } else if (contexto === 'departamento' && idContexto) {
            setTipoReporte('departamental');
            setDepartamentoSeleccionado(idContexto);
        } else {
            setTipoReporte('global');
        }
    };

    const validarFormulario = () => {
        if (!fechaInicio || !fechaFin) {
            setError('Debes seleccionar un rango de fechas');
            return false;
        }

        if (new Date(fechaInicio) > new Date(fechaFin)) {
            setError('La fecha de inicio debe ser anterior a la fecha fin');
            return false;
        }

        if (tipoReporte === 'individual' && !empleadoSeleccionado) {
            setError('Debes seleccionar un empleado');
            return false;
        }

        if (tipoReporte === 'departamental' && !departamentoSeleccionado) {
            setError('Debes seleccionar un departamento');
            return false;
        }

        setError(null);
        return true;
    };

    const generarReporte = async () => {
        if (!validarFormulario()) return;

        try {
            setGenerando(true);
            setError(null);

            let datos;

            switch (tipoReporte) {
                case 'individual':
                    datos = await obtenerDatosReporteEmpleado(empleadoSeleccionado, {
                        fecha_inicio: fechaInicio,
                        fecha_fin: fechaFin,
                        incluir_incidencias: incluirIncidencias,
                        incluir_estadisticas: incluirEstadisticas
                    });
                    break;

                case 'departamental':
                    datos = await obtenerDatosReporteDepartamento(departamentoSeleccionado, {
                        fecha_inicio: fechaInicio,
                        fecha_fin: fechaFin,
                        incluir_empleados_inactivos: incluirInactivos
                    });
                    break;

                case 'global':
                    datos = await obtenerDatosReporteGlobal({
                        fecha_inicio: fechaInicio,
                        fecha_fin: fechaFin
                    });
                    break;

                case 'incidencias':
                    datos = await obtenerDatosReporteIncidencias({
                        fecha_inicio: fechaInicio,
                        fecha_fin: fechaFin,
                        tipo_incidencia: tipoIncidencia || undefined,
                        estado: estadoIncidencia || undefined,
                        id_empleado: empleadoSeleccionado || undefined,
                        id_departamento: departamentoSeleccionado || undefined
                    });
                    break;
            }

            // Generar y descargar el archivo
            await descargarReporte(datos, tipoReporte, formato);

            // Cerrar panel después de generar
            setTimeout(() => {
                onClose();
            }, 500);

        } catch (error) {
            console.error('Error generando reporte:', error);
            setError('No se pudo generar el reporte: ' + error.message);
        } finally {
            setGenerando(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            {/* Modal centrado */}
            <div
                className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText size={28} />
                            <div>
                                <h2 className="text-2xl font-bold">Generar Reporte</h2>
                                <p className="text-blue-100 text-sm">Selecciona las opciones para tu reporte</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Mensaje de error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* Tipo de Reporte */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            <Filter className="inline mr-2" size={16} />
                            Tipo de Reporte
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setTipoReporte('individual')}
                                disabled={contexto === 'departamento'}
                                className={`p-4 rounded-xl border-2 transition-all ${tipoReporte === 'individual'
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-blue-300'
                                    } ${contexto === 'departamento' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <FileText className="mx-auto mb-2" size={24} />
                                <div className="font-semibold text-sm">Individual</div>
                                <div className="text-xs text-gray-500">Por empleado</div>
                            </button>

                            <button
                                onClick={() => setTipoReporte('departamental')}
                                disabled={contexto === 'usuario'}
                                className={`p-4 rounded-xl border-2 transition-all ${tipoReporte === 'departamental'
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-blue-300'
                                    } ${contexto === 'usuario' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Building2 className="mx-auto mb-2" size={24} />
                                <div className="font-semibold text-sm">Departamento</div>
                                <div className="text-xs text-gray-500">Por área</div>
                            </button>

                            <button
                                onClick={() => setTipoReporte('global')}
                                className={`p-4 rounded-xl border-2 transition-all ${tipoReporte === 'global'
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-blue-300'
                                    }`}
                            >
                                <Globe className="mx-auto mb-2" size={24} />
                                <div className="font-semibold text-sm">Global</div>
                                <div className="text-xs text-gray-500">Ejecutivo</div>
                            </button>

                            <button
                                onClick={() => setTipoReporte('incidencias')}
                                className={`p-4 rounded-xl border-2 transition-all ${tipoReporte === 'incidencias'
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-blue-300'
                                    }`}
                            >
                                <AlertCircle className="mx-auto mb-2" size={24} />
                                <div className="font-semibold text-sm">Incidencias</div>
                                <div className="text-xs text-gray-500">Permisos y faltas</div>
                            </button>
                        </div>
                    </div>

                    {/* Rango de Fechas */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            <Calendar className="inline mr-2" size={16} />
                            Período
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Fecha Fin</label>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filtros según tipo de reporte */}
                    {tipoReporte === 'individual' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Empleado
                            </label>
                            <select
                                value={empleadoSeleccionado}
                                onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                disabled={contexto === 'usuario'}
                            >
                                <option value="">Selecciona un empleado</option>
                                {empleados.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.nombre || emp.usuario?.nombre || 'Sin nombre'} - {emp.rfc}
                                    </option>
                                ))}
                            </select>

                            <div className="mt-3 space-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={incluirIncidencias}
                                        onChange={(e) => setIncluirIncidencias(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>Incluir incidencias</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={incluirEstadisticas}
                                        onChange={(e) => setIncluirEstadisticas(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>Incluir estadísticas</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {tipoReporte === 'departamental' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Departamento
                            </label>
                            <select
                                value={departamentoSeleccionado}
                                onChange={(e) => setDepartamentoSeleccionado(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                disabled={contexto === 'departamento'}
                            >
                                <option value="">Selecciona un departamento</option>
                                {departamentos.map(dept => (
                                    <option key={dept.id_departamento} value={dept.id_departamento}>
                                        {dept.nombre}
                                    </option>
                                ))}
                            </select>

                            <div className="mt-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={incluirInactivos}
                                        onChange={(e) => setIncluirInactivos(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>Incluir empleados inactivos</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {tipoReporte === 'incidencias' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Tipo de Incidencia (opcional)
                                </label>
                                <select
                                    value={tipoIncidencia}
                                    onChange={(e) => setTipoIncidencia(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value="retardo">Retardo</option>
                                    <option value="justificante">Justificante</option>
                                    <option value="permiso">Permiso</option>
                                    <option value="vacaciones">Vacaciones</option>
                                    <option value="dias_festivos">Días Festivos</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Estado (opcional)
                                </label>
                                <select
                                    value={estadoIncidencia}
                                    onChange={(e) => setEstadoIncidencia(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Todos los estados</option>
                                    <option value="aprobada">Aprobada</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="rechazada">Rechazada</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Empleado (opcional)
                                </label>
                                <select
                                    value={empleadoSeleccionado}
                                    onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Todos los empleados</option>
                                    {empleados.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.nombre || emp.usuario?.nombre || 'Sin nombre'} - {emp.rfc}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Formato de Salida */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            <Download className="inline mr-2" size={16} />
                            Formato de Descarga
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {['pdf', 'xlsx', 'docx', 'csv'].map(fmt => (
                                <button
                                    key={fmt}
                                    onClick={() => setFormato(fmt)}
                                    className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all ${formato === fmt
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-gray-200 hover:border-blue-300'
                                        }`}
                                >
                                    {fmt.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                            disabled={generando}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={generarReporte}
                            disabled={generando || loading}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {generando ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>Generando...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={20} />
                                    <span>Generar Reporte</span>
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ReportPanel;
