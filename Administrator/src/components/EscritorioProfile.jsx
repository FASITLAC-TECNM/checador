import React, { useState, useEffect } from 'react';
import { Monitor, Wifi, Cpu, HardDrive, Activity, CheckCircle, XCircle, AlertTriangle, Server, Clock, Settings, Laptop, Fingerprint, ScanFace, Lock, KeyRound, Save } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { API_CONFIG } from '../config/Apiconfig';
import { useBiometricosSync } from '../hooks/useBiometricosSync';

const API_URL = API_CONFIG.BASE_URL;

const BiometricStatus = ({ label, status, details, ip }) => {
    // Status visual mapping
    const getStatusStyles = (s) => {
        switch (s) {
            case 'conectado': return {
                bg: 'bg-green-50 dark:bg-green-900/20',
                border: 'border-green-200 dark:border-green-800',
                text: 'text-green-700 dark:text-green-400',
                icon: CheckCircle,
                label: 'Conectado'
            };
            case 'desconectado': return {
                bg: 'bg-red-50 dark:bg-red-900/20',
                border: 'border-red-200 dark:border-red-800',
                text: 'text-red-700 dark:text-red-400',
                icon: XCircle,
                label: 'Desconectado'
            };
            case 'error': return {
                bg: 'bg-orange-50 dark:bg-orange-900/20',
                border: 'border-orange-200 dark:border-orange-800',
                text: 'text-orange-700 dark:text-orange-400',
                icon: AlertTriangle,
                label: 'Error'
            };
            default: return {
                bg: 'bg-gray-50 dark:bg-gray-800',
                border: 'border-gray-200 dark:border-gray-700',
                text: 'text-gray-500 dark:text-gray-400',
                icon: Activity,
                label: 'Desconocido'
            };
        }
    };

    const styles = getStatusStyles(status);
    const StatusIcon = styles.icon;

    return (
        <div className={`p-4 rounded-xl border ${styles.border} ${styles.bg} transition-all`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Activity className={`w-5 h-5 ${styles.text}`} />
                    <h4 className="font-semibold text-gray-900 dark:text-white">{label}</h4>
                </div>
                <div className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider ${styles.text}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{styles.label}</span>
                </div>
            </div>
            {details && <p className="text-sm opacity-80 text-gray-600 dark:text-gray-300 mb-1">{details}</p>}
            {ip && <p className="text-xs font-mono text-gray-500 dark:text-gray-400">IP: {ip}</p>}
        </div>
    );
};

const EscritorioProfile = ({ dispositivo }) => {
    const { formatDate, formatTime } = useConfig();

    // Usamos el hook de sincronización en tiempo real para biométricos
    const { biometricos, loadingBio, errorBio } = useBiometricosSync(dispositivo?.id, 5000);

    // Estado para la configuración específica
    const [configuracion, setConfiguracion] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [mensaje, setMensaje] = useState({ text: '', type: '' });

    useEffect(() => {
        if (dispositivo?.id) {
            fetchConfiguracion(dispositivo.id);
        }
    }, [dispositivo]);

    const fetchConfiguracion = async (id) => {
        try {
            setLoadingConfig(true);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/configuraciones-escritorio/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setConfiguracion(result.data);
            }
        } catch (error) {
            console.error("Error fetching configuracion:", error);
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleConfigChange = (field, value) => {
        setConfiguracion(prev => {
            if (field.startsWith('metodos_autenticacion.')) {
                const met = field.split('.')[1];
                return {
                    ...prev,
                    metodos_autenticacion: {
                        ...prev.metodos_autenticacion,
                        [met]: value
                    }
                };
            }
            return { ...prev, [field]: value };
        });
    };

    // Helpers para prioridad de biométricos
    const METODO_LABELS = { huella: 'Huella Dactilar', rostro: 'Reconocimiento Facial', codigo: 'Código PIN / Contraseña' };
    const METODO_ICONS = { huella: Fingerprint, rostro: ScanFace, codigo: KeyRound };

    const getPrioridad = () => {
        const defaults = [
            { metodo: 'huella', activo: true, nivel: 1 },
            { metodo: 'rostro', activo: true, nivel: 2 },
            { metodo: 'codigo', activo: true, nivel: 3 }
        ];
        return (configuracion?.prioridad_biometrico || defaults)
            .slice()
            .sort((a, b) => a.nivel - b.nivel);
    };

    const movePrioridad = (index, direction) => {
        const list = getPrioridad();
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= list.length) return;
        const updated = [...list];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        const reniveled = updated.map((item, i) => ({ ...item, nivel: i + 1 }));
        setConfiguracion(prev => ({ ...prev, prioridad_biometrico: reniveled }));
    };

    const togglePrioridad = (metodo) => {
        const list = getPrioridad();
        const updated = list.map(item =>
            item.metodo === metodo ? { ...item, activo: !item.activo } : item
        );
        setConfiguracion(prev => ({ ...prev, prioridad_biometrico: updated }));
    };

    const saveConfiguracion = async () => {
        try {
            setSavingConfig(true);
            setMensaje({ text: '', type: '' });
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/configuraciones-escritorio/${dispositivo.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configuracion)
            });
            const result = await response.json();
            if (result.success) {
                setMensaje({ text: 'Configuración de nodo guardada exitosamente.', type: 'success' });
                setTimeout(() => setMensaje({ text: '', type: '' }), 3000);
            } else {
                setMensaje({ text: result.message || 'Error al guardar configuración.', type: 'error' });
            }
        } catch (error) {
            console.error("Error saving configuracion:", error);
            setMensaje({ text: 'Error de red al guardar configuración.', type: 'error' });
        } finally {
            setSavingConfig(false);
        }
    };

    // Si no hay datos, mostrar placeholder
    if (!dispositivo) return <div className="p-6 text-center text-gray-500">No hay información del dispositivo.</div>;

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Columna Izquierda: Identidad y Resumen */}
            <div className="w-full lg:w-1/3 space-y-6">
                <div className="bg-slate-50 dark:bg-gray-900/50 rounded-2xl p-6 text-center border border-slate-100 dark:border-gray-800">
                    <div className="mx-auto w-24 h-24 flex items-center justify-center rounded-2xl mb-5 bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-100 dark:border-gray-700">
                        <Monitor className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{dispositivo.nombre_equipo || dispositivo.nombre || 'PC Sin Nombre'}</h3>
                    {dispositivo.correo && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{dispositivo.correo}</p>}
                    
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${dispositivo.es_activo !== false ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400'}`}>
                            {dispositivo.es_activo !== false ? 'Kiosco Activo' : 'Kiosco Inactivo'}
                        </span>
                        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700">
                            Escritorio Físico
                        </span>
                    </div>

                    <div className="w-full h-px bg-slate-200 dark:bg-gray-700 mb-6"></div>

                    <div className="space-y-4 text-left">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">SO</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-200">{dispositivo.sistema_operativo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Registro</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-200">{dispositivo.fecha_registro ? new Date(dispositivo.fecha_registro).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {dispositivo.descripcion && (
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notas Adicionales</h4>
                        <div className="bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-slate-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300">
                            {dispositivo.descripcion}
                        </div>
                    </div>
                )}
            </div>

            {/* Columna Derecha: Detalles Técnicos & Biométricos & Configuración */}
            <div className="w-full lg:w-2/3 space-y-8">
                
                {/* Redes */}
                <section>
                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Wifi className="w-4 h-4" /> Interfaces de Red
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="card p-4 flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">IP Address Local</span>
                            <span className="text-sm font-mono font-bold text-gray-900 dark:text-white break-all">{dispositivo.ip || 'No asignada'}</span>
                        </div>
                        <div className="card p-4 flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Physical MAC</span>
                            <span className="text-sm font-mono font-bold text-gray-900 dark:text-white break-all">{dispositivo.mac || 'No rastreada'}</span>
                        </div>
                    </div>
                </section>

                {/* Biométricos */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Fingerprint className="w-4 h-4" /> Hardware Biométrico Activo
                        </h4>
                        {loadingBio && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold animate-pulse">Sincronizando...</span>}
                    </div>

                    {errorBio ? (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-sm font-medium">
                            Error al leer biométricos: {errorBio}
                        </div>
                    ) : (
                        biometricos.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {biometricos.map((bio) => (
                                    <BiometricStatus
                                        key={bio.id}
                                        label={bio.nombre}
                                        status={bio.estado}
                                        details={bio.tipo + ' - ' + (bio.puerto || 'USB')}
                                        ip={bio.ip}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-slate-300 dark:border-gray-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Sin sensores periféricos emparejados</p>
                            </div>
                        )
                    )}
                </section>

                {/* Configuración Kiosco */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Settings className="w-4 h-4" /> Modos y Permisos (Local)
                        </h4>
                        {!loadingConfig && configuracion && (
                            <button
                                onClick={saveConfiguracion}
                                disabled={savingConfig}
                                className={`btn-primary bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 text-xs rounded-md flex items-center gap-1 shadow-sm ${savingConfig ? 'opacity-75 cursor-wait' : ''}`}
                            >
                                <Save className="w-3.5 h-3.5" /> {savingConfig ? 'Guardando...' : 'Guardar RAM'}
                            </button>
                        )}
                    </div>

                    {loadingConfig ? (
                        <div className="card p-8 text-center animate-pulse text-gray-400 text-sm">Obteniendo ajustes del nodo...</div>
                    ) : configuracion ? (
                        <div className="card p-0 overflow-hidden divide-y divide-slate-100 dark:divide-gray-800">
                            {mensaje.text && (
                                <div className={`px-4 py-3 text-sm font-medium ${mensaje.type === 'success' ? 'bg-green-50 text-green-700 border-l-4 border-green-500' : 'bg-red-50 text-red-700 border-l-4 border-red-500'}`}>
                                    {mensaje.text}
                                </div>
                            )}

                            {/* Options */}
                            <div className="p-5 grid grid-cols-1 gap-6">
                                {/* Permisos Toggles */}
                                <div className="space-y-4">
                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Comportamiento del App Cliente</h5>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/30 justify-between items-center">
                                        <div>
                                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">Arranque Inmediato (Startup)</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Ejecutar el nodo FASITLAC al iniciar sesión en OS.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={configuracion.iniciar_con_windows} onChange={(e) => handleConfigChange('iniciar_con_windows', e.target.checked)} />
                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>



                                    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10 justify-between items-center">
                                        <div>
                                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">Modo Mantenimiento Parcial</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Suspende el registro de asistencias al público externo.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={configuracion.es_mantenimiento || false} onChange={(e) => handleConfigChange('es_mantenimiento', e.target.checked)} />
                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                        </label>
                                    </div>

                                </div>

                                {/* Orden Biometrico Alterno */}
                                <div className="pt-2">
                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Precedencia de Identificación</h5>
                                    <p className="text-xs text-gray-500 mb-4">La pantalla de este kiosco ofrecerá las opciones en el siguiente orden, ignorando las inhabilitadas.</p>
                                    <div className="space-y-2">
                                        {getPrioridad().map((item, index, arr) => {
                                            const Icon = METODO_ICONS[item.metodo] || KeyRound;
                                            return (
                                                <div key={item.metodo} className={`flex items-center justify-between p-3 rounded-lg border ${item.activo ? 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 shadow-sm' : 'bg-slate-50 dark:bg-gray-900 border-slate-100 dark:border-gray-800 opacity-60'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${item.activo ? 'bg-primary-500' : 'bg-slate-400'}`}>{item.nivel}</div>
                                                        <div className="flex items-center gap-2">
                                                            <Icon className={`w-4 h-4 ${item.activo ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                                                            <span className={`text-sm font-medium ${item.activo ? 'text-gray-900 dark:text-white' : 'text-slate-500'}`}>{METODO_LABELS[item.metodo]}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input type="checkbox" className="sr-only peer" checked={item.activo} onChange={() => togglePrioridad(item.metodo)} />
                                                            <div className="w-8 h-4 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-600"></div>
                                                        </label>
                                                        <div className="flex flex-col gap-0.5">
                                                            <button onClick={() => movePrioridad(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:hover:text-gray-400"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg></button>
                                                            <button onClick={() => movePrioridad(index, 1)} disabled={index === arr.length - 1} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:hover:text-gray-400"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </section>
            </div>
        </div>
    );
};

export default EscritorioProfile;

