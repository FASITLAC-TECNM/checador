import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiFileText, FiCheckCircle, FiDownload, FiArrowRight, FiActivity } from 'react-icons/fi';
import DynamicLoader from '../common/DynamicLoader';
import { API_CONFIG } from '../../config/Apiconfig';

const ImportHorariosModal = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [isAnalyzed, setIsAnalyzed] = useState(false);
    const [analysisSummary, setAnalysisSummary] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.csv')) {
            setErrorMsg('Por favor selecciona un archivo .csv válido');
            setFile(null);
            setParsedData(null);
            return;
        }

        resetStates();
        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    setErrorMsg('El archivo CSV está vacío o no tiene suficientes datos.');
                    setParsedData(null);
                    return;
                }

                // Parse básico de CSV (Headers en primera línea)
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                const records = [];

                for (let i = 1; i < lines.length; i++) {
                    // Regex para lidiar con comas dentro de comillas si las hubiera
                    const values = lines[i].match(/(?:\"([^\"]*(?:\"\"[^\"]*)*)\")|([^\",]+)/g);
                    if (!values) continue;

                    const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());
                    const record = {};
                    headers.forEach((h, idx) => {
                        record[h] = cleanValues[idx] || '';
                    });
                    records.push(record);
                }

                setParsedData(records);
            } catch (err) {
                console.error(err);
                setErrorMsg('Ocurrió un error al leer el archivo. ¿Está bien formateado?');
                setParsedData(null);
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            // Simulamos el evento de input
            handleFileChange({ target: { files: [droppedFile] } });
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleUpload = async (confirm = false) => {
        if (!parsedData || parsedData.length === 0) return;

        setLoading(true);
        setErrorMsg(null);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/horarios/sistema/importar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    registros: parsedData,
                    solo_analizar: !confirm
                })
            });

            const result = await response.json();

            if (result.success) {
                if (!confirm && result.is_analysis) {
                    // Resultado del análisis
                    setAnalysisSummary(result);
                    setIsAnalyzed(true);
                    if (result.notificaciones && result.notificaciones.length > 0) {
                        setErrorMsg(result.notificaciones);
                    }
                } else {
                    // Importación real exitosa
                    setSuccessMsg(result.message);
                    setTimeout(() => {
                        onClose();
                        if (onSuccess) onSuccess();
                    }, 4000);
                }
            } else {
                setErrorMsg(result.message || 'Error en el proceso');
                setIsAnalyzed(false);
            }
        } catch (error) {
            console.error(error);
            setErrorMsg('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const resetStates = () => {
        setErrorMsg(null);
        setSuccessMsg(null);
        setIsAnalyzed(false);
        setAnalysisSummary(null);
    };

    const resetState = () => {
        setFile(null);
        setParsedData(null);
        resetStates();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDownloadTemplate = () => {
        const headers = "RFC,Fecha_Inicio,TipoPeriodo,Lunes_Inicio,Lunes_Fin,Martes_Inicio,Martes_Fin,Miercoles_Inicio,Miercoles_Fin,Jueves_Inicio,Jueves_Fin,Viernes_Inicio,Viernes_Fin,Sabado_Inicio,Sabado_Fin,Domingo_Inicio,Domingo_Fin\n";
        const exampleRow1 = `ABCD123456789,${new Date().toISOString().split('T')[0]},semestral,07:00,11:00,07:00,11:00,07:00,11:00,07:00,11:00,07:00,11:00,,,,\n`;
        const exampleRow2 = `ABCD123456789,${new Date().toISOString().split('T')[0]},semestral,16:00,20:00,16:00,20:00,16:00,20:00,16:00,20:00,16:00,20:00,,,,\n`;

        const blob = new Blob([headers + exampleRow1 + exampleRow2], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_horarios.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl flex flex-col border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                            <div className="p-2 bg-blue-600 rounded-lg text-white">
                                <FiFileText className="w-5 h-5" />
                            </div>
                            Importación Masiva de Horarios
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Procesamiento de archivos institucionales TECNM</p>
                    </div>
                    {!loading && !successMsg && (
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400">
                            <FiX className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body Content */}
                <div className="flex flex-col lg:flex-row min-h-[450px]">

                    {/* Left Column: Upload & Actions */}
                    <div className={`p-8 flex flex-col gap-8 ${(analysisSummary || errorMsg) ? 'lg:w-5/12 border-r border-gray-100 dark:border-gray-700' : 'w-full'} transition-all duration-300 bg-gray-50/30 dark:bg-gray-800/20`}>
                        {successMsg ? (
                            <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in">
                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-100 dark:border-emerald-800">
                                    <FiCheckCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Importación Exitosa!</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed mb-8">{successMsg}</p>
                                
                                <button 
                                    onClick={resetState}
                                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                                >
                                    Realizar otra importación
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Paso 1: Archivo</span>
                                    <button 
                                        onClick={handleDownloadTemplate}
                                        className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2 font-black uppercase tracking-wider transition-all underline underline-offset-4"
                                    >
                                        <FiDownload /> Descargar Plantilla
                                    </button>
                                </div>

                                {/* Drag and Drop Zone */}
                                {!parsedData ? (
                                    <div 
                                        className="flex-1 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-white dark:hover:bg-gray-800 rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-14 h-14 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-xl flex items-center justify-center mb-6 group-hover:border-blue-200 transition-colors">
                                            <FiFileText className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                        <h4 className="text-base font-bold text-gray-900 dark:text-gray-200 mb-1">Cargar archivo CSV</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Haz clic para buscar o arrastra aquí</p>
                                        <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                                    </div>
                                ) : (
                                    <div className="flex-1 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <div className="p-4 bg-white dark:bg-gray-800 shadow-sm rounded-2xl text-blue-500 mb-4">
                                            <FiFileText className="w-10 h-10" />
                                        </div>
                                        <h4 className="font-bold text-gray-800 dark:text-white truncate max-w-full italic mb-1">{file?.name}</h4>
                                        <div className="mb-4 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                            {parsedData.length} registros detectados
                                        </div>

                                        <button onClick={resetState} className="text-xs text-red-500 hover:text-red-700 font-bold uppercase tracking-tighter hover:underline" disabled={loading}>
                                            Cambiar archivo
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right Column: Analysis Result & Details */}
                    {(analysisSummary || errorMsg) && (
                        <div className="flex-1 bg-white dark:bg-gray-800 p-8 flex flex-col gap-6 animate-in slide-in-from-right-4 overflow-hidden border-l border-gray-50 dark:border-gray-700/30">
                            <div className="flex items-center justify-between shrink-0">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${errorMsg ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                    {isAnalyzed ? 'Resultado del Análisis' : 'Incidencias Detectadas'}
                                </h3>
                                {analysisSummary && (
                                    <div className="flex gap-1.5">
                                        <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-sm border border-emerald-100 dark:border-emerald-800/50 uppercase">
                                            {analysisSummary.resumen.crear} Nuevo
                                        </div>
                                        <div className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-sm border border-blue-100 dark:border-blue-800/50 uppercase">
                                            {analysisSummary.resumen.actualizar} Act
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-2.5">
                                {/* Errores */}
                                {errorMsg && (
                                    <div className="space-y-2">
                                        {Array.isArray(errorMsg) ? (
                                            errorMsg.map((err, i) => (
                                                <div key={`err-${i}`} className="bg-red-50/30 dark:bg-red-900/10 p-4 rounded-xl border border-red-100/50 dark:border-red-900/20 flex gap-4 transition-colors">
                                                    <div className="text-red-500 shrink-0 mt-0.5 font-bold text-xs uppercase tracking-tighter shrink-0">FAIL</div>
                                                    <div className="text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">
                                                        {err}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30 text-center text-xs font-bold text-red-600">
                                                {errorMsg}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Detalles del Análisis */}
                                {analysisSummary?.detalles?.map((item, i) => (
                                    <div key={`item-${i}`} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-gray-900 dark:text-white tracking-wider">{item.rfc}</span>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase ${item.operacion === 'crear' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                                                    {item.operacion === 'crear' ? 'Nuevo' : 'Update'}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{item.detalles}</span>
                                        </div>
                                        <div className="shrink-0 text-gray-300">
                                            <FiArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {isAnalyzed && !errorMsg && (
                                <div className="mt-2 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex items-center gap-3">
                                    <FiCheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-tight">
                                        Validación completa. Listo para procesar registros.
                                    </p>
                                </div>
                            )}

                            {!errorMsg && !analysisSummary && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-4">
                                    <div className="w-12 h-12 border-2 border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center">
                                        <FiActivity className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-widest">Esperando análisis...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!successMsg && (
                    <div className="px-8 py-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0">
                        <button 
                            type="button" 
                            onClick={(isAnalyzed || errorMsg) ? resetStates : onClose} 
                            className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" 
                            disabled={loading}
                        >
                            {(isAnalyzed || errorMsg) ? 'Reiniciar' : 'Cancelar'}
                        </button>
                        
                        {!isAnalyzed ? (
                            <button 
                                type="button"
                                onClick={() => handleUpload(false)}
                                disabled={!parsedData || loading}
                                className={`px-10 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${(!parsedData || loading) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black active:scale-95'}`}
                            >
                                {loading ? 'Analizando...' : 'Comprobar Datos'}
                            </button>
                        ) : (
                            <button 
                                type="button"
                                onClick={() => handleUpload(true)}
                                disabled={loading}
                                className={`px-10 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                            >
                                {loading ? 'Procesando...' : 'Confirmar Importación'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ImportHorariosModal;
