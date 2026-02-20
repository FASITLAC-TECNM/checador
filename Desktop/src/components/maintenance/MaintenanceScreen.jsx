import React from 'react';
import { Settings, RefreshCw, AlertTriangle } from 'lucide-react';

const MaintenanceScreen = ({ onRetry, isChecking }) => {
    return (
        <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-bg-secondary p-8 rounded-2xl shadow-xl max-w-md w-full border border-border-subtle relative overflow-hidden">
                {/* Decoración de fondo */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-2xl"></div>

                <div className="relative">
                    {/* Icono animado */}
                    <div className="mx-auto w-24 h-24 mb-6 relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-blue-500 dark:bg-blue-600 text-white p-5 rounded-full shadow-lg">
                            <Settings className="w-12 h-12 animate-spin-slow" style={{ animationDuration: '4s' }} />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 dark:bg-yellow-500 text-white p-2 rounded-full border-2 border-bg-secondary shadow-md">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-text-primary mb-3 tracking-tight">
                        Sistema en Mantenimiento
                    </h1>

                    <p className="text-text-secondary mb-8 leading-relaxed">
                        Estamos realizando mejoras en el sistema para brindarte un mejor servicio.
                        Por favor, espera unos momentos; la aplicación se reactivará automáticamente.
                    </p>

                    <div className="flex flex-col gap-3">
                        {/* Indicador de Auto-recarga */}
                        <div className="flex items-center justify-center gap-2 text-sm text-text-tertiary bg-bg-tertiary py-3 px-4 rounded-lg border border-border-divider">
                            {isChecking ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                                    <span>Verificando estado del servidor...</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    <span>La aplicación se actualizará sola</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-sm text-text-tertiary">
                FASITLAC © {new Date().getFullYear()} - Sistema Checador
            </div>
        </div>
    );
};

export default MaintenanceScreen;
