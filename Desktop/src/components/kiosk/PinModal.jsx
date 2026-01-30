import { User, Lock, Eye, EyeOff, X, Clock } from "lucide-react";
import { useState } from "react";

export default function PinModal({ onClose }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center mb-3">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Checador</h2>
            <p className="text-white/80 text-sm">
              Sistema de Control de Asistencias
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="p-6 space-y-4">
          <h3 className="text-xl font-semibold text-text-primary text-center mb-4">
            Ingresa tu usuario/correo y PIN
          </h3>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Usuario o Correo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-text-disabled" />
              </div>
              <input
                type="text"
                placeholder="tu.usuario o correo@ejemplo.com"
                className="w-full pl-10 pr-4 py-2.5 border border-border-subtle rounded-lg bg-bg-secondary text-text-primary placeholder-text-disabled focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Contrasena
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-text-disabled" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 border border-border-subtle rounded-lg bg-bg-secondary text-text-primary placeholder-text-disabled focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-disabled hover:text-text-secondary"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold text-base shadow-lg transition-all mt-2">
            Registrar Asistencia
          </button>
        </div>
      </div>
    </div>
  );
}
