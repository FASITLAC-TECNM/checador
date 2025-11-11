import { useState } from "react";
import { Mail, Eye, EyeOff, Lock, ArrowRight, Shield } from "lucide-react";

const LoginPage = ({ settings = {}, onLogin }) => {
    const companyName = settings.companyName || "FASITLAC™";
    const companyLogo = settings.companyLogo || null;

    const [showPassword, setShowPassword] = useState(false);
    const [credentials, setCredentials] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (credentials.email && credentials.password) {
            if (onLogin) {
                onLogin(credentials);
            }
        } else {
            alert('Por favor completa todos los campos');
        }
    };

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 items-center justify-center px-6">
            <div className="w-full max-w-5xl bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-white/10">
                {/* Panel izquierdo */}
                <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-start px-16 py-20 bg-gradient-to-br from-blue-700 to-blue-900">
                    <div className="flex items-center gap-4 mb-10">
                        {companyLogo ? (
                            <img
                                src={companyLogo}
                                alt="Logo"
                                className="w-16 h-16 object-contain bg-white rounded-2xl p-2 shadow-lg"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                        )}
                        <h1 className="text-4xl font-bold text-white">{companyName}</h1>
                    </div>
                    <h2 className="text-4xl font-bold text-white leading-tight">
                        Gestiona tu empresa con{" "}
                        <span className="text-sky-300">eficiencia</span>
                    </h2>
                    <p className="text-slate-200 mt-4 max-w-md">
                        Accede al panel administrativo y mantén el control con una interfaz moderna y clara.
                    </p>
                </div>

                {/* Panel derecho */}
                <div className="w-full lg:w-1/2 bg-white rounded-3xl lg:rounded-none flex flex-col justify-center px-8 py-16">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-blue-950 mb-2">Bienvenido</h2>
                        <p className="text-slate-600">
                            Ingresa tus datos para continuar
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-blue-950 text-sm font-semibold mb-1">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    name="email"
                                    value={credentials.email}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-blue-950 placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:bg-white transition-all"
                                    placeholder="ejemplo@correo.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-blue-950 text-sm font-semibold mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3.5 pl-12 pr-12 text-blue-950 placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:bg-white transition-all"
                                    placeholder="Escribe tu contraseña..."
                                    required
                                />
                                {showPassword ? (
                                    <EyeOff
                                        size={20}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600"
                                        onClick={() => setShowPassword(false)}
                                    />
                                ) : (
                                    <Eye
                                        size={20}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600"
                                        onClick={() => setShowPassword(true)}
                                    />
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                            <span className="flex items-center justify-center gap-2">
                                Iniciar Sesión
                                <ArrowRight size={20} />
                            </span>
                        </button>
                    </form>

                    <div className="text-center text-sm text-slate-600 mt-6">
                        ¿No tienes cuenta? Contacta al{" "}
                        <span className="text-blue-600 font-semibold">
                            administrador
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;