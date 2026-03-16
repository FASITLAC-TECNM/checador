import { Bell, User, Calendar, FileText, X } from "lucide-react";

export default function NoticeDetailModal({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden relative">
        <div className="bg-bg-primary p-6 border-b border-border-subtle">
        {/* Modal Header/Top section: Author and Date */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E3F2FD] dark:bg-[#1565C0]/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-[#1976D2]" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#1976D2] uppercase tracking-widest leading-none mb-1">Autor</p>
                <p className="text-sm font-bold text-text-primary">{notice.author}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest leading-none mb-1">Fecha y Hora</p>
              <p className="text-sm font-medium text-text-secondary">{notice.date} • {notice.time}</p>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-secondary hover:bg-bg-secondary rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent mb-8" />

          {/* Title section */}
          <div className="mb-6">
            <h3 className="text-2xl font-black text-text-primary leading-tight tracking-tight">
              {notice.subject}
            </h3>
          </div>

          {/* Body/Detail section */}
          <div className="bg-bg-secondary/50 rounded-2xl p-6 border border-border-subtle/50 mb-6">
            <p className="text-text-primary leading-relaxed whitespace-pre-wrap text-justify">
              {notice.detail}
            </p>
          </div>
        </div>


        </div>
      </div>
    </div>
  );
}