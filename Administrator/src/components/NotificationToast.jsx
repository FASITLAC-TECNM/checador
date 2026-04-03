import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const NotificationToast = ({ notification, onClose }) => {
    const { id, type, title, message, duration = 5000 } = notification;

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose(id);
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [id, duration, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        warning: <AlertCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />
    };

    const colors = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const iconColors = {
        success: 'text-green-600',
        error: 'text-red-600',
        warning: 'text-yellow-600',
        info: 'text-blue-600'
    };

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-xl border-2 shadow-lg ${colors[type]} animate-slideInRight`}
            style={{
                minWidth: '320px',
                maxWidth: '420px',
                animation: 'slideInRight 0.3s ease-out'
            }}
        >
            <div className={iconColors[type]}>
                {icons[type]}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm mb-1">{title}</h4>
                {message && <p className="text-sm opacity-90">{message}</p>}
            </div>
            <button
                onClick={() => onClose(id)}
                className="text-current opacity-50 hover:opacity-100 transition-opacity"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default NotificationToast;
