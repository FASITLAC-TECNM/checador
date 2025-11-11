import HistoryCard from './HistoryCard';
import { History } from 'lucide-react';

const HistoryList = ({ records }) => {
    if (records.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-[#E5E5E7] shadow-sm">
                <History size={48} className="mx-auto text-[#86868B] mb-4" />
                <p className="text-[#6E6E73] mb-4">No se encontraron registros</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {records.map(record => (
                <HistoryCard key={record.id} record={record} />
            ))}
        </div>
    );
};

export default HistoryList;
