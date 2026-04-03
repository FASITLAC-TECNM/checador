import { Building2, UserCircle } from 'lucide-react';

function WelcomePage({ onSelectOption }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
            <div className="flex gap-8 flex-wrap justify-center">
                <div
                    className="w-80 h-96 flex items-center justify-center cursor-pointer bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105"
                    onClick={() => onSelectOption('register')}
                >
                    <div className="text-center text-white px-8">
                        <Building2 size={64} className="mx-auto mb-6" />
                        <h2 className="text-3xl font-bold mb-2">REGISTRAR</h2>
                        <h2 className="text-3xl font-bold">EMPRESA</h2>
                    </div>
                </div>

                <div
                    className="w-80 h-96 flex items-center justify-center cursor-pointer bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 transition-all rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105"
                    onClick={() => onSelectOption('login')}
                >
                    <div className="text-center text-white px-8">
                        <UserCircle size={64} className="mx-auto mb-6" />
                        <h2 className="text-3xl font-bold mb-2">INICIAR</h2>
                        <h2 className="text-3xl font-bold">ADMINISTRADOR</h2>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WelcomePage;