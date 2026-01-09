import { useState } from "react";
import BiometricReader from "./BiometricReader";
import { UserPlus, X } from "lucide-react";

/**
 * Modal para registrar huellas dactilares
 * Ejemplo de uso del BiometricReader en modo "enroll"
 */
export default function EnrollFingerprintModal({ isOpen, onClose }) {
  const [showBiometricReader, setShowBiometricReader] = useState(false);

  const handleEnrollmentSuccess = (data) => {
    console.log("✅ Huella registrada exitosamente:", data);

    // Aquí puedes hacer lo que necesites con los datos
    // data.userId - ID del usuario del middleware
    // data.idEmpleado - ID del empleado en la BD
    // data.idCredencial - ID de la credencial creada
    // data.timestamp - Timestamp del registro

    // Cerrar el modal después de un momento
    setTimeout(() => {
      setShowBiometricReader(false);
      if (onClose) onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <>
      {!showBiometricReader ? (
        // Pantalla inicial
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Registrar Huella Digital
              </h2>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="bg-blue-500 p-6 rounded-full w-24 h-24 mx-auto mb-4">
                <UserPlus className="w-12 h-12 text-white mx-auto" />
              </div>
              <p className="text-white/80 text-lg">
                Este modal te permite registrar huellas dactilares para
                cualquier empleado ingresando manualmente su ID.
              </p>
            </div>

            <button
              onClick={() => setShowBiometricReader(true)}
              className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Comenzar Registro
            </button>
          </div>
        </div>
      ) : (
        // Modal del BiometricReader
        <BiometricReader
          isOpen={showBiometricReader}
          onClose={() => {
            setShowBiometricReader(false);
            if (onClose) onClose();
          }}
          onEnrollmentSuccess={handleEnrollmentSuccess}
          mode="enroll"
          // idEmpleado={null} - No pasamos ID para que el usuario lo ingrese manualmente
        />
      )}
    </>
  );
}
