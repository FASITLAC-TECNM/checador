import { useState } from "react";
import {
  User,
  Eye,
  EyeOff,
  X,
  Camera,
  Loader,
  Fingerprint,
} from "lucide-react";
import { loginUsuario, guardarSesion } from "../../services/authService";

import BiometricReader from "./BiometricReader";

export default function LoginModal({ onClose, onFacialLogin, onLoginSuccess }) {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (!loginUsername.trim()) {
      setError("Por favor ingrese su usuario");
      return;
    }

    if (!loginPassword.trim()) {
      setError("Por favor ingrese su PIN");
      return;
    }

    setLoading(true);

    try {
      const resultado = await loginUsuario(loginUsername, loginPassword);

      if (resultado.success) {
        // Guardar sesión si el usuario marcó "Recordar sesión"
        if (rememberMe) {
          guardarSesion(resultado.usuario);
        }

        // Llamar callback de éxito
        if (onLoginSuccess) {
          onLoginSuccess(resultado.usuario);
        }

        // Cerrar modal
        onClose();
      } else {
        setError(resultado.error);
      }
    } catch (err) {
      setError("Error al conectar con el servidor. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = () => {
    setShowBiometricModal(true);
  };

  const handleBiometricSuccess = (data) => {
    // Login automático después de verificar la huella
    if (onLoginSuccess) {
      onLoginSuccess({
        username: "Usuario Biométrico",
        loginMethod: "biometric",
        fingerprintData: data,
      });
    }
    setShowBiometricModal(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
        <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  Inicio de Sesión
                </h3>
                <p className="text-blue-100 text-sm">
                  Ingrese sus credenciales de acceso
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* Mensaje de error */}
            {error && (
              <div className="mb-4 p-3 bg-bg-secondary border border-red-500 rounded-lg">
                <p className="text-red-500 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1">
                  Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-text-disabled" />
                  </div>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="dansoto"
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-primary border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-text-primary placeholder:text-text-disabled"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1">
                  PIN
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Ingrese su PIN"
                    className="w-full px-4 py-2.5 bg-bg-primary border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-text-primary placeholder:text-text-disabled"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-disabled hover:text-text-secondary"
                    disabled={loading}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold text-base shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "INICIAR SESIÓN"
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-subtle"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-bg-primary text-text-tertiary">
                    o inicia con
                  </span>
                </div>
              </div>

              {/* Botón de Huella Digital - Ahora abre BiometricReader */}
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
              >
                <Fingerprint className="w-4 h-4" />
                Iniciar con Huella Digital
              </button>

              {/* Botón de Reconocimiento Facial - Para futuro uso */}
              {onFacialLogin && (
                <button
                  type="button"
                  onClick={onFacialLogin}
                  disabled={loading}
                  className="w-full py-2.5 bg-bg-secondary hover:bg-bg-tertiary text-text-secondary rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  Iniciar con Reconocimiento Facial
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Biométrico - Renderiza el componente BiometricReader */}
      {showBiometricModal && (
        <BiometricReader
          isOpen={showBiometricModal}
          onClose={() => setShowBiometricModal(false)}
          onVerificationSuccess={handleBiometricSuccess}
        />
      )}
    </>
  );
}
