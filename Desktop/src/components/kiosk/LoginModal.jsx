import { useState } from "react";
import { LogIn, User, Eye, EyeOff, X, Camera, Loader } from "lucide-react";
import { loginUsuario, guardarSesion } from "../../services/authService";

export default function LoginModal({
  onClose,
  onFacialLogin,
  onLoginSuccess, // Callback cuando el login es exitoso
}) {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (!loginUsername.trim()) {
      setError("Por favor ingrese su usuario");
      return;
    }

    if (!loginPassword.trim()) {
      setError("Por favor ingrese su contraseña");
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">
                Inicio de Sesión
              </h3>
              <p className="text-white/90 text-sm">
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

        <form onSubmit={handleLogin} className="p-5">
          {/* Mensaje de error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="dansoto"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Contraseña (Email)
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="tu-email@empresa.com"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="ml-2 text-gray-600">Recordar sesión</span>
              </label>
              <button
                type="button"
                className="text-blue-600 hover:underline font-medium"
                disabled={loading}
              >
                ¿Olvidó su contraseña?
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="submit"
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
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">o</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onFacialLogin}
              disabled={loading}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              Iniciar con Reconocimiento Facial
            </button>
          </div>

          {/* Ayuda de ejemplo */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Ejemplo:</strong>
              <br />
              Usuario: <code className="bg-blue-100 px-1 rounded">dansoto</code>
              <br />
              Contraseña:{" "}
              <code className="bg-blue-100 px-1 rounded">
                dansoto804@gmail.com
              </code>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
