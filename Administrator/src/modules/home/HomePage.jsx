import { useState, useEffect, useRef } from 'react';
import {
    Users,
    UserCheck,
    UserX,
    AlertCircle,
    Bell,
    MapPin
} from "lucide-react";
import logo from './logo.png';

function HomePage() {
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    // Datos de ejemplo
    const usuariosActivos = 254;
    const usuariosInactivos = 18;
    const totalUsuarios = usuariosActivos + usuariosInactivos;

    const alertas = [
        {
            id: 1,
            tipo: 'warning',
            mensaje: '3 dispositivos requieren mantenimiento',
            tiempo: 'Hace 15 min'
        },
        {
            id: 2,
            tipo: 'info',
            mensaje: 'Actualización del sistema programada',
            tiempo: 'Hace 1 hora'
        },
        {
            id: 3,
            tipo: 'success',
            mensaje: 'Respaldo completado exitosamente',
            tiempo: 'Hace 2 horas'
        }
    ];

    const avisos = [
        {
            id: 1,
            titulo: 'Reunión General',
            descripcion: 'Revisión de objetivos trimestrales',
            fecha: 'Viernes, 10:00 AM'
        },
        {
            id: 2,
            titulo: 'Nuevo Lineamiento',
            descripcion: 'Actualización de políticas de seguridad',
            fecha: 'Hoy'
        }
    ];

    // Cargar Leaflet dinámicamente
    useEffect(() => {
        const loadLeaflet = () => {
            if (window.L) {
                setMapReady(true);
                return;
            }

            if (!document.querySelector('link[href*="leaflet.min.css"]')) {
                const leafletCSS = document.createElement('link');
                leafletCSS.rel = 'stylesheet';
                leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(leafletCSS);
            }

            if (!document.querySelector('script[src*="leaflet.js"]')) {
                const leafletScript = document.createElement('script');
                leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

                leafletScript.onload = () => {
                    setMapReady(true);
                };

                document.body.appendChild(leafletScript);
            }
        };

        loadLeaflet();
    }, []);

    // Inicializar mapa cuando esté listo
    useEffect(() => {
        if (!mapReady || !mapRef.current || mapInstanceRef.current) return;

        const L = window.L;

        try {
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const map = L.map(mapRef.current, {
                zoomControl: false,
                attributionControl: false
            }).setView([17.9558, -102.1972], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(map);

            // Agregar algunos marcadores de ejemplo
            L.marker([17.9558, -102.1972]).addTo(map)
                .bindPopup('<b>Ubicación Principal</b><br>LE FLEUR*');

            L.marker([17.9600, -102.2000]).addTo(map)
                .bindPopup('<b>Sucursal Norte</b>');

            L.marker([17.9500, -102.1900]).addTo(map)
                .bindPopup('<b>Sucursal Sur</b>');

            mapInstanceRef.current = map;

            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        } catch (error) {
            console.error('Error al inicializar el mapa:', error);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [mapReady]);

    const getAlertIcon = (tipo) => {
        const config = {
            warning: { color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
            info: { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
            success: { color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' }
        };
        return config[tipo] || config.info;
    };

    return (
        <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
            <div className="h-full flex flex-col p-6 overflow-y-auto">
                {/* Header con gradiente */}
                <header className="mb-8 bg-gradient-to-r from-blue-600 to-blue-900 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="absolute inset-0 bg-white rounded-2xl blur-md opacity-40"></div>
                            <div className="relative bg-white rounded-2xl p-3 shadow-xl">
                                <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white">LE FLEUR*</h1>
                            <p className="text-blue-100 mt-1">Sistema de Gestión Administrativa</p>
                        </div>
                        <div className="text-right text-white">
                            <p className="text-sm opacity-80">Última actualización</p>
                            <p className="text-lg font-semibold">Hace 5 min</p>
                        </div>
                    </div>
                </header>

                {/* Grid de Estado de Usuarios y Mapa */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                    {/* Estado de Usuarios - Ocupa 2 columnas */}
                    <div className="col-span-2 bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-xl">
                                <Users className="text-white" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Estado de Usuarios</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-6">
                            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 hover:scale-105 transition-transform">
                                <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-md">
                                    <UserCheck className="text-green-500" size={36} />
                                </div>
                                <div className="text-5xl font-bold text-green-600 mb-2">{usuariosActivos}</div>
                                <div className="text-sm font-medium text-gray-700">Activos</div>
                            </div>
                            <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200 hover:scale-105 transition-transform">
                                <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-md">
                                    <UserX className="text-red-500" size={36} />
                                </div>
                                <div className="text-5xl font-bold text-red-600 mb-2">{usuariosInactivos}</div>
                                <div className="text-sm font-medium text-gray-700">Inactivos</div>
                            </div>
                            <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 hover:scale-105 transition-transform">
                                <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-md">
                                    <Users className="text-gray-500" size={36} />
                                </div>
                                <div className="text-5xl font-bold text-gray-900 mb-2">{totalUsuarios}</div>
                                <div className="text-sm font-medium text-gray-700">Total</div>
                            </div>
                        </div>
                    </div>

                    {/* Mini Mapa - Ocupa 1 columna */}
                    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
                            <div className="flex items-center gap-2">
                                <MapPin className="text-white" size={20} />
                                <h3 className="text-base font-bold text-white">Ubicaciones</h3>
                            </div>
                            <p className="text-xs text-green-100 mt-1">3 activas</p>
                        </div>

                        <div className="relative h-64">
                            {!mapReady && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-green-600 mx-auto mb-2"></div>
                                        <p className="text-xs text-gray-600">Cargando...</p>
                                    </div>
                                </div>
                            )}

                            <div
                                ref={mapRef}
                                className={`w-full h-full ${!mapReady ? 'hidden' : ''}`}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Alertas */}
                    <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-xl">
                                <AlertCircle className="text-white" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Alertas Recientes</h3>
                        </div>
                        <div className="space-y-3">
                            {alertas.map((alerta) => {
                                const styles = getAlertIcon(alerta.tipo);
                                return (
                                    <div key={alerta.id} className={`flex items-center gap-4 p-4 ${styles.bg} rounded-xl border ${styles.border} hover:scale-102 transition-all cursor-pointer`}>
                                        <div className={`flex-shrink-0 ${styles.color}`}>
                                            <AlertCircle size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-800 font-semibold">{alerta.mensaje}</p>
                                            <p className="text-xs text-gray-500 mt-1">{alerta.tiempo}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Avisos */}
                    <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2 rounded-xl">
                                <Bell className="text-white" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Avisos Importantes</h3>
                        </div>
                        <div className="space-y-4">
                            {avisos.map((aviso) => (
                                <div key={aviso.id} className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 hover:shadow-md transition-all cursor-pointer">
                                    <h4 className="text-base font-bold text-gray-900 mb-2">{aviso.titulo}</h4>
                                    <p className="text-sm text-gray-600 mb-3">{aviso.descripcion}</p>
                                    <div className="flex items-center gap-2 text-sm text-purple-700 font-medium">
                                        <Bell size={14} />
                                        <span>{aviso.fecha}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;