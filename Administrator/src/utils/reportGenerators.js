// utils/reportGenerators.js
// Generadores de reportes en múltiples formatos

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, HeadingLevel } from 'docx';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

// ==================== GENERACIÓN DE PDF ====================

/**
 * Generar PDF para cualquier tipo de reporte
 * @param {Object} datos - Datos del reporte del backend
 * @param {string} tipoReporte - Tipo de reporte (individual, departamental, global, incidencias)
 * @returns {jsPDF} Documento PDF generado
 */
export const generarReportePDF = (datos, tipoReporte) => {
    const doc = new jsPDF();

    // Header principal
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text('FASITLAC', 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Sistema de Control de Asistencia', 105, 21, { align: 'center' });

    // Línea separadora
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 24, 190, 24);

    // Título del reporte
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont(undefined, 'bold');
    const titulos = {
        individual: 'Reporte Individual de Empleado',
        departamental: 'Reporte por Departamento',
        global: 'Reporte Ejecutivo Global',
        incidencias: 'Reporte de Incidencias'
    };
    doc.text(titulos[tipoReporte], 105, 32, { align: 'center' });

    // Información del período
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont(undefined, 'normal');
    doc.text(`Período: ${datos.periodo.fecha_inicio} a ${datos.periodo.fecha_fin}`, 105, 38, { align: 'center' });
    doc.text(`Generado: ${new Date(datos.generado_en).toLocaleString('es-MX')}`, 105, 43, { align: 'center' });

    let yPos = 50;

    // Contenido específico por tipo de reporte
    switch (tipoReporte) {
        case 'individual':
            yPos = generarPDFIndividual(doc, datos, yPos);
            break;
        case 'departamental':
            yPos = generarPDFDepartamental(doc, datos, yPos);
            break;
        case 'global':
            yPos = generarPDFGlobal(doc, datos, yPos);
            break;
        case 'incidencias':
            yPos = generarPDFIncidencias(doc, datos, yPos);
            break;
    }

    // Footer en todas las páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
        doc.text('FASITLAC - Sistema de Asistencia', 105, 289, { align: 'center' });
    }

    return doc;
};

const generarPDFIndividual = (doc, datos, yPos) => {
    // Información del empleado
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Información del Empleado', 20, yPos);
    yPos += 2;

    // Línea debajo del título
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.8);
    doc.line(20, yPos, 70, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(51, 65, 85);

    const infoEmpleado = [
        ['Nombre:', datos.empleado.nombre],
        ['RFC:', datos.empleado.rfc],
        ['NSS:', datos.empleado.nss],
        ['Email:', datos.empleado.email || 'No registrado'],
        ['Teléfono:', datos.empleado.telefono || 'No registrado']
    ];

    infoEmpleado.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(label, 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(value, 50, yPos);
        yPos += 6;
    });

    yPos += 5;

    // Estadísticas del período
    if (datos.estadisticas) {
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Estadísticas del Período', 20, yPos);
        yPos += 2;

        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.8);
        doc.line(20, yPos, 75, yPos);
        yPos += 8;

        const statsTable = [
            ['Métrica', 'Valor'],
            ['Días Asistidos', datos.estadisticas.dias_asistidos.toString()],
            ['Total Entradas', datos.estadisticas.total_entradas.toString()],
            ['Total Salidas', datos.estadisticas.total_salidas.toString()],
            ['Promedio Horas Diarias', (datos.estadisticas.promedio_horas_diarias || 0).toFixed(2) + ' hrs']
        ];

        doc.autoTable({
            startY: yPos,
            head: [statsTable[0]],
            body: statsTable.slice(1),
            theme: 'striped',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 10
            },
            bodyStyles: {
                fontSize: 9
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            margin: { left: 20, right: 20 }
        });

        yPos = doc.lastAutoTable.finalY + 10;
    }

    // Registros de asistencia
    if (datos.registros_asistencia && datos.registros_asistencia.length > 0) {
        if (yPos > 230) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Registros de Asistencia', 20, yPos);
        yPos += 2;

        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.8);
        doc.line(20, yPos, 75, yPos);
        yPos += 8;

        const registrosTable = [
            ['Fecha', 'Entrada', 'Salida', 'Horas', 'Método Entrada']
        ];

        datos.registros_asistencia.forEach(reg => {
            registrosTable.push([
                reg.fecha,
                reg.hora_entrada || 'N/A',
                reg.hora_salida || 'N/A',
                reg.horas_trabajadas ? reg.horas_trabajadas.toFixed(2) : 'N/A',
                reg.metodo_entrada || 'N/A'
            ]);
        });

        doc.autoTable({
            startY: yPos,
            head: [registrosTable[0]],
            body: registrosTable.slice(1),
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 8
            },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 20 },
                4: { cellWidth: 35 }
            },
            margin: { left: 20, right: 20 }
        });

        yPos = doc.lastAutoTable.finalY + 10;
    }

    // Incidencias
    if (datos.incidencias && datos.incidencias.length > 0) {
        if (yPos > 230) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Incidencias', 20, yPos);
        yPos += 2;

        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.8);
        doc.line(20, yPos, 45, yPos);
        yPos += 8;

        const incidenciasTable = [
            ['Tipo', 'Motivo', 'Inicio', 'Fin', 'Días', 'Estado']
        ];

        datos.incidencias.forEach(inc => {
            incidenciasTable.push([
                inc.tipo_incidencia,
                (inc.motivo || 'N/A').substring(0, 25),
                inc.fecha_ini,
                inc.fecha_fin,
                inc.dias_duracion.toString(),
                inc.estado
            ]);
        });

        doc.autoTable({
            startY: yPos,
            head: [incidenciasTable[0]],
            body: incidenciasTable.slice(1),
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 7
            },
            margin: { left: 20, right: 20 }
        });
    }

    return yPos;
};

const generarPDFDepartamental = (doc, datos, yPos) => {
    // Información del departamento
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Departamento: ${datos.departamento.nombre}`, 20, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Empleados: ${datos.departamento.total_empleados}`, 20, yPos);
    yPos += 5;

    if (datos.departamento.descripcion) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Descripción: ${datos.departamento.descripcion}`, 20, yPos);
        yPos += 5;
    }

    yPos += 5;

    // Estadísticas del departamento
    if (datos.estadisticas_departamento) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Resumen General', 20, yPos);
        yPos += 7;

        const statsData = [
            ['Promedio Asistencia Diaria:', datos.estadisticas_departamento.promedio_asistencia_diaria.toFixed(2)],
            ['Total Registros:', datos.estadisticas_departamento.total_registros_periodo.toString()],
            ['Porcentaje Asistencia:', datos.estadisticas_departamento.porcentaje_asistencia.toFixed(2) + '%']
        ];

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        statsData.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(label, 20, yPos);
            doc.setFont(undefined, 'normal');
            doc.text(value, 80, yPos);
            yPos += 5;
        });

        yPos += 5;
    }

    // Tabla de empleados
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Empleados del Departamento', 20, yPos);
    yPos += 7;

    const empleadosTable = [
        ['Nombre', 'RFC', 'Días', 'Entr.', 'Sal.', 'Hrs Prom.']
    ];

    datos.empleados.forEach(emp => {
        empleadosTable.push([
            emp.nombre.substring(0, 30),
            emp.rfc,
            emp.dias_asistidos.toString(),
            emp.total_entradas.toString(),
            emp.total_salidas.toString(),
            (emp.promedio_horas_diarias || 0).toFixed(1)
        ]);
    });

    doc.autoTable({
        startY: yPos,
        head: [empleadosTable[0]],
        body: empleadosTable.slice(1),
        theme: 'grid',
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: {
            fontSize: 7
        },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30 },
            2: { cellWidth: 15 },
            3: { cellWidth: 15 },
            4: { cellWidth: 15 },
            5: { cellWidth: 20 }
        },
        margin: { left: 20, right: 20 }
    });

    return yPos;
};

const generarPDFGlobal = (doc, datos, yPos) => {
    // Estadísticas generales
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Resumen Ejecutivo', 20, yPos);
    yPos += 7;

    const statsTable = [
        ['Métrica', 'Valor'],
        ['Total Empleados', datos.estadisticas_generales.total_empleados.toString()],
        ['Empleados Activos', datos.estadisticas_generales.empleados_activos.toString()],
        ['Departamentos', datos.estadisticas_generales.total_departamentos.toString()],
        ['Registros Totales', datos.estadisticas_generales.total_registros_periodo.toString()],
        ['Días con Registros', datos.estadisticas_generales.dias_con_registros.toString()]
    ];

    doc.autoTable({
        startY: yPos,
        head: [statsTable[0]],
        body: statsTable.slice(1),
        theme: 'striped',
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10
        },
        bodyStyles: {
            fontSize: 9
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        margin: { left: 20, right: 20 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Asistencia por departamento
    if (yPos > 220) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Asistencia por Departamento', 20, yPos);
    yPos += 7;

    const deptosTable = [
        ['Departamento', 'Empleados', 'Con Reg.', '% Asist.']
    ];

    datos.por_departamento.forEach(dept => {
        deptosTable.push([
            dept.departamento.substring(0, 40),
            dept.total_empleados.toString(),
            dept.empleados_con_registros.toString(),
            dept.porcentaje_asistencia.toFixed(1) + '%'
        ]);
    });

    doc.autoTable({
        startY: yPos,
        head: [deptosTable[0]],
        body: deptosTable.slice(1),
        theme: 'grid',
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: {
            fontSize: 8
        },
        margin: { left: 20, right: 20 }
    });

    return yPos;
};

const generarPDFIncidencias = (doc, datos, yPos) => {
    // Estadísticas de incidencias
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Resumen de Incidencias', 20, yPos);
    yPos += 7;

    const statsTable = [
        ['Estado', 'Cantidad'],
        ['Total', datos.estadisticas.total_incidencias.toString()],
        ['Aprobadas', datos.estadisticas.aprobadas.toString()],
        ['Pendientes', datos.estadisticas.pendientes.toString()],
        ['Rechazadas', datos.estadisticas.rechazadas.toString()],
        ['Total Días', datos.estadisticas.total_dias_incidencias.toString()]
    ];

    doc.autoTable({
        startY: yPos,
        head: [statsTable[0]],
        body: statsTable.slice(1),
        theme: 'striped',
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10
        },
        bodyStyles: {
            fontSize: 9
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        margin: { left: 20, right: 20 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Listado de incidencias (primeras 50)
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Listado de Incidencias', 20, yPos);
    yPos += 7;

    const incidenciasTable = [
        ['Empleado', 'Tipo', 'Inicio', 'Fin', 'Días', 'Estado']
    ];

    datos.incidencias.slice(0, 50).forEach(inc => {
        incidenciasTable.push([
            inc.empleado.substring(0, 25),
            inc.tipo_incidencia,
            inc.fecha_ini,
            inc.fecha_fin,
            inc.dias_duracion.toString(),
            inc.estado
        ]);
    });

    doc.autoTable({
        startY: yPos,
        head: [incidenciasTable[0]],
        body: incidenciasTable.slice(1),
        theme: 'grid',
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8
        },
        bodyStyles: {
            fontSize: 7
        },
        margin: { left: 20, right: 20 }
    });

    return yPos;
};

// ==================== GENERACIÓN DE EXCEL ====================

/**
 * Generar archivo Excel (XLSX)
 * @param {Object} datos - Datos del reporte
 * @param {string} tipoReporte - Tipo de reporte
 * @returns {Workbook} Workbook de Excel
 */
export const generarReporteExcel = (datos, tipoReporte) => {
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Información general
    const infoData = [
        ['FASITLAC - Sistema de Asistencia'],
        ['Tipo de Reporte', tipoReporte],
        ['Período', `${datos.periodo.fecha_inicio} - ${datos.periodo.fecha_fin}`],
        ['Generado', new Date(datos.generado_en).toLocaleString('es-MX')],
        []
    ];

    let mainData = [];

    switch (tipoReporte) {
        case 'individual':
            mainData = generarExcelIndividual(datos, infoData);
            break;
        case 'departamental':
            mainData = generarExcelDepartamental(datos, infoData);
            break;
        case 'global':
            mainData = generarExcelGlobal(datos, infoData, workbook);
            break;
        case 'incidencias':
            mainData = generarExcelIncidencias(datos, infoData, workbook);
            break;
    }

    const wsMain = XLSX.utils.aoa_to_sheet(mainData);
    XLSX.utils.book_append_sheet(workbook, wsMain, 'Reporte');

    return workbook;
};

const generarExcelIndividual = (datos, infoData) => {
    return [
        ...infoData,
        ['INFORMACIÓN DEL EMPLEADO'],
        ['Nombre', datos.empleado.nombre],
        ['RFC', datos.empleado.rfc],
        ['NSS', datos.empleado.nss],
        ['Email', datos.empleado.email || 'N/A'],
        ['Teléfono', datos.empleado.telefono || 'N/A'],
        [],
        ['ESTADÍSTICAS'],
        ['Días Asistidos', datos.estadisticas?.dias_asistidos || 0],
        ['Total Entradas', datos.estadisticas?.total_entradas || 0],
        ['Total Salidas', datos.estadisticas?.total_salidas || 0],
        ['Promedio Horas Diarias', datos.estadisticas?.promedio_horas_diarias?.toFixed(2) || '0.00'],
        [],
        ['REGISTROS DE ASISTENCIA'],
        ['Fecha', 'Entrada', 'Salida', 'Horas Trabajadas', 'Método Entrada', 'Método Salida'],
        ...datos.registros_asistencia.map(r => [
            r.fecha,
            r.hora_entrada || 'N/A',
            r.hora_salida || 'N/A',
            r.horas_trabajadas?.toFixed(2) || 'N/A',
            r.metodo_entrada || 'N/A',
            r.metodo_salida || 'N/A'
        ])
    ];
};

const generarExcelDepartamental = (datos, infoData) => {
    return [
        ...infoData,
        ['DEPARTAMENTO'],
        ['Nombre', datos.departamento.nombre],
        ['Descripción', datos.departamento.descripcion || 'N/A'],
        ['Total Empleados', datos.departamento.total_empleados],
        [],
        ['EMPLEADOS'],
        ['Nombre', 'RFC', 'NSS', 'Días Asist.', 'Entradas', 'Salidas', 'Incidencias', 'Prom. Horas'],
        ...datos.empleados.map(e => [
            e.nombre,
            e.rfc,
            e.nss,
            e.dias_asistidos,
            e.total_entradas,
            e.total_salidas,
            e.total_incidencias,
            e.promedio_horas_diarias?.toFixed(2) || 'N/A'
        ])
    ];
};

const generarExcelGlobal = (datos, infoData, workbook) => {
    const mainData = [
        ...infoData,
        ['ESTADÍSTICAS GENERALES'],
        ['Total Empleados', datos.estadisticas_generales.total_empleados],
        ['Empleados Activos', datos.estadisticas_generales.empleados_activos],
        ['Total Departamentos', datos.estadisticas_generales.total_departamentos],
        ['Registros del Período', datos.estadisticas_generales.total_registros_periodo],
        [],
        ['ASISTENCIA POR DEPARTAMENTO'],
        ['Departamento', 'Empleados', 'Con Registros', 'Días Actividad', 'Total Registros', '% Asistencia'],
        ...datos.por_departamento.map(d => [
            d.departamento,
            d.total_empleados,
            d.empleados_con_registros,
            d.dias_con_actividad,
            d.total_registros,
            d.porcentaje_asistencia
        ])
    ];

    // Hoja adicional: Métodos de registro
    const metodosData = [
        ['MÉTODOS DE REGISTRO'],
        ['Método', 'Total Usos', 'Porcentaje'],
        ...datos.metodos_registro.map(m => [m.metodo, m.total_usos, m.porcentaje])
    ];
    const wsMetodos = XLSX.utils.aoa_to_sheet(metodosData);
    XLSX.utils.book_append_sheet(workbook, wsMetodos, 'Métodos');

    return mainData;
};

const generarExcelIncidencias = (datos, infoData, workbook) => {
    return [
        ...infoData,
        ['ESTADÍSTICAS'],
        ['Total Incidencias', datos.estadisticas.total_incidencias],
        ['Aprobadas', datos.estadisticas.aprobadas],
        ['Pendientes', datos.estadisticas.pendientes],
        ['Rechazadas', datos.estadisticas.rechazadas],
        ['Total Días', datos.estadisticas.total_dias_incidencias],
        [],
        ['LISTADO DE INCIDENCIAS'],
        ['Empleado', 'RFC', 'Departamento', 'Tipo', 'Motivo', 'F. Inicio', 'F. Fin', 'Días', 'Estado'],
        ...datos.incidencias.map(i => [
            i.empleado,
            i.rfc,
            i.departamento || 'N/A',
            i.tipo_incidencia,
            i.motivo || 'N/A',
            i.fecha_ini,
            i.fecha_fin,
            i.dias_duracion,
            i.estado
        ])
    ];
};

// ==================== GENERACIÓN DE WORD ====================

/**
 * Generar documento Word (DOCX)
 * @param {Object} datos - Datos del reporte
 * @param {string} tipoReporte - Tipo de reporte
 * @returns {Document} Documento Word
 */
export const generarReporteWord = async (datos, tipoReporte) => {
    const children = [];

    // Header
    children.push(
        new Paragraph({
            text: 'FASITLAC - Sistema de Asistencia',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER
        }),
        new Paragraph({
            text: `Tipo: ${tipoReporte}`,
            alignment: AlignmentType.CENTER
        }),
        new Paragraph({
            text: `Período: ${datos.periodo.fecha_inicio} - ${datos.periodo.fecha_fin}`,
            alignment: AlignmentType.CENTER
        }),
        new Paragraph({
            text: `Generado: ${new Date(datos.generado_en).toLocaleString('es-MX')}`,
            alignment: AlignmentType.CENTER
        }),
        new Paragraph({ text: '' })
    );

    // Contenido por tipo
    switch (tipoReporte) {
        case 'individual':
            children.push(...generarWordIndividual(datos));
            break;
        case 'departamental':
            children.push(...generarWordDepartamental(datos));
            break;
        case 'global':
            children.push(...generarWordGlobal(datos));
            break;
        case 'incidencias':
            children.push(...generarWordIncidencias(datos));
            break;
    }

    const doc = new Document({
        sections: [{
            children: children
        }]
    });

    return doc;
};

const generarWordIndividual = (datos) => {
    const elements = [];

    elements.push(
        new Paragraph({
            text: 'Información del Empleado',
            heading: HeadingLevel.HEADING_2
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Nombre: ', bold: true }),
                new TextRun(datos.empleado.nombre)
            ]
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'RFC: ', bold: true }),
                new TextRun(datos.empleado.rfc)
            ]
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'NSS: ', bold: true }),
                new TextRun(datos.empleado.nss)
            ]
        })
    );

    return elements;
};

const generarWordDepartamental = (datos) => {
    return [
        new Paragraph({
            text: `Departamento: ${datos.departamento.nombre}`,
            heading: HeadingLevel.HEADING_2
        })
    ];
};

const generarWordGlobal = (datos) => {
    return [
        new Paragraph({
            text: 'Resumen Ejecutivo',
            heading: HeadingLevel.HEADING_2
        })
    ];
};

const generarWordIncidencias = (datos) => {
    return [
        new Paragraph({
            text: 'Reporte de Incidencias',
            heading: HeadingLevel.HEADING_2
        })
    ];
};

// ==================== GENERACIÓN DE CSV ====================

/**
 * Generar archivo CSV
 * @param {Object} datos - Datos del reporte
 * @param {string} tipoReporte - Tipo de reporte
 * @returns {string} Contenido CSV
 */
export const generarReporteCSV = (datos, tipoReporte) => {
    let csvData = [];

    // Header común
    csvData.push(['FASITLAC - Sistema de Asistencia']);
    csvData.push(['Tipo de Reporte', tipoReporte]);
    csvData.push(['Período', `${datos.periodo.fecha_inicio} - ${datos.periodo.fecha_fin}`]);
    csvData.push(['Generado', new Date(datos.generado_en).toLocaleString('es-MX')]);
    csvData.push([]);

    switch (tipoReporte) {
        case 'individual':
            csvData.push(...generarCSVIndividual(datos));
            break;
        case 'departamental':
            csvData.push(...generarCSVDepartamental(datos));
            break;
        case 'global':
            csvData.push(...generarCSVGlobal(datos));
            break;
        case 'incidencias':
            csvData.push(...generarCSVIncidencias(datos));
            break;
    }

    return Papa.unparse(csvData);
};

const generarCSVIndividual = (datos) => {
    const rows = [
        ['INFORMACIÓN DEL EMPLEADO'],
        ['Nombre', datos.empleado.nombre],
        ['RFC', datos.empleado.rfc],
        ['NSS', datos.empleado.nss],
        [],
        ['REGISTROS DE ASISTENCIA'],
        ['Fecha', 'Entrada', 'Salida', 'Horas Trabajadas']
    ];

    datos.registros_asistencia.forEach(r => {
        rows.push([
            r.fecha,
            r.hora_entrada || 'N/A',
            r.hora_salida || 'N/A',
            r.horas_trabajadas?.toFixed(2) || 'N/A'
        ]);
    });

    return rows;
};

const generarCSVDepartamental = (datos) => {
    const rows = [
        ['DEPARTAMENTO', datos.departamento.nombre],
        [],
        ['EMPLEADOS'],
        ['Nombre', 'RFC', 'Días Asist.', 'Entradas', 'Salidas', 'Prom. Horas']
    ];

    datos.empleados.forEach(e => {
        rows.push([
            e.nombre,
            e.rfc,
            e.dias_asistidos,
            e.total_entradas,
            e.total_salidas,
            e.promedio_horas_diarias?.toFixed(2) || 'N/A'
        ]);
    });

    return rows;
};

const generarCSVGlobal = (datos) => {
    const rows = [
        ['ESTADÍSTICAS GENERALES'],
        ['Total Empleados', datos.estadisticas_generales.total_empleados],
        ['Empleados Activos', datos.estadisticas_generales.empleados_activos],
        [],
        ['ASISTENCIA POR DEPARTAMENTO'],
        ['Departamento', 'Empleados', 'Con Registros', '% Asistencia']
    ];

    datos.por_departamento.forEach(d => {
        rows.push([
            d.departamento,
            d.total_empleados,
            d.empleados_con_registros,
            d.porcentaje_asistencia
        ]);
    });

    return rows;
};

const generarCSVIncidencias = (datos) => {
    const rows = [
        ['LISTADO DE INCIDENCIAS'],
        ['Empleado', 'Tipo', 'Fecha Inicio', 'Fecha Fin', 'Días', 'Estado']
    ];

    datos.incidencias.forEach(i => {
        rows.push([
            i.empleado,
            i.tipo_incidencia,
            i.fecha_ini,
            i.fecha_fin,
            i.dias_duracion,
            i.estado
        ]);
    });

    return rows;
};

// ==================== DESCARGA DE REPORTES ====================

/**
 * Descargar archivo generado
 * @param {Object} datos - Datos del reporte
 * @param {string} tipoReporte - Tipo de reporte
 * @param {string} formato - Formato (pdf, xlsx, docx, csv)
 */
export const descargarReporte = async (datos, tipoReporte, formato) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const nombreBase = `reporte_${tipoReporte}_${timestamp}`;

    try {
        switch (formato) {
            case 'pdf':
                const pdf = generarReportePDF(datos, tipoReporte);
                pdf.save(`${nombreBase}.pdf`);
                break;

            case 'xlsx':
                const workbook = generarReporteExcel(datos, tipoReporte);
                const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                const excelBlob = new Blob([excelBuffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                saveAs(excelBlob, `${nombreBase}.xlsx`);
                break;

            case 'docx':
                const doc = await generarReporteWord(datos, tipoReporte);
                const docxBuffer = await Packer.toBlob(doc);
                saveAs(docxBuffer, `${nombreBase}.docx`);
                break;

            case 'csv':
                const csv = generarReporteCSV(datos, tipoReporte);
                const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                saveAs(csvBlob, `${nombreBase}.csv`);
                break;

            default:
                throw new Error(`Formato no soportado: ${formato}`);
        }
    } catch (error) {
        console.error('Error generando reporte:', error);
        throw error;
    }
};
