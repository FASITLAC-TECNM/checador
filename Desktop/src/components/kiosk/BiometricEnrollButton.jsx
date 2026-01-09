import { useState } from "react";
import BiometricReader from "./BiometricReader";
import { UserPlus } from "lucide-react";

/**
 * Botón flotante para registrar huellas dactilares
 * Puedes agregarlo en cualquier página para probar el registro
 *
 * Uso:
 * import BiometricEnrollButton from "./components/kiosk/BiometricEnrollButton";
 *
 * <BiometricEnrollButton />
 */
export default function BiometricEnrollButton() {
  const [showModal, setShowModal] = useState(false);

  const handleEnrollmentSuccess = (data) => {
    console.log("✅ Huella registrada exitosamente:", data);
    alert(
      `✅ Huella registrada para empleado ${data.idEmpleado}\n\n` +
      `ID Credencial: ${data.idCredencial}\n` +
      `User ID: ${data.userId}`
    );
    setShowModal(false);
  };

  return (
    <>
      {/* Botón flotante en la esquina inferior derecha */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full shadow-2xl transition-all transform hover:scale-110 flex items-center gap-3 group"
        title="Registrar Huella Digital"
      >
        <UserPlus className="w-6 h-6" />
        <span className="hidden group-hover:inline-block font-semibold pr-2">
          Registrar Huella
        </span>
      </button>

      {/* Modal de BiometricReader */}
      <BiometricReader
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onEnrollmentSuccess={handleEnrollmentSuccess}
        mode="enroll"
        // idEmpleado={null} - No pasar ID para habilitar entrada manual
      />
    </>
  );
}
