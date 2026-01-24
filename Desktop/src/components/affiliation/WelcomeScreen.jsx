import { HardDrive, Camera, Building2, Lock } from "lucide-react";

export default function WelcomeScreen({ onClose }) {
  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Header fijo */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-5 text-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-bg-primary bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <img src="images/logo.ico" alt="Logo" className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              Sistema de Asistencia - Desktop
            </h2>
            <p className="text-blue-100 text-sm">
              Configuración inicial en 4 pasos
            </p>
          </div>
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="p-6 max-w-6xl mx-auto">
          {/* Grid de 4 pasos con tamaño uniforme */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {/* Paso 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200 hover:shadow-lg transition-shadow h-48 flex flex-col">
              <div className="flex flex-col items-center text-center flex-1 justify-center">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-2">
                  1
                </div>
                <HardDrive className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-bold text-text-primary mb-1 text-sm">
                  Configurar Nodo
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Registre nombre, descripción y sistema operativo
                </p>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-5 border-2 border-indigo-200 hover:shadow-lg transition-shadow h-48 flex flex-col">
              <div className="flex flex-col items-center text-center flex-1 justify-center">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-2">
                  2
                </div>
                <Camera className="w-8 h-8 text-indigo-600 mb-2" />
                <h3 className="font-bold text-text-primary mb-1 text-sm">
                  Agregar Dispositivos
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Configure cámaras IP y lectores USB
                </p>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border-2 border-purple-200 hover:shadow-lg transition-shadow h-48 flex flex-col">
              <div className="flex flex-col items-center text-center flex-1 justify-center">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-2">
                  3
                </div>
                <Building2 className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="font-bold text-text-primary mb-1 text-sm">
                  Afiliarse a Empresa
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Ingrese el código de su empresa
                </p>
              </div>
            </div>

            {/* Paso 4 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200 hover:shadow-lg transition-shadow h-48 flex flex-col">
              <div className="flex flex-col items-center text-center flex-1 justify-center">
                <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-2">
                  4
                </div>
                <Lock className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-bold text-text-primary mb-1 text-sm">
                  Esperando Aprobación
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  El administrador validará su solicitud
                </p>
              </div>
            </div>
          </div>

          {/* Sección de requisitos */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-100">
            <h3 className="text-base font-bold text-text-primary mb-3">
              Antes de comenzar, asegúrese de tener:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">
                    Código de la Empresa
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Proporcionado por su administrador (formato EMA-XXXXX)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
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
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
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
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
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
        </div>
      </div>

      {/* Footer fijo con botón */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-t border-blue-100 px-6 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex justify-center">
          <button
            onClick={onClose}
            className="px-10 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg transition-all hover:shadow-xl flex items-center gap-3 text-base"
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
  );
}
