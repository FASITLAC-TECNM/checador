import { Bell, User, Calendar, FileText, X } from "lucide-react";

export default function NoticeDetailModal({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Detalle del Aviso
                </h3>
                <p className="text-white/90 text-sm">Información completa</p>
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

        <div className="p-5 space-y-3">
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <FileText className="w-4 h-4" />
              <h4 className="font-bold text-base">{notice.subject}</h4>
            </div>
            <p className="text-gray-700 leading-relaxed text-sm">{notice.detail}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <User className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Autor</span>
              </div>
              <p className="text-gray-800 font-medium text-sm">
                {notice.author}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">
                  Fecha y Hora
                </span>
              </div>
              <p className="text-gray-800 font-medium text-sm">
                {notice.date} - {notice.time}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold text-base shadow-lg transition-all"
          >
            CERRAR
          </button>
        </div>
      </div>
    </div>
  );
}