import React, { createContext, useContext, useState, useCallback } from 'react';
import NotificationToast from '../components/NotificationToast';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification debe usarse dentro de NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((notification) => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { ...notification, id }]);

        // Disparar evento para la bandeja de notificaciones
        window.dispatchEvent(new CustomEvent('notification-added', {
            detail: notification
        }));

        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const success = useCallback((title, message, duration) => {
        return addNotification({ type: 'success', title, message, duration });
    }, [addNotification]);

    const error = useCallback((title, message, duration) => {
        return addNotification({ type: 'error', title, message, duration });
    }, [addNotification]);

    const warning = useCallback((title, message, duration) => {
        return addNotification({ type: 'warning', title, message, duration });
    }, [addNotification]);

    const info = useCallback((title, message, duration) => {
        return addNotification({ type: 'info', title, message, duration });
    }, [addNotification]);

    // Función para reemplazar confirm()
    const confirm = useCallback((title, message) => {
        return new Promise((resolve) => {
            const id = Date.now() + Math.random();
            setNotifications(prev => [...prev, {
                id,
                type: 'warning',
                title,
                message,
                isConfirm: true,
                onConfirm: () => {
                    removeNotification(id);
                    resolve(true);
                },
                onCancel: () => {
                    removeNotification(id);
                    resolve(false);
                },
                duration: 0 // No auto-close
            }]);
        });
    }, [removeNotification]);

    return (
        <NotificationContext.Provider
            value={{
                success,
                error,
                warning,
                info,
                confirm,
                addNotification,
                removeNotification
            }}
        >
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
                {notifications.map(notification => (
                    notification.isConfirm ? (
                        <ConfirmDialog
                            key={notification.id}
                            notification={notification}
                            onClose={removeNotification}
                        />
                    ) : (
                        <NotificationToast
                            key={notification.id}
                            notification={notification}
                            onClose={removeNotification}
                        />
                    )
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

// Componente para diálogos de confirmación
const ConfirmDialog = ({ notification, onClose }) => {
    const { id, title, message, onConfirm, onCancel } = notification;

    return (
        <div className="bg-white rounded-xl border-2 border-yellow-200 shadow-2xl p-5 animate-slideInRight" style={{ minWidth: '320px', maxWidth: '420px' }}>
            <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-[#1D1D1F] mb-1">{title}</h4>
                    {message && <p className="text-sm text-[#6E6E73]">{message}</p>}
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onConfirm}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all font-semibold"
                >
                    Confirmar
                </button>
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2.5 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] active:scale-95 transition-all font-semibold"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

// Agregar componente AlertCircle localmente si no está importado
const AlertCircle = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

export default NotificationProvider;
