import { createPortal } from 'react-dom';
import { FiAlertCircle, FiInfo } from 'react-icons/fi';

function ConfirmBox({ message, onConfirm, onCancel }) {
    const isConfirm = !!onCancel;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onCancel || onConfirm}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-gray-700 max-w-sm w-full animate-[fadeIn_0.15s_ease-out] overflow-hidden">
                {/* Barra superior de color */}
                <div className={`h-1.5 ${isConfirm ? 'bg-orange-500' : 'bg-primary-500'}`} />

                <div className="p-6">
                    {/* Icono + Mensaje */}
                    <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isConfirm
                            ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                            : 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                            }`}>
                            {isConfirm
                                ? <FiAlertCircle className="w-5 h-5" />
                                : <FiInfo className="w-5 h-5" />
                            }
                        </div>
                        <div className="flex-1 pt-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                {isConfirm ? 'Confirmar acción' : 'Aviso'}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{message}</p>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 mt-6">
                        {isConfirm ? (
                            <>
                                <button
                                    onClick={onCancel}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="btn-primary shadow-none"
                                >
                                    Continuar
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onConfirm}
                                className="btn-primary py-2 px-6 shadow-none"
                            >
                                OK
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default ConfirmBox;
