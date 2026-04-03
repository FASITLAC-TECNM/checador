import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useConfig } from '../context/ConfigContext';
import DynamicLoader from '../components/common/DynamicLoader';
import ConfirmBox from '../components/ConfirmBox';
import Pagination from '../components/Pagination';
import {
    BarChart3, Settings, Filter, PieChart as PieIcon, X,
    CheckCircle, AlertTriangle, AlertCircle, Users, TrendingUp,
    FileSpreadsheet, FileText, File as FileIcon, Calendar,
    Activity, Search, RefreshCw, Trophy, Building2 // Icono Building2 agregado
} from 'lucide-react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
    AlignmentType, WidthType, HeadingLevel, BorderStyle, VerticalAlign,
    Header, Footer, ImageRun
} from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

import { API_CONFIG } from '../config/Apiconfig';
const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

const COLORS = {
    puntual: '#22c55e', // Verde
    retardo: '#eab308', // Amarillo
    falta: '#ef4444',   // Rojo
    azul: '#3b82f6',
    morado: '#8b5cf6',
    gris: '#94a3b8'
};

const SearchableSelect = ({ options, value, onChange, placeholder = "Buscar empleado..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    // Cerrar al dar click fuera
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = options.filter(opt =>
        React.isValidElement(opt)
            ? false
            : opt.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.id === value);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-transparent focus-within:bg-white dark:focus-within:bg-gray-600 focus-within:border-blue-500 rounded-xl flex items-center cursor-pointer transition-all h-[42px]"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                <span className={`text-sm font-medium truncate ${selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                    {selectedOption ? selectedOption.nombre : placeholder}
                </span>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input
                            type="text"
                            autoFocus
                            placeholder="Escribe para buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto outline-none">
                        <li
                            className="px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-300 transition-colors"
                            onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
                        >
                            <span className="italic text-gray-500">-- Ninguno --</span>
                        </li>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <li
                                    key={opt.id}
                                    className={`px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${value === opt.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                                    onClick={() => { onChange(opt.id); setIsOpen(false); setSearchTerm(''); }}
                                >
                                    {opt.nombre}
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-3 text-sm text-gray-500 text-center italic">No se encontraron empleados</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

const Reportes = () => {
    const { formatTime } = useConfig();
    // --- ESTADOS DE FILTROS ---
    const [alcance, setAlcance] = useState('global');
    const [idSeleccionado, setIdSeleccionado] = useState('');
    const [modoFecha, setModoFecha] = useState('intervalo');

    // Por defecto iniciamos con el último mes o quincena real
    const _hoy = new Date();
    const _hace15 = new Date();
    _hace15.setDate(_hace15.getDate() - 15);
    const [fechaInicio, setFechaInicio] = useState(_hace15.toISOString().split('T')[0]);
    const [fechaFin, setFechaFin] = useState(_hoy.toISOString().split('T')[0]);

    // --- ESTADOS DE DATOS ---
    const [dashboardStats, setDashboardStats] = useState(null);
    const [topDesempeno, setTopDesempeno] = useState([]);
    // NUEVO: Estado para la comparativa de departamentos
    const [statsDepartamentos, setStatsDepartamentos] = useState([]);
    const [listadoAsistencias, setListadoAsistencias] = useState([]);
    const [etiquetasTurnos, setEtiquetasTurnos] = useState(['Turno 1', 'Turno 2', 'Turno 3']);
    const [currentPage, setCurrentPage] = useState(1); // Controla la tabla de listado
    const [dashboardLoading, setDashboardLoading] = useState(false);

    // --- CATALOGOS ---
    const [empleados, setEmpleados] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);

    // --- MODAL Y EXPORTACIÓN ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [alertMsg, setAlertMsg] = useState(null);
    const [exportCategoria, setExportCategoria] = useState('general');

    const chartContainerRef = useRef(null);

    const getToken = () => localStorage.getItem('auth_token');

    // Carga inicial
    useEffect(() => {
        cargarCatalogos();
        actualizarEstadisticas();
    }, []);

    const cargarCatalogos = async () => {
        try {
            const token = getToken();
            if (!token) return;
            const [resEmp, resDep] = await Promise.all([
                fetch(`${API_BASE_URL}/empleados`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/departamentos`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const dataEmp = await resEmp.json();
            const dataDep = await resDep.json();
            if (dataEmp.success) setEmpleados(dataEmp.data);
            if (dataDep.success) setDepartamentos(dataDep.data);
        } catch (e) { console.error(e); }
    };

    // Función Centralizada para Cargar Estadísticas
    const actualizarEstadisticas = async () => {
        setDashboardLoading(true);
        setTopDesempeno([]);
        setStatsDepartamentos([]); // Resetear comparativa
        setListadoAsistencias([]); // Resetear listado
        setCurrentPage(1); // Resetear a la página 1

        try {
            const token = getToken();
            const params = new URLSearchParams();

            // 1. Fechas
            if (modoFecha === 'intervalo' && fechaInicio && fechaFin) {
                params.append('fecha_inicio', fechaInicio);
                params.append('fecha_fin', fechaFin);
            }

            // 2. Determinar Endpoint Principal (KPIs)
            let endpointStats = '/reportes/estadisticas-globales';
            let localAlcance = alcance;

            // Si el alcance es empleado pero NO se ha seleccionado ninguno, caemos a Global visualmente
            if ((alcance === 'empleado' || alcance === 'departamento') && !idSeleccionado) {
                localAlcance = 'global';
            }

            if (localAlcance === 'empleado' && idSeleccionado) {
                endpointStats = `/reportes/estadisticas-empleado/${idSeleccionado}`;
            } else if (localAlcance === 'departamento' && idSeleccionado) {
                endpointStats = `/reportes/estadisticas-departamento/${idSeleccionado}`;
            }

            // 3. Ejecutar Peticiones en Paralelo
            const requests = [
                // Petición 0: Estadísticas Generales (KPIs y Gráficas básicas)
                fetch(`${API_BASE_URL}${endpointStats}?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ];

            // Si es vista por departamento (o global), traemos el Top 10 Empleados
            if (localAlcance === 'departamento' && idSeleccionado) {
                params.append('departamento_id', idSeleccionado);
                requests.push(fetch(`${API_BASE_URL}/reportes/desempeno?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } }));
            } else if (localAlcance === 'global') {
                // Petición 1: Top 10 Desempeño Empleados
                requests.push(fetch(`${API_BASE_URL}/reportes/desempeno?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } }));

                // Petición 2: Comparativa de Departamentos
                requests.push(fetch(`${API_BASE_URL}/reportes/comparativa-departamentos?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } }));
            }

            // Si es vista por empleado, traemos su listado de tabla Quincenal para previsualización
            if (localAlcance === 'empleado' && idSeleccionado) {
                let fInit = fechaInicio;
                let fEnd = fechaFin;
                if (!fInit || !fEnd) {
                    const hoy = new Date();
                    fEnd = hoy.toISOString().split('T')[0];
                    const hace15 = new Date();
                    hace15.setDate(hoy.getDate() - 15);
                    fInit = hace15.toISOString().split('T')[0];
                }
                if (modoFecha === 'siempre') {
                    fInit = '2024-01-01';
                    fEnd = new Date().toISOString().split('T')[0];
                }
                const url = `${API_BASE_URL}/reportes/checadas/quincena?empleado_id=${idSeleccionado}&fecha_inicio=${fInit}&fecha_fin=${fEnd}`;
                requests.push(fetch(url, { headers: { 'Authorization': `Bearer ${token}` } }));
            }

            const responses = await Promise.all(requests);
            const dataStats = await responses[0].json();

            if (dataStats.success) {
                setDashboardStats(dataStats.data);

                // Procesar Top 10 Empleados (Solo Global o Departamento)
                if (alcance !== 'empleado' && responses[1]) {
                    const dataDesempeno = await responses[1].json();
                    if (dataDesempeno.success && Array.isArray(dataDesempeno.data)) {
                        const top = dataDesempeno.data
                            .sort((a, b) => b.puntuales - a.puntuales)
                            .slice(0, 10);
                        setTopDesempeno(top);
                    }
                }

                // Procesar Comparativa Departamentos
                if (localAlcance === 'global' && responses[2]) {
                    const dataDeptos = await responses[2].json();
                    if (dataDeptos.success && Array.isArray(dataDeptos.data)) {
                        setStatsDepartamentos(dataDeptos.data);
                    }
                }

                // Procesar Listado de asistencias (Solo empleado)
                if (localAlcance === 'empleado' && responses[1]) {
                    const dataListado = await responses[1].json();
                    if (dataListado.success && dataListado.data?.dias) {
                        setListadoAsistencias(dataListado.data.dias);
                        const et = dataListado.data.empresa?.configuracion_reportes?.etiquetas_turnos;
                        setEtiquetasTurnos(et || ['Turno 1', 'Turno 2', 'Turno 3']);
                    }
                }

            } else {
                setDashboardStats(null);
            }
        } catch (error) {
            console.error("Error cargando estadísticas", error);
            setDashboardStats(null);
        } finally {
            setDashboardLoading(false);
        }
    };

    // Datos visuales calculados
    const chartData = useMemo(() => {
        if (!dashboardStats) return { pieData: [], incidenciasData: [] };

        const asistencias = dashboardStats.asistencias || {};

        const pieData = [
            { name: 'Puntuales', value: parseInt(asistencias.puntuales || 0), color: COLORS.puntual },
            { name: 'Retardos', value: parseInt(asistencias.retardos || 0), color: COLORS.retardo },
            { name: 'Faltas', value: parseInt(asistencias.faltas || 0), color: COLORS.falta },
        ].filter(i => i.value > 0);

        const incidenciasData = dashboardStats.incidencias?.map(inc => ({
            name: inc.tipo,
            cantidad: parseInt(inc.total)
        })) || [];

        return { pieData, incidenciasData };
    }, [dashboardStats]);

    // --- FUNCIONES DE EXPORTACIÓN (Sin cambios) ---
    const handleExport = async (formato) => {
        setExporting(true);
        try {
            if (exportCategoria === 'incidencias_rrhh') {
                if (alcance === 'empleado' && idSeleccionado) {
                    if (formato === 'pdf') await generarPdfIncidenciasRRHH();
                    else if (formato === 'excel') await generarExcelIncidenciasRRHH();
                    else if (formato === 'word') await generarWordIncidenciasRRHH();
                } else {
                    setAlertMsg('Por favor selecciona un Empleado específico para este reporte.');
                    setIsModalOpen(false);
                }
            } else if (exportCategoria === 'general' && alcance === 'global') {
                if (formato === 'pdf') {
                    // Simular PDF de dashboard o usar html2canvas (opcional)
                    setAlertMsg('Exportando PDF de Dashboard... (Simulado)');
                } else if (formato === 'excel') {
                    await generarExcelResumenEjecutivo();
                } else if (formato === 'word') {
                    await generarWordResumenEjecutivo();
                }
            } else if (exportCategoria === 'asistencias') {
                if (alcance === 'empleado' && idSeleccionado) {
                    if (formato === 'pdf') await generarPdfEmpleadoQuincenal();
                    else if (formato === 'excel') await generarExcelAsistencias('individual');
                    else if (formato === 'word') await generarWordAsistencias('individual');
                } else if (alcance === 'global') {
                    if (formato === 'pdf') await generarPdfAsistenciasGlobal();
                    else if (formato === 'excel') await generarExcelAsistencias('global');
                    else if (formato === 'word') await generarWordAsistencias('global');
                } else {
                    setAlertMsg('Por favor selecciona un Empleado o Alcance global para este reporte.');
                }
            } else {
                setAlertMsg(`Reporte ${formato.toUpperCase()} para ${exportCategoria} aún no implementado.`);
            }
        } catch (error) {
            console.error(error);
            setAlertMsg("Error al exportar: " + error.message);
        } finally {
            setExporting(false);
            if (!alertMsg) setIsModalOpen(false);
        }
    };

    const generarPdfEmpleadoQuincenal = async () => {
        try {
            const token = getToken();

            // Fechas a utilizar
            let fInit = fechaInicio;
            let fEnd = fechaFin;

            if (!fInit || !fEnd) {
                // Si no hay rango, por defecto usamos la quincena/mes actual o últimos 15 días
                const hoy = new Date();
                fEnd = hoy.toISOString().split('T')[0];
                const hace15 = new Date();
                hace15.setDate(hoy.getDate() - 15);
                fInit = hace15.toISOString().split('T')[0];
            }
            if (modoFecha === 'siempre') {
                fInit = '2024-01-01';
                fEnd = new Date().toISOString().split('T')[0];
            }

            // 1. Obtener la configuración actual de la empresa (para logos y encabezados)
            const resEmpresa = await fetch(`${API_BASE_URL}/empresas/mi-empresa`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataEmpresa = await resEmpresa.json();
            const configReportes = dataEmpresa.data?.configuracion_reportes || {};
            const logoEmpresa = dataEmpresa.data?.logo;
            const nombreEmpresa = dataEmpresa.data?.nombre || "REPORTE";
            const marcaAgua = configReportes.marca_agua || { activo: true, tipo: 'texto', texto: nombreEmpresa, opacity: 10, imagen: '' };

            // 2. Obtener los datos del reporte quincenal
            const url = `${API_BASE_URL}/reportes/checadas/quincena?empleado_id=${idSeleccionado}&fecha_inicio=${fInit}&fecha_fin=${fEnd}`;
            const resReporte = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const dataReporte = await resReporte.json();

            if (!dataReporte.success) {
                throw new Error('No se pudo obtener la información de las checadas.');
            }

            const { empleado, dias } = dataReporte.data;

            // 3. Crear instancia PDF
            const doc = new jsPDF('p', 'pt', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            let y = 30;

            // 1. Calcular Márgenes Dinámicos de Header y Footer para el Aspect Ratio
            const encab = configReportes.encabezado || {};
            const pie = configReportes.pie_pagina || {};

            let headerHeight = 100; // para texto por defecto
            if (encab.usar_imagen && encab.imagen) {
                try {
                    const props = doc.getImageProperties(encab.imagen);
                    const ratio = props.height / props.width;
                    headerHeight = pageWidth * ratio;
                } catch { headerHeight = 80; }
            }

            let footerHeight = 40;
            if (pie.usar_imagen && pie.imagen) {
                try {
                    const props = doc.getImageProperties(pie.imagen);
                    const ratio = props.height / props.width;
                    footerHeight = (pageWidth * ratio);
                } catch { footerHeight = 60; }
            }

            // Iniciar contenido de texto (Títulos) por debajo del Header
            y = headerHeight + 20;

            // Título principal
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text(`Departamento de Recursos Humanos`, pageWidth / 2, y, { align: 'center' });
            y += 20;
            doc.setFontSize(11);
            doc.text(`Reporte de Asistencias del Empleado`, pageWidth / 2, y, { align: 'center' });
            y += 20;

            doc.setFontSize(10);
            doc.text(`FECHA INICIO: ${fInit}   -   FECHA FIN: ${fEnd}`, pageWidth / 2, y, { align: 'center' });
            y += 25;

            // Datos del empleado
            doc.setFontSize(12);
            doc.text(`EMPLEADO: ${empleado.nombre?.toUpperCase() || ''}`, pageWidth / 2, y, { align: 'center' });
            if (empleado.rfc) {
                y += 15;
                doc.text(`RFC: ${empleado.rfc?.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });
            }
            y += 20;

            // 4. Construir las filas de Autotable
            const tableRows = [];

            for (const dia of dias) {
                const rowObj = {
                    dia_mes: `${dia.dia_semana.charAt(0).toUpperCase() + dia.dia_semana.slice(1)} ${dia.fecha}`,
                    t1_e: '', t1_s: '',
                    t2_e: '', t2_s: '',
                    t3_e: '', t3_s: ''
                };

                if (!dia.aplica && dia.incidencia) {
                    rowObj.t1_e = { content: `No Aplica (${dia.incidencia})`, colSpan: 6, styles: { halign: 'center', fontStyle: 'bold', textColor: '#0284c7', fillColor: '#f0f9ff' } };
                } else if (!dia.aplica) {
                    rowObj.t1_e = { content: 'No Aplica', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic', textColor: '#666' } };
                } else if (dia.turnos.length === 0) {
                    rowObj.t1_e = { content: 'Festivo o Sin Registros', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic', textColor: '#666' } };
                } else {
                    for (let n = 0; n < 3; n++) {
                        const t = dia.turnos[n];
                        if (t) {
                            const horE = t.entrada?.horario ? `H:${t.entrada.horario.substring(0, 5)}` : 'H:--';
                            const cheE = t.entrada?.checada ? `C:${t.entrada.checada}` : 'C:--';
                            const horS = t.salida?.horario ? `H:${t.salida.horario.substring(0, 5)}` : 'H:--';
                            const cheS = t.salida?.checada ? `C:${t.salida.checada}` : 'C:--';

                            rowObj[`t${n + 1}_e`] = `${horE}\n${cheE}`;
                            rowObj[`t${n + 1}_s`] = `${horS}\n${cheS}`;
                        } else {
                            rowObj[`t${n + 1}_e`] = 'No Aplica';
                            rowObj[`t${n + 1}_s`] = 'No Aplica';
                        }
                    }
                }

                tableRows.push([
                    rowObj.dia_mes,
                    rowObj.t1_e, rowObj.t1_s,
                    rowObj.t2_e, rowObj.t2_s,
                    rowObj.t3_e, rowObj.t3_s
                ]);
            }

            let etTurnosRaw = configReportes.etiquetas_turnos || ['TURNO 1', 'TURNO 2', 'TURNO 3'];
            const etTurnos = etTurnosRaw.map(t => typeof t === 'string' ? t : (t.nombre || 'TURNO'));

            // 5. Autotable Options
            autoTable(doc, {
                startY: y,
                margin: { top: headerHeight + 50, bottom: footerHeight + 20 },
                head: [
                    [
                        { content: 'DIA DEL MES', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                        { content: etTurnos[0].toUpperCase(), colSpan: 2, styles: { halign: 'center' } },
                        { content: etTurnos[1].toUpperCase(), colSpan: 2, styles: { halign: 'center' } },
                        { content: etTurnos[2].toUpperCase(), colSpan: 2, styles: { halign: 'center' } }
                    ],
                    ['Entrada', 'Salida', 'Entrada', 'Salida', 'Entrada', 'Salida']
                ],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: '#e2e8f0', textColor: '#1e293b', fontStyle: 'bold', fontSize: 9 },
                bodyStyles: { fontSize: 8, textColor: '#334155' },
                columnStyles: {
                    0: { cellWidth: 90 },
                },
                styles: { cellPadding: 4, halign: 'center', valign: 'middle' },
                didDrawPage: () => {
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.getHeight();
                    const pageWidth = pageSize.getWidth();

                    // --- MARCA DE AGUA ---
                    if (marcaAgua.activo) {
                        doc.saveGraphicsState();
                        doc.setGState(new doc.GState({ opacity: (marcaAgua.opacity || 10) / 100 }));
                        if (marcaAgua.tipo === 'imagen' && marcaAgua.imagen) {
                            try {
                                const imgProps = doc.getImageProperties(marcaAgua.imagen);
                                const ratio = imgProps.width / imgProps.height;
                                let wmWidth = pageWidth * 0.5;
                                let wmHeight = wmWidth / ratio;
                                if (wmHeight > pageHeight * 0.5) {
                                    wmHeight = pageHeight * 0.5;
                                    wmWidth = wmHeight * ratio;
                                }
                                doc.addImage(marcaAgua.imagen, imgProps.fileType || 'PNG', (pageWidth - wmWidth) / 2, (pageHeight - wmHeight) / 2, wmWidth, wmHeight);
                            } catch (e) {
                                console.warn('No se pudo procesar la imagen de marca de agua', e);
                            }
                        } else {
                            doc.setFontSize(50);
                            doc.setTextColor(100, 100, 100);
                            doc.text((marcaAgua.texto || '').toUpperCase(), pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                        }
                        doc.restoreGraphicsState();
                    }

                    // --- DRAW HEADER (REPETITIVO) ---
                    if (encab.usar_imagen && encab.imagen) {
                        try {
                            // El banner cubre todo el ancho y se ajusta la altura por ratio
                            doc.addImage(encab.imagen, 'JPEG', 0, 0, pageWidth, headerHeight);
                        } catch (e) { }
                    } else {
                        if (encab.mostrar_logo !== false && logoEmpresa) {
                            try {
                                doc.addImage(logoEmpresa, 'JPEG', 40, 20, 60, 60);
                            } catch (e) { }
                        }
                        doc.setFontSize(10);
                        doc.setTextColor(encab.color_texto || '#000000');
                        if (encab.texto_izquierdo) {
                            doc.text(doc.splitTextToSize(encab.texto_izquierdo, 150), 110, 30);
                        }
                        if (encab.texto_derecho) {
                            doc.text(doc.splitTextToSize(encab.texto_derecho, 200), pageWidth - 40, 30, { align: 'right' });
                        }
                    }

                    // --- DRAW FOOTER (REPETITIVO) ---
                    const pbY = pageHeight - Math.max(25, footerHeight / 2); // Ajuste vertical manual
                    if (pie.usar_imagen && pie.imagen) {
                        try {
                            // El banner footer usando ratio se posiciona al fondo absolucto
                            doc.addImage(pie.imagen, 'JPEG', 0, pageHeight - footerHeight, pageWidth, footerHeight);
                        } catch (e) { }
                    } else {
                        doc.setFontSize(8);
                        doc.setTextColor(pie.color_texto || '#666666');
                        if (pie.texto_central) {
                            doc.text(pie.texto_central, pageWidth / 2, pbY, { align: 'center' });
                        }
                    }

                    // --- NUMERACIÓN ---
                    if (pie.mostrar_numeracion !== false) {
                        doc.setFontSize(8);
                        let colText = pie.color_texto || '#666666';
                        // si es imagen, podemos intentar asegurar legibilidad asumiendo texto negro
                        if (pie.usar_imagen) colText = pie.color_texto || '#000000';
                        doc.setTextColor(colText);

                        // Si es banner completo, se superpone la pagina a la derecha ligeramente
                        const pageNumY = pie.usar_imagen && pie.imagen ? pageHeight - 15 : pbY;
                        doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageWidth - 40, pageNumY, { align: 'right' });
                    }
                }
            });

            const finalY = doc.lastAutoTable.finalY || y;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.text(`Nota: (H) -> Es el Horario del trabajador (C) -> Es la hora en que hace la checada`, pageWidth / 2, finalY + 15, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('_________________________________', pageWidth / 2, finalY + 60, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text('FIRMA DEL TRABAJADOR', pageWidth / 2, finalY + 75, { align: 'center' });

            // 6. Descargar archivo
            doc.save(`Reporte_Checadas_${empleado.nombre.replace(/\s+/g, '_')}_${fInit}.pdf`);

            setAlertMsg(`Reporte PDF generado correctamente.`);
            setIsModalOpen(false);

        } catch (error) {
            console.error('Error generando PDF', error);
            setAlertMsg(`Error al generar el PDF: ${error.message}`);
        } finally {
            setExporting(false);
        }
    };

    const generarPdfIncidenciasRRHH = async () => {
        try {
            const token = getToken();
            const fInit = fechaInicio || '2024-01-01';
            const fEnd = fechaFin || new Date().toISOString().split('T')[0];

            const resEmpresa = await fetch(`${API_BASE_URL}/empresas/mi-empresa`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataEmpresa = await resEmpresa.json();
            const configReportes = dataEmpresa.data?.configuracion_reportes || {};
            const logoEmpresa = dataEmpresa.data?.logo;
            const nombreEmpresa = dataEmpresa.data?.nombre || "REPORTE INCIDENCIAS";
            const marcaAgua = configReportes.marca_agua || { activo: true, tipo: 'texto', texto: nombreEmpresa, opacity: 10, imagen: '' };

            const url = `${API_BASE_URL}/reportes/incidencias/rrhh?empleado_id=${idSeleccionado}&fecha_inicio=${fInit}&fecha_fin=${fEnd}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();

            if (!result.success) throw new Error(result.message);

            const { empleado, incidencias, resumen_texto } = result.data;

            const doc = new jsPDF('p', 'pt', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const encab = configReportes.encabezado || {};
            const pie = configReportes.pie_pagina || {};

            let headerHeight = 80;
            if (encab.usar_imagen && encab.imagen) {
                const props = doc.getImageProperties(encab.imagen);
                headerHeight = pageWidth * (props.height / props.width);
            }

            const footerHeight = 40;

            const tableRows = incidencias.map(inc => [
                empleado.nombre.toUpperCase(),
                empleado.tipo_trabajador.toUpperCase(),
                inc.mes,
                inc.fecha,
                inc.hora,
                inc.turno,
                inc.tipo,
                resumen_texto
            ]);

            autoTable(doc, {
                startY: headerHeight + 50,
                margin: { top: headerHeight + 40, bottom: footerHeight + 20 },
                head: [['NOMBRE DEL TRABAJADOR', 'TIPO DE TRABAJADOR', 'MES', 'FECHA DE LA INCIDENCIA', 'HORARIO DE LA INCIDENCIA', 'TURNO', 'TIPO (FALTA/RETARDO)', 'TOTAL DE INCIDENCIAS']],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: '#f1f5f9', textColor: '#1e293b', fontStyle: 'bold', fontSize: 7, halign: 'center' },
                bodyStyles: { fontSize: 7, textColor: '#334155' },
                styles: { cellPadding: 3, halign: 'center', valign: 'middle', overflow: 'linebreak' },
                columnStyles: {
                    0: { cellWidth: 100 },
                    1: { cellWidth: 70 },
                    7: { cellWidth: 100 }
                },
                didDrawPage: (data) => {
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();

                    // --- MARCA DE AGUA ---
                    if (marcaAgua.activo) {
                        doc.saveGraphicsState();
                        doc.setGState(new doc.GState({ opacity: (marcaAgua.opacity || 10) / 100 }));
                        if (marcaAgua.tipo === 'imagen' && marcaAgua.imagen) {
                            try {
                                const imgProps = doc.getImageProperties(marcaAgua.imagen);
                                const ratio = imgProps.width / imgProps.height;
                                let wmWidth = pageWidth * 0.5;
                                let wmHeight = wmWidth / ratio;
                                if (wmHeight > pageHeight * 0.5) {
                                    wmHeight = pageHeight * 0.5;
                                    wmWidth = wmHeight * ratio;
                                }
                                doc.addImage(marcaAgua.imagen, imgProps.fileType || 'PNG', (pageWidth - wmWidth) / 2, (pageHeight - wmHeight) / 2, wmWidth, wmHeight);
                            } catch (e) {
                                console.warn('No se pudo procesar la imagen de marca de agua', e);
                            }
                        } else {
                            doc.setFontSize(50);
                            doc.setTextColor(100, 100, 100);
                            doc.text((marcaAgua.texto || '').toUpperCase(), pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                        }
                        doc.restoreGraphicsState();
                    }

                    if (encab.usar_imagen && encab.imagen) {
                        doc.addImage(encab.imagen, 'JPEG', 0, 0, pageWidth, headerHeight);
                    }
                    // Numeración
                    const str = "Página " + doc.internal.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.text(str, pageWidth - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
                }
            });

            doc.save(`Reporte_Incidencias_RRHH_${empleado.nombre.replace(/\s+/g, '_')}.pdf`);
            setAlertMsg("Reporte generado con éxito");
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            setAlertMsg("Error al generar PDF: " + error.message);
        } finally {
            setExporting(false);
        }
    };

    const generarExcelIncidenciasRRHH = async () => {
        try {
            const token = getToken();
            const fInit = fechaInicio || '2024-01-01';
            const fEnd = fechaFin || new Date().toISOString().split('T')[0];

            const url = `${API_BASE_URL}/reportes/incidencias/rrhh?empleado_id=${idSeleccionado}&fecha_inicio=${fInit}&fecha_fin=${fEnd}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();

            if (!result.success) throw new Error(result.message);

            const { empleado, incidencias, resumen_texto } = result.data;

            const rows = incidencias.map(inc => ({
                'NOMBRE DEL TRABAJADOR': empleado.nombre.toUpperCase(),
                'TIPO DE TRABAJADOR': empleado.tipo_trabajador.toUpperCase(),
                'MES': inc.mes,
                'FECHA DE LA INCIDENCIA': inc.fecha,
                'HORARIO DE LA INCIDENCIA': inc.hora,
                'TURNO': inc.turno,
                'TIPO (FALTA/RETARDO)': inc.tipo,
                'TOTAL DE INCIDENCIAS': resumen_texto
            }));

            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Incidencias");

            // Ajustar anchos
            const wscols = [
                { wch: 40 }, // Nombre
                { wch: 20 }, // Tipo
                { wch: 15 }, // Mes
                { wch: 15 }, // Fecha
                { wch: 15 }, // Hora
                { wch: 15 }, // Turno
                { wch: 20 }, // Tipo Inc
                { wch: 40 }  // Total
            ];
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `Reporte_Incidencias_RRHH_${empleado.nombre.replace(/\s+/g, '_')}.xlsx`);
            setAlertMsg("Reporte Excel generado con éxito");
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            setAlertMsg("Error al generar Excel: " + error.message);
        } finally {
            setExporting(false);
        }
    };

    const generarWordIncidenciasRRHH = async () => {
        try {
            const token = getToken();
            const fInit = fechaInicio || '2024-01-01';
            const fEnd = fechaFin || new Date().toISOString().split('T')[0];

            const url = `${API_BASE_URL}/reportes/incidencias/rrhh?empleado_id=${idSeleccionado}&fecha_inicio=${fInit}&fecha_fin=${fEnd}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();

            if (!result.success) throw new Error(result.message);

            const { empleado, incidencias, resumen_texto } = result.data;

            const tableRows = [
                new TableRow({
                    children: [
                        'NOMBRE DEL TRABAJADOR', 'TIPO DE TRABAJADOR', 'MES', 'FECHA', 'HORARIO', 'TURNO', 'TIPO', 'TOTAL'
                    ].map(h => new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16 })], alignment: AlignmentType.CENTER })],
                        shading: { fill: "F1F5F9" }
                    }))
                }),
                ...incidencias.map(inc => new TableRow({
                    children: [
                        empleado.nombre.toUpperCase(),
                        empleado.tipo_trabajador.toUpperCase(),
                        inc.mes,
                        inc.fecha,
                        inc.hora,
                        inc.turno,
                        inc.tipo,
                        resumen_texto
                    ].map(text => new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text, size: 14 })], alignment: AlignmentType.CENTER })]
                    }))
                }))
            ];

            const doc = new Document({
                sections: [{
                    properties: { page: { size: { orientation: 'landscape' } } },
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: "REPORTE DE INCIDENCIAS RRHH", bold: true, size: 28 })],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 }
                        }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: tableRows
                        })
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Reporte_Incidencias_RRHH_${empleado.nombre.replace(/\s+/g, '_')}.docx`);
            setAlertMsg("Reporte Word generado con éxito");
        } catch (error) {
            console.error(error);
            throw new Error("Error al generar Word: " + error.message);
        }
    };

    const generarExcelResumenEjecutivo = async () => {
        try {
            if (!dashboardStats) return;

            const resPunt = [
                ['INDICADOR', 'CANTIDAD', 'PORCENTAJE'],
                ['Puntuales', dashboardStats.asistencias.puntuales, `${((dashboardStats.asistencias.puntuales / dashboardStats.asistencias.total) * 100).toFixed(1)}%`],
                ['Retardos', dashboardStats.asistencias.retardos, `${((dashboardStats.asistencias.retardos / dashboardStats.asistencias.total) * 100).toFixed(1)}%`],
                ['Faltas', dashboardStats.asistencias.faltas, `${((dashboardStats.asistencias.faltas / dashboardStats.asistencias.total) * 100).toFixed(1)}%`],
                ['TOTAL', dashboardStats.asistencias.total, '100%']
            ];

            const topRows = topDesempeno.map((emp, i) => ([
                i + 1, emp.empleado_nombre, emp.puntuales, emp.retardos, emp.faltas, `${emp.porcentaje_puntualidad}%`
            ]));

            const workbook = XLSX.utils.book_new();
            
            const wsResumen = XLSX.utils.aoa_to_sheet([['RESUMEN EJECUTIVO DE ASISTENCIAS'], [], ...resPunt]);
            XLSX.utils.book_append_sheet(workbook, wsResumen, "KPIs Generales");

            const wsTop = XLSX.utils.aoa_to_sheet([
                ['RANKING DE EMPLEADOS (TOP 10)'], 
                [], 
                ['PUESTO', 'EMPLEADO', 'PUNTUALES', 'RETARDOS', 'FALTAS', 'SCORE'],
                ...topRows
            ]);
            XLSX.utils.book_append_sheet(workbook, wsTop, "Top Desempeño");

            XLSX.writeFile(workbook, `Resumen_Ejecutivo_${fechaInicio || 'Histórico'}.xlsx`);
            setAlertMsg("Resumen Ejecutivo Excel generado con éxito");
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const generarWordResumenEjecutivo = async () => {
        try {
            if (!dashboardStats) return;

            const kpiTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: ['INDICADOR', 'VALOR', '%'].map(h => new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })], alignment: AlignmentType.CENTER })],
                            shading: { fill: "E2E8F0" }
                        }))
                    }),
                    ...[
                        ['Puntuales', dashboardStats.asistencias.puntuales, `${((dashboardStats.asistencias.puntuales / dashboardStats.asistencias.total) * 100).toFixed(1)}%`],
                        ['Retardos', dashboardStats.asistencias.retardos, `${((dashboardStats.asistencias.retardos / dashboardStats.asistencias.total) * 100).toFixed(1)}%`],
                        ['Faltas', dashboardStats.asistencias.faltas, `${((dashboardStats.asistencias.faltas / dashboardStats.asistencias.total) * 100).toFixed(1)}%`]
                    ].map(row => new TableRow({
                        children: row.map(text => new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: String(text) })], alignment: AlignmentType.CENTER })]
                        }))
                    }))
                ]
            });

            const topTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: ['#', 'EMPLEADO', 'SCORE'].map(h => new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })], alignment: AlignmentType.CENTER })],
                            shading: { fill: "E2E8F0" }
                        }))
                    }),
                    ...topDesempeno.map((emp, i) => new TableRow({
                        children: [
                            String(i + 1),
                            emp.empleado_nombre,
                            `${emp.porcentaje_puntualidad}%`
                        ].map(text => new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text })], alignment: AlignmentType.CENTER })]
                        }))
                    }))
                ]
            });

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ text: "RESUMEN EJECUTIVO DE ASISTENCIAS", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                        new Paragraph({ text: `Periodo: ${fechaInicio || 'Inicio'} al ${fechaFin || 'Hoy'}`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                        
                        new Paragraph({ text: "KPIs de Puntualidad", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
                        kpiTable,

                        new Paragraph({ text: "Ranking de Empleados (Top 10)", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
                        topTable
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Resumen_Ejecutivo_${fechaInicio || 'Histórico'}.docx`);
            setAlertMsg("Resumen Ejecutivo Word generado con éxito");
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const generarExcelAsistencias = async (tipo) => {
        try {
            const token = getToken();
            const fInit = fechaInicio || '2024-01-01';
            const fEnd = fechaFin || new Date().toISOString().split('T')[0];
            
            let url = `${API_BASE_URL}/reportes/detalle-asistencias?fecha_inicio=${fInit}&fecha_fin=${fEnd}`;
            if (tipo === 'individual') url += `&empleado_id=${idSeleccionado}`;
            if (filtroDepartamento !== 'todos') url += `&departamento_id=${filtroDepartamento}`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();
            if (!result.success) throw new Error(result.message);

            const rows = result.data.map(reg => ({
                'EMPLEADO': reg.empleado_nombre || 'N/A',
                'DEPARTAMENTO': reg.departamento_nombre || 'N/A',
                'FECHA': new Date(reg.fecha_registro).toLocaleDateString(),
                'HORA': new Date(reg.fecha_registro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                'TIPO': reg.tipo === 'entrada' ? 'Entrada' : 'Salida',
                'ESTADO': reg.estado.toUpperCase()
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Asistencias");
            XLSX.writeFile(wb, `Detalle_Asistencias_${tipo}_${fInit}_al_${fEnd}.xlsx`);
            setAlertMsg("Exportación Excel completada");
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const generarWordAsistencias = async (tipo) => {
        try {
            const token = getToken();
            const fInit = fechaInicio || '2024-01-01';
            const fEnd = fechaFin || new Date().toISOString().split('T')[0];
            
            let url = `${API_BASE_URL}/reportes/detalle-asistencias?fecha_inicio=${fInit}&fecha_fin=${fEnd}`;
            if (tipo === 'individual') url += `&empleado_id=${idSeleccionado}`;
            if (filtroDepartamento !== 'todos') url += `&departamento_id=${filtroDepartamento}`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();
            if (!result.success) throw new Error(result.message);

            const tableRows = [
                new TableRow({
                    children: ['EMPLEADO', 'DEPARTAMENTO', 'FECHA', 'HORA', 'TIPO', 'ESTADO'].map(h => new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })], alignment: AlignmentType.CENTER })],
                        shading: { fill: "F1F5F9" }
                    }))
                }),
                ...result.data.map(reg => new TableRow({
                    children: [
                        reg.empleado_nombre || 'N/A',
                        reg.departamento_nombre || 'N/A',
                        new Date(reg.fecha_registro).toLocaleDateString(),
                        new Date(reg.fecha_registro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        reg.tipo === 'entrada' ? 'Entrada' : 'Salida',
                        reg.estado.toUpperCase()
                    ].map(text => new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text })], alignment: AlignmentType.CENTER })]
                    }))
                }))
            ];

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ text: "DETALLE DE ASISTENCIAS", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                        new Paragraph({ text: `Periodo: ${fInit} al ${fEnd}`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows })
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Detalle_Asistencias_${tipo}.docx`);
            setAlertMsg("Exportación Word completada");
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const generarPdfAsistenciasGlobal = async () => {
        try {
            const token = getToken();
            const fInit = fechaInicio || '2024-01-01';
            const fEnd = fechaFin || new Date().toISOString().split('T')[0];
            
            const url = `${API_BASE_URL}/reportes/detalle-asistencias?fecha_inicio=${fInit}&fecha_fin=${fEnd}${filtroDepartamento !== 'todos' ? `&departamento_id=${filtroDepartamento}` : ''}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();
            if (!result.success) throw new Error(result.message);

            // Obtener nombre de empresa para marca de agua
            const resEmpresa = await fetch(`${API_BASE_URL}/empresas/mi-empresa`, { headers: { 'Authorization': `Bearer ${token}` } });
            const dataEmpresa = await resEmpresa.json();
            const nombreEmpresa = dataEmpresa.data?.nombre || "REPORTE GLOBAL";
            const configReportes = dataEmpresa.data?.configuracion_reportes || {};
            const marcaAgua = configReportes.marca_agua || { activo: true, tipo: 'texto', texto: nombreEmpresa, opacity: 10, imagen: '' };

            const doc = new jsPDF('p', 'pt', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            autoTable(doc, {
                head: [['EMPLEADO', 'DEPARTAMENTO', 'FECHA', 'HORA', 'TIPO', 'ESTADO']],
                body: result.data.map(reg => [
                    reg.empleado_nombre,
                    reg.departamento_nombre,
                    new Date(reg.fecha_registro).toLocaleDateString(),
                    new Date(reg.fecha_registro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    reg.tipo.toUpperCase(),
                    reg.estado.toUpperCase()
                ]),
                theme: 'grid',
                headStyles: { fillColor: '#f1f5f9', textColor: '#1e293b' },
                styles: { fontSize: 8 },
                didDrawPage: () => {
                    const pageHeight = doc.internal.pageSize.getHeight();
                    
                    // --- MARCA DE AGUA ---
                    if (marcaAgua.activo) {
                        doc.saveGraphicsState();
                        doc.setGState(new doc.GState({ opacity: (marcaAgua.opacity || 10) / 100 }));
                        if (marcaAgua.tipo === 'imagen' && marcaAgua.imagen) {
                            try {
                                const imgProps = doc.getImageProperties(marcaAgua.imagen);
                                const ratio = imgProps.width / imgProps.height;
                                let wmWidth = pageWidth * 0.5;
                                let wmHeight = wmWidth / ratio;
                                if (wmHeight > pageHeight * 0.5) {
                                    wmHeight = pageHeight * 0.5;
                                    wmWidth = wmHeight * ratio;
                                }
                                doc.addImage(marcaAgua.imagen, imgProps.fileType || 'PNG', (pageWidth - wmWidth) / 2, (pageHeight - wmHeight) / 2, wmWidth, wmHeight);
                            } catch (e) {
                                console.warn('No se pudo procesar la imagen de marca de agua', e);
                            }
                        } else {
                            doc.setFontSize(50);
                            doc.setTextColor(100, 100, 100);
                            doc.text((marcaAgua.texto || '').toUpperCase(), pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                        }
                        doc.restoreGraphicsState();
                    }
                }
            });

            doc.save(`Detalle_Asistencias_Global_${fInit}_al_${fEnd}.pdf`);
            setAlertMsg("Exportación PDF completada");
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* --- BARRA DE FILTROS --- */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4">

                    {/* Selectores de Modalidad General vs Empleado */}
                    <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => { setAlcance('global'); setIdSeleccionado(''); }}
                            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${alcance === 'global' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Vista General
                        </button>
                        <button
                            onClick={() => setAlcance('empleado')}
                            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${alcance === 'empleado' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Por Empleado
                        </button>
                    </div>

                    <div className="flex flex-col xl:flex-row gap-4 items-end xl:items-center">
                        <div className={`w-full xl:w-auto grid gap-4 flex-1 ${alcance === 'empleado' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>

                            {/* Selector Específico de Empleado (Oculto en Vista General) */}
                            {alcance === 'empleado' && (
                                <div className="animate-in fade-in zoom-in-95 duration-200 w-full">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">
                                        Seleccionar Empleado:
                                    </label>
                                    <SearchableSelect
                                        options={empleados}
                                        value={idSeleccionado}
                                        onChange={setIdSeleccionado}
                                    />
                                </div>
                            )}

                            {/* Selector de Tiempo */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">Periodo de Tiempo:</label>
                                <div className="relative">
                                    <select
                                        value={modoFecha}
                                        onChange={(e) => setModoFecha(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-transparent focus:bg-white dark:focus:bg-gray-600 border focus:border-blue-500 rounded-xl text-sm font-medium dark:text-white transition-all outline-none appearance-none"
                                    >
                                        <option value="intervalo">Rango de Fechas</option>
                                        <option value="siempre">Histórico Completo</option>
                                    </select>
                                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Inputs de Fecha */}
                        {modoFecha === 'intervalo' && (
                            <div className="flex gap-2 w-full xl:w-auto animate-in fade-in slide-in-from-left-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-1.5 ml-1">Inicio</label>
                                    <input
                                        type="date"
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-1.5 ml-1">Fin</label>
                                    <input
                                        type="date"
                                        value={fechaFin}
                                        onChange={(e) => setFechaFin(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Botones de Acción */}
                        <div className="w-full xl:w-auto flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-transparent uppercase mb-1.5 ml-1 select-none hidden xl:block">.</label>
                                <button
                                    onClick={actualizarEstadisticas}
                                    disabled={dashboardLoading}
                                    className="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                >
                                    {dashboardLoading ? (
                                        <DynamicLoader size="tiny" layout="row" />
                                    ) : (
                                        <RefreshCw className="w-5 h-5" />
                                    )}
                                    <span className="hidden sm:inline">Actualizar</span>
                                </button>
                            </div>

                            {alcance === 'empleado' && dashboardStats && (
                                <div className="flex-1 animate-in fade-in zoom-in">
                                    <label className="block text-xs font-bold text-transparent uppercase mb-1.5 ml-1 select-none hidden xl:block">.</label>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-full px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FileText className="w-5 h-5" />
                                        <span className="hidden sm:inline">Exportar</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- CONTENIDO DEL DASHBOARD --- */}
                {exporting && (
                    <div className="mb-6">
                        <DynamicLoader text="Generando reporte..." />
                    </div>
                )}
                {dashboardLoading ? (
                    <div className="h-96 flex flex-col items-center justify-center text-gray-400">
                        <DynamicLoader size="medium" />
                        <p>Analizando datos...</p>
                    </div>
                ) : (dashboardStats || (!idSeleccionado && alcance === 'empleado')) ? (
                    <div ref={chartContainerRef} className="space-y-6 animate-in fade-in duration-500">

                        {/* KPIs Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard title="Puntualidad" value={dashboardStats?.asistencias?.puntuales || 0} total={dashboardStats?.asistencias?.total || 0} icon={CheckCircle} color="text-green-600" bg="bg-green-50" />
                            <KpiCard title="Retardos" value={dashboardStats?.asistencias?.retardos || 0} total={dashboardStats?.asistencias?.total || 0} icon={AlertCircle} color="text-yellow-600" bg="bg-yellow-50" />
                            <KpiCard title="Faltas" value={dashboardStats?.asistencias?.faltas || 0} total={dashboardStats?.asistencias?.total || 0} icon={X} color="text-red-600" bg="bg-red-50" />
                            <KpiCard title="Total Registros" value={dashboardStats?.asistencias?.total || 0} sub="En periodo seleccionado" icon={Users} color="text-blue-600" bg="bg-blue-50" />
                        </div>

                        {/* ==========================================================
                            SECCIÓN NUEVA: COMPARATIVA DE DEPARTAMENTOS
                           ========================================================== */}
                        {(!idSeleccionado || alcance === 'global') && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 w-full animate-in slide-in-from-bottom-2">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        Comparativa: Departamentos
                                    </h3>
                                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                                        Ranking de Eficiencia
                                    </span>
                                </div>

                                <div className="w-full h-[350px] min-h-[350px]">
                                    {statsDepartamentos.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <BarChart
                                                data={statsDepartamentos}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                <XAxis
                                                    dataKey="nombre"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                                />
                                                <YAxis axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#fff',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                    }}
                                                    cursor={{ fill: 'var(--tooltip-cursor-bg, #f3f4f6)' }}
                                                />
                                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                <Bar name="Puntuales" dataKey="puntuales" fill={COLORS.puntual} radius={[4, 4, 0, 0]} maxBarSize={50} />
                                                <Bar name="Retardos" dataKey="retardos" fill={COLORS.retardo} radius={[4, 4, 0, 0]} maxBarSize={50} />
                                                <Bar name="Faltas" dataKey="faltas" fill={COLORS.falta} radius={[4, 4, 0, 0]} maxBarSize={50} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                                            <Building2 className="w-8 h-8 mb-2 opacity-50" />
                                            <p className="text-sm">Sin datos departamentales suficientes para comparar</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* ========================================================== */}

                        {/* Contenido Visual (Grafica Circular, Top 10 Empleados, Incidencias) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Gráfica Circular Comparativa */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 col-span-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                                    <PieIcon className="w-5 h-5 text-gray-400" /> Distribución General
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Puntuales vs Retardos vs Faltas</p>

                                {chartData.pieData.length > 0 ? (
                                    <div className="flex-1 h-[300px] min-h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <PieChart>
                                                <Pie
                                                    data={chartData.pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {chartData.pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm border-2 border-dashed border-gray-100 rounded-xl">
                                        Sin datos para graficar
                                    </div>
                                )}
                            </div>

                            {/* Top 10 Desempeño Empleados */}
                            {(alcance === 'departamento' || alcance === 'global') && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 col-span-1 lg:col-span-2 flex flex-col">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-yellow-500" />
                                            Top 10 Empleados
                                        </h3>
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                                            Mayor Puntualidad
                                        </span>
                                    </div>

                                    <div className="flex-1 overflow-x-auto">
                                        {topDesempeno.length > 0 ? (
                                            <table className="min-w-full">
                                                <thead>
                                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                                        <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase py-2">Empleado</th>
                                                        <th className="text-center text-xs font-bold text-green-600 dark:text-green-500 uppercase py-2">Puntuales</th>
                                                        <th className="text-center text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase py-2">Retardos</th>
                                                        <th className="text-center text-xs font-bold text-red-600 dark:text-red-500 uppercase py-2">Faltas</th>
                                                        <th className="text-center text-xs font-bold text-blue-600 dark:text-blue-500 uppercase py-2">Score</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                                    {topDesempeno.map((emp, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                            <td className="py-3 text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                                <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${idx < 3 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                                                    {idx + 1}
                                                                </span>
                                                                {emp.empleado_nombre}
                                                            </td>
                                                            <td className="text-center text-sm text-gray-600 dark:text-gray-400">{emp.puntuales}</td>
                                                            <td className="text-center text-sm text-gray-600 dark:text-gray-400">{emp.retardos}</td>
                                                            <td className="text-center text-sm text-gray-600 dark:text-gray-400">{emp.faltas}</td>
                                                            <td className="text-center text-sm font-bold text-blue-700 dark:text-blue-400">{emp.porcentaje_puntualidad}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">
                                                No hay registros de desempeño suficientes
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Listado de Asistencias (Empleado Único) Columna derecha ancha */}
                            {alcance === 'empleado' && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 col-span-1 lg:col-span-2 flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                        <FileSpreadsheet className="w-5 h-5 text-gray-400" /> Listado de Asistencias
                                    </h3>
                                    <div className="flex-1 overflow-x-auto">
                                        {listadoAsistencias.length > 0 ? (
                                            <>
                                                <table className="min-w-full mb-4">
                                                    <thead>
                                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                                            <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase py-2 hidden md:table-cell">Día del Mes</th>
                                                            <th className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase py-2">{typeof etiquetasTurnos[0] === 'string' ? etiquetasTurnos[0] : etiquetasTurnos[0].nombre}</th>
                                                            <th className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase py-2">{typeof etiquetasTurnos[1] === 'string' ? etiquetasTurnos[1] : etiquetasTurnos[1].nombre}</th>
                                                            <th className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase py-2">{typeof etiquetasTurnos[2] === 'string' ? etiquetasTurnos[2] : etiquetasTurnos[2].nombre}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                                        {listadoAsistencias.slice((currentPage - 1) * 7, currentPage * 7).map((dia, idx) => {
                                                            const noAplica = !dia.aplica && !dia.incidencia;
                                                            const esIncidencia = !dia.aplica && dia.incidencia;
                                                            const festivo = dia.aplica && dia.turnos.length === 0;

                                                            return (
                                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                                    <td className="py-2 text-xs font-medium text-gray-800 dark:text-gray-200 border-r border-gray-100 dark:border-gray-700/50 pr-2 block md:table-cell">
                                                                        {dia.dia_semana.charAt(0).toUpperCase() + dia.dia_semana.slice(1)} <br /> {dia.fecha}
                                                                    </td>
                                                                    {esIncidencia ? (
                                                                        <td colSpan={3} className="text-center py-2 relative">
                                                                           <div className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-50/80 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50 rounded-lg shadow-sm">
                                                                               <span className="text-xs font-bold text-blue-700 dark:text-blue-400 tracking-wide uppercase">No Aplica: {dia.incidencia}</span>
                                                                           </div>
                                                                        </td>
                                                                    ) : noAplica ? (
                                                                        <td colSpan={3} className="text-center text-xs text-gray-400 italic py-2">No Aplica</td>
                                                                    ) : festivo ? (
                                                                        <td colSpan={3} className="text-center text-xs text-gray-400 italic py-2">Festivo o Sin Registros</td>
                                                                    ) : (
                                                                        <>
                                                                            {[0, 1, 2].map(n => {
                                                                                const t = dia.turnos[n];
                                                                                if (!t) return <td key={n} className="text-center text-xs text-gray-400 italic py-2">--</td>;

                                                                                const hE = t.entrada?.horario ? `H: ${formatTime(t.entrada.horario)}` : 'H: --';
                                                                                const cE = t.entrada?.checada ? `C: ${formatTime(t.entrada.checada)}` : 'C: --';
                                                                                const hS = t.salida?.horario ? `H: ${formatTime(t.salida.horario)}` : 'H: --';
                                                                                const cS = t.salida?.checada ? `C: ${formatTime(t.salida.checada)}` : 'C: --';

                                                                                return (
                                                                                    <td key={n} className="text-center text-[10px] md:text-xs text-gray-600 dark:text-gray-400 py-2 border-r border-gray-100 dark:border-gray-700/50 last:border-0">
                                                                                        <div className="grid grid-cols-2 gap-1 mb-1">
                                                                                            <span className="font-semibold text-blue-600 dark:text-blue-400">{hE}</span>
                                                                                            <span className="font-semibold text-purple-600 dark:text-purple-400">{hS}</span>
                                                                                        </div>
                                                                                        <div className="grid grid-cols-2 gap-1">
                                                                                            <span>{cE}</span>
                                                                                            <span>{cS}</span>
                                                                                        </div>
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                        </>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>

                                                {/* Paginación Reutilizable */}
                                                <Pagination
                                                    pagina={currentPage}
                                                    totalPaginas={Math.ceil(listadoAsistencias.length / 7)}
                                                    total={listadoAsistencias.length}
                                                    porPagina={7}
                                                    onChange={setCurrentPage}
                                                />
                                            </>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 italic text-sm py-10">
                                                <Calendar className="w-8 h-8 mb-2 opacity-50" />
                                                Sin asistencias recientes
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-full mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">No hay datos disponibles</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-md text-center">
                            No se encontraron registros para los filtros seleccionados.
                        </p>
                    </div>
                )}
            </div>

            {alertMsg && <ConfirmBox message={alertMsg} onConfirm={() => setAlertMsg(null)} />}

            {/* --- MODAL DE DESCARGA (Código previo mantenido igual) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Descargar Reporte</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Selecciona el formato de salida</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 space-y-3">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tipo de Detalle</label>
                                <select
                                    value={exportCategoria}
                                    onChange={(e) => setExportCategoria(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="general">Resumen Ejecutivo (Dashboard)</option>
                                    <option value="asistencias">Detalle de Asistencias (Tabla)</option>
                                    <option value="incidencias_rrhh">Reporte de Incidencias RRHH (TecNM)</option>
                                </select>
                            </div>

                            {exporting ? (
                                <div className="py-6 text-center bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <DynamicLoader size="small" />
                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Generando documento...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    <button onClick={() => handleExport('excel')} className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-200 dark:hover:border-green-800 transition-all group text-left">
                                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                                            <FileSpreadsheet className="w-5 h-5 text-green-700 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <span className="block font-bold text-sm text-gray-800 dark:text-gray-200 group-hover:text-green-800 dark:group-hover:text-green-300">Excel (.xlsx)</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Ideal para análisis de datos</span>
                                        </div>
                                    </button>

                                    <button onClick={() => handleExport('pdf')} className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-200 dark:hover:border-red-800 transition-all group text-left">
                                        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                                            <FileIcon className="w-5 h-5 text-red-700 dark:text-red-400" />
                                        </div>
                                        <div>
                                            <span className="block font-bold text-sm text-gray-800 dark:text-gray-200 group-hover:text-red-800 dark:group-hover:text-red-300">PDF (.pdf)</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Documento visual para imprimir</span>
                                        </div>
                                    </button>

                                    <button onClick={() => handleExport('word')} className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800 transition-all group text-left">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                                            <FileText className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <span className="block font-bold text-sm text-gray-800 dark:text-gray-200 group-hover:text-blue-800 dark:group-hover:text-blue-300">Word (.docx)</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Documento editable</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente KPI Card
const KpiCard = ({ title, value, total, sub, icon: Icon, color, bg }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-start justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{title}</p>
            <h4 className="text-3xl font-bold text-gray-900 dark:text-white">{value || 0}</h4>
            {total ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">
                    {total > 0 ? ((value / total) * 100).toFixed(1) : 0}% del total
                </p>
            ) : null}
            {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bg}`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
    </div>
);

export default Reportes;