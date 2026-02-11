import { Bell, User, Calendar, FileText, X } from "lucide-react";

export default function NoticeDetailModal({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="bg-bg-primary p-6 border-b border-border-subtle">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-text-primary" />
              <div>
                <h3 className="text-2xl font-bold text-text-primary">
                  Detalle del Aviso
                </h3>
                <p className="text-text-secondary text-sm mt-1">Información completa</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:bg-bg-secondary rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-bg-secondary border border-border-subtle rounded-xl p-3">
            <div className="flex items-center gap-2 text-text-primary mb-2">
              <FileText className="w-4 h-4" />
              <h4 className="font-bold text-base">{notice.subject}</h4>
            </div>
            <p className="text-text-secondary leading-relaxed text-sm">{notice.detail}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-secondary rounded-lg p-3">
              <div className="flex items-center gap-2 text-text-secondary mb-1">
                <User className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Autor</span>
              </div>
              <p className="text-text-primary font-medium text-sm">
                {notice.author}
              </p>
            </div>

            <div className="bg-bg-secondary rounded-lg p-3">
              <div className="flex items-center gap-2 text-text-secondary mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">
                  Fecha y Hora
                </span>
              </div>
              <p className="text-text-primary font-medium text-sm">
                {notice.date} - {notice.time}
              </p>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}