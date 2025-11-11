import { Bell } from "lucide-react";

export default function NoticeCard({ notice, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-3 border-t-4 border-blue-500 cursor-pointer transform hover:-translate-y-1 h-full"
    >
      <div className="flex items-center gap-2 text-blue-600 mb-2">
        <Bell className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs font-bold">{notice.time}</span>
      </div>
      <h4 className="font-bold text-gray-800 mb-1 text-sm line-clamp-1">
        {notice.subject || notice.message.substring(0, 35)}
      </h4>
      <p className="text-xs text-gray-600 line-clamp-2">
        {notice.message}
      </p>
    </div>
  );
}