import { Info } from 'lucide-react';

const AdNote = ({ title, description, color }) => {

    return (
        <div className={`mb-6 p-4 bg-${color}-50 border border-${color}-200 rounded-xl`}>
            <div className="flex items-start gap-3">
                <Info className={`w-5 h-5 text-${color}-600 mt-0.5 flex-shrink-0`} />
                <div>
                    <p className={`text-${color}-600 font-medium text-sm`}>{title}</p>
                    <p className={`text-[#6E6E73] text-sm mt-1`}>
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AdNote;