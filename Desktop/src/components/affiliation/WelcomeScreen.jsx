import { Monitor, HardDrive, Wifi, Building2, Lock } from "lucide-react";

export default function WelcomeScreen({ onClose }) {
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-bg-primary rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-bg-primary bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Monitor className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">
                  ¡Bienvenido al Sistema de Asistencia!
                </h2>
                <p className="text-blue-100 mt-1">
                  Configuración inicial en 4 pasos
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200 hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    1
                  </div>
                  <HardDrive className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-bold text-text-primary mb-2">
                    Configurar Nodo
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Registre nombre, descripción, dirección MAC y sistema
                    operativo del nodo
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-5 border-2 border-indigo-200 hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    2
                  </div>
                  <Wifi className="w-8 h-8 text-indigo-600 mb-3" />
                  <h3 className="font-bold text-text-primary mb-2">
                    Agregar Dispositivos
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Configure cámaras IP, lectores USB y otros dispositivos
                    conectados
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border-2 border-purple-200 hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    3
                  </div>
                  <Building2 className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-bold text-text-primary mb-2">
                    Afiliarse a Empresa
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Ingrese el código único de su empresa para vincular este
                    nodo
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200 hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    4
                  </div>
                  <Lock className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-bold text-text-primary mb-2">
                    Esperando Aprobación
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    El administrador de la empresa validará su solicitud de
                    acceso
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100">
              <h3 className="text-lg font-bold text-text-primary mb-4">
                📋 Antes de comenzar, asegúrese de tener:
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">
                      Código de la Empresa
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Proporcionado por su administrador (formato ABC-XYZ-123)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">
                      Información del Nodo
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Nombre, MAC, IP y descripción del sistema de control
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">
                      Dispositivos Conectados
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Detalles de cámaras, sensores y lectores biométricos
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">
                      Permisos de Administrador
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Para configurar el sistema y vincular dispositivos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold text-lg shadow-lg transition-all hover:shadow-xl flex items-center gap-3"
              >
                Comenzar Configuración
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
