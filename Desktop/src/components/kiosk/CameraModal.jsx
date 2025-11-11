import { Camera, X } from "lucide-react";

export default function CameraModal({
  cameraMode,
  captureProgress,
  captureSuccess,
  isClosing,
  onClose,
}) {
  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-500 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden transition-all duration-500 ${
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">
                {cameraMode === "asistencia"
                  ? "Reconocimiento Facial"
                  : "Inicio de Sesión"}
              </h3>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <Camera className="w-4 h-4" />
                <span>
                  {cameraMode === "asistencia"
                    ? "Registrar Asistencia"
                    : "Acceso al Sistema"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div
            className="relative bg-gray-900 rounded-xl overflow-hidden"
            style={{ aspectRatio: "4/3" }}
          >
            <video
              id="cameraVideo"
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-40 h-52 border-4 rounded-3xl transition-all duration-300"
                style={{
                  borderColor:
                    captureProgress === 0
                      ? "rgba(59, 130, 246, 0.5)"
                      : `rgb(${Math.max(
                          59 - captureProgress * 0.37,
                          34
                        )}, ${Math.min(
                          130 + captureProgress * 0.99,
                          197
                        )}, ${Math.max(246 - captureProgress * 1.63, 94)})`,
                  boxShadow: captureSuccess
                    ? "0 0 30px rgba(34, 197, 94, 0.6)"
                    : captureProgress > 0
                    ? `0 0 ${captureProgress * 0.2}px rgba(59, 130, 246, ${
                        captureProgress * 0.006
                      })`
                    : "none",
                }}
              ></div>
            </div>

            {captureSuccess && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg shadow-2xl whitespace-nowrap">
                ✓{" "}
                {cameraMode === "asistencia"
                  ? "Registro exitoso"
                  : "Acceso concedido"}
                , Amaya Abarca
              </div>
            )}
          </div>
          <div className="mt-2 text-center">
            <p className="text-gray-600 text-sm">
              {captureSuccess
                ? cameraMode === "asistencia"
                  ? "¡Asistencia registrada correctamente! Bienvenida, Amaya Abarca"
                  : "¡Acceso concedido! Bienvenida, Amaya Abarca"
                : captureProgress > 0
                ? `Analizando rostro... ${captureProgress}%`
                : cameraMode === "asistencia"
                ? "Coloca tu rostro dentro del marco para registrar tu asistencia"
                : "Coloca tu rostro dentro del marco para iniciar sesión"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}