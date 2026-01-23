import { Monitor, HardDrive, Camera, Building2, Lock } from "lucide-react";

export default function WelcomeScreen({ onClose }) {
  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-bg-primary bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <img src="images/logo.ico" alt="Logo" className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">
                Sistema de Asistencia - Desktop
              </h2>
              <p className="text-blue-100 mt-1">
                Configuración inicial en 4 pasos
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="p-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    1
                  </div>
                  <HardDrive className="w-9 h-9 text-blue-600 mb-3" />
                  <h3 className="font-bold text-text-primary mb-2 text-base">
                    Configurar Nodo
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Registre nombre, descripción y sistema operativo
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border-2 border-indigo-200 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    2
                  </div>
                  <Camera className="w-9 h-9 text-indigo-600 mb-3" />
                  <h3 className="font-bold text-text-primary mb-2 text-base">
                    Agregar Dispositivos
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Configure cámaras IP y lectores USB
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    3
                  </div>
                  <Building2 className="w-9 h-9 text-purple-600 mb-3" />
                  <h3 className="font-bold text-text-primary mb-2 text-base">
                    Afiliarse a Empresa
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Ingrese el código de su empresa
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    4
                  </div>
                  <Lock className="w-9 h-9 text-green-600 mb-3" />
                  <h3 className="font-bold text-text-primary mb-2 text-base">
                    Esperando Aprobación
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    El administrador validará su solicitud
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100 mb-8">
              <h3 className="text-lg font-bold text-text-primary mb-4">
                Antes de comenzar, asegúrese de tener:
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                  <div>
                    <p className="font-semibold text-text-primary text-base">
                      Código de la Empresa
                    </p>
                    <p className="text-sm text-text-secondary mt-1.5">
                      Proporcionado por su administrador (formato EMA-XXXXX)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                  <div>
                    <p className="font-semibold text-text-primary text-base">
                      Información del Nodo
                    </p>
                    <p className="text-sm text-text-secondary mt-1.5">
                      Nombre, MAC, IP y descripción del sistema de control
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                  <div>
                    <p className="font-semibold text-text-primary text-base">
                      Dispositivos Conectados
                    </p>
                    <p className="text-sm text-text-secondary mt-1.5">
                      Detalles de cámaras, sensores y lectores biométricos
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                  <div>
                    <p className="font-semibold text-text-primary text-base">
                      Permisos de Administrador
                    </p>
                    <p className="text-sm text-text-secondary mt-1.5">
                      Para configurar el sistema y vincular dispositivos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={onClose}
                className="px-10 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg transition-all hover:shadow-xl flex items-center gap-3 text-base"
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
