import { User, Eye, EyeOff, X } from "lucide-react";

export default function PinModal({
  employeeId,
  setEmployeeId,
  employeePin,
  setEmployeePin,
  showPin,
  setShowPin,
  onClose,
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">
                Registro con PIN
              </h3>
              <p className="text-white/90 text-sm">
                Ingrese su ID de empleado y PIN
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-bg-primary/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1">
              ID de Empleado
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-text-disabled" />
              </div>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="001234"
                className="w-full pl-10 pr-4 py-2.5 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1">
              PIN
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={employeePin}
                onChange={(e) => setEmployeePin(e.target.value)}
                placeholder="••••"
                className="w-full px-4 py-2.5 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-base tracking-widest"
              />
              <button
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-disabled hover:text-text-secondary"
              >
                {showPin ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold text-base shadow-lg transition-all"
          >
            REGISTRAR ASISTENCIA
          </button>

          <p className="text-center text-xs text-text-tertiary mt-2">
            ¿Olvidó su PIN?{" "}
            <button className="text-blue-600 hover:underline font-medium">
              Contacte a RH
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}