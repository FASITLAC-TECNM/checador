import React from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({
    placeholder = "Buscar...",
    value,
    onChange,
    onClear,
    className = ""
}) => {
    const handleClear = () => {
        if (onClear) {
            onClear();
        } else if (onChange) {
            onChange({ target: { value: '' } });
        }
    };

    return (
        <div className={`relative ${className}`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-[#86868B]" />
            </div>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full pl-11 pr-10 py-3 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-[#86868B] shadow-sm hover:border-[#86868B]"
            />
            {value && (
                <button
                    onClick={handleClear}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#86868B] hover:text-[#1D1D1F] transition-colors"
                    type="button"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

export default SearchBar;
