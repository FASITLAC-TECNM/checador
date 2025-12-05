import { X, CheckCircle, XCircle } from "lucide-react";

export default function CameraModal({
  cameraMode,
  captureProgress,
  captureSuccess,
  captureFailed,
  isClosing,
  onClose,
}) {
  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`bg-bg-primary rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transition-all duration-300 ${
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                {cameraMode === "asistencia" ? "Registro de Asistencia" : "Inicio de Sesión"}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">Reconocimiento Facial</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="p-6">
          <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
            <video
              id="cameraVideo"
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Esquinas simples */}
            {!captureSuccess && !captureFailed && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-56 h-72">
                  <div
                    className="absolute top-0 left-0 w-12 h-12 border-l-[3px] border-t-[3px] transition-all duration-300"
                    style={{
                      borderColor: captureProgress > 0 ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                      filter: captureProgress > 0 ? 'drop-shadow(0 0 8px rgba(59,130,246,0.8))' : 'none'
                    }}
                  />
                  <div
                    className="absolute top-0 right-0 w-12 h-12 border-r-[3px] border-t-[3px] transition-all duration-300"
                    style={{
                      borderColor: captureProgress > 0 ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                      filter: captureProgress > 0 ? 'drop-shadow(0 0 8px rgba(59,130,246,0.8))' : 'none'
                    }}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-12 h-12 border-l-[3px] border-b-[3px] transition-all duration-300"
                    style={{
                      borderColor: captureProgress > 0 ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                      filter: captureProgress > 0 ? 'drop-shadow(0 0 8px rgba(59,130,246,0.8))' : 'none'
                    }}
                  />
                  <div
                    className="absolute bottom-0 right-0 w-12 h-12 border-r-[3px] border-b-[3px] transition-all duration-300"
                    style={{
                      borderColor: captureProgress > 0 ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                      filter: captureProgress > 0 ? 'drop-shadow(0 0 8px rgba(59,130,246,0.8))' : 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Éxito */}
            {captureSuccess && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-3 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-1">
                    {cameraMode === "asistencia" ? "¡Registro Exitoso!" : "¡Acceso Concedido!"}
                  </h4>
                  <p className="text-white/90 text-sm">Bienvenida, <strong>Amaya Abarca</strong></p>
                </div>
              </div>
            )}

            {/* Error */}
            {captureFailed && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-3 bg-red-500 rounded-full flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-1">No Identificado</h4>
                  <p className="text-white/90 text-sm">Intenta de nuevo</p>
                </div>
              </div>
            )}

          </div>

          {/* Instrucción */}
          <p className="text-center text-text-secondary text-sm mt-4">
            Coloca tu rostro frente a la cámara
          </p>
        </div>
      </div>
    </div>
  );
}