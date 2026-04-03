import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

const Maintenance = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center">
                <div className="bg-yellow-500 p-6 flex justify-center">
                    <div className="p-4 bg-yellow-600/20 rounded-full backdrop-blur-sm">
                        <AlertTriangle className="w-16 h-16 text-white" />
                    </div>
                </div>

                <div className="p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Sistema en Mantenimiento</h1>
                    <p className="text-gray-500 mb-6">
                        Estamos realizando mejoras importantes en nuestra plataforma.
                        Por favor, intenta ingresar más tarde.
                    </p>

                    <div className="flex items-center justify-center gap-2 text-sm text-yellow-600 bg-yellow-50 py-3 px-4 rounded-lg">
                        <Clock className="w-4 h-4" />
                        <span>Tiempo estimado: Indefinido</span>
                    </div>
                </div>

                <div className="px-8 pb-8 space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
                    >
                        Reintentar conexión
                    </button>

                    <a href="/login" className="block text-center text-sm text-gray-400 hover:text-gray-600 underline transition-colors">
                        Ingresar como Administrador
                    </a>
                </div>
            </div>

            <p className="mt-8 text-sm text-gray-400">
                &copy; {new Date().getFullYear()} FASITLAC. Todos los derechos reservados.
            </p>
        </div>
    );
};

export default Maintenance;
