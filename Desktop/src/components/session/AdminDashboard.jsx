import React, { useState } from "react";
import {
    Settings,
    Smartphone,
    Sliders,
    ChevronRight,
    User,
    Phone,
    Mail,
    LogOut,
    ShieldOff,
} from "lucide-react";
import GeneralNodoModal from "./GeneralNodoModal";
import DispositivosModal from "./DispositivosModal";
import PreferenciasModal from "./PreferenciasModal";

export default function AdminDashboard({ escritorioId, datosCompletos, onLogout }) {
    const [activeSection, setActiveSection] = useState("general");

    const userName = datosCompletos?.nombre || "Admin";
    const userEmail = datosCompletos?.correo || datosCompletos?.email || "N/A";
    const userPhone = datosCompletos?.telefono || "N/A";
    const userUsername = datosCompletos?.usuario || datosCompletos?.username || "admin";
    const estado = datosCompletos?.estado || "CONECTADO";
    const isAdmin = datosCompletos?.usuario === "admin" || datosCompletos?.correo === "admin@gmail.com" || datosCompletos?.email === "admin@gmail.com";

    const menuItems = [
        {
            id: "general",
            title: "General del Nodo",
            description: "Información y red",
            icon: Settings,
        },
        {
            id: "dispositivos",
            title: "Dispositivos",
            description: "Lectores y cámaras",
            icon: Smartphone,
        },
        {
            id: "preferencias",
            title: "Preferencias",
            description: "Ajustes del sistema",
            icon: Sliders,
        },
    ];

    return (
        <div className="flex h-full rounded-2xl shadow-lg border border-border-subtle overflow-hidden">
            {/* ===== SIDEBAR ===== */}
            <aside className="w-[280px] bg-bg-secondary border-r border-border-subtle flex flex-col flex-shrink-0">

                {/* Profile Card */}
                <div className="p-5 border-b border-border-subtle">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-[#1976D2] rounded-full p-[2px]">
                                <div className="w-full h-full bg-bg-primary rounded-full" />
                            </div>
                            {datosCompletos?.foto ? (
                                <img
                                    src={datosCompletos.foto}
                                    alt={userName}
                                    className="relative w-14 h-14 rounded-full object-cover border-[3px] border-transparent"
                                    style={{ background: "none" }}
                                />
                            ) : (
                                <div className="relative w-14 h-14 bg-[#E3F2FD] dark:bg-[#1565C0]/20 rounded-full flex items-center justify-center shadow-md border-2 border-[#1976D2]">
                                    <User className="w-7 h-7 text-[#1976D2] dark:text-[#42A5F5]" />
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-bg-secondary" />
                        </div>

                        <div className="flex flex-col overflow-hidden">
                            <h2 className="text-base font-bold text-text-primary truncate leading-tight">
                                {userName}
                            </h2>
                            <span className="inline-flex w-fit mt-1 px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-bold rounded-full">
                                {estado}
                            </span>
                        </div>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2.5 text-xs">
                            <div className="w-6 h-6 bg-[#E3F2FD] dark:bg-[#1565C0]/20 rounded-md flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-[#1976D2]" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-text-tertiary text-[10px] font-semibold uppercase tracking-wider">Usuario</p>
                                <p className="text-text-primary font-medium truncate">{userUsername}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs">
                            <div className="w-6 h-6 bg-[#E3F2FD] dark:bg-[#1565C0]/20 rounded-md flex items-center justify-center flex-shrink-0">
                                <Phone className="w-3.5 h-3.5 text-[#1976D2]" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-text-tertiary text-[10px] font-semibold uppercase tracking-wider">Teléfono</p>
                                <p className="text-text-primary font-medium truncate">{userPhone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs">
                            <div className="w-6 h-6 bg-[#E3F2FD] dark:bg-[#1565C0]/20 rounded-md flex items-center justify-center flex-shrink-0">
                                <Mail className="w-3.5 h-3.5 text-[#1976D2]" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-text-tertiary text-[10px] font-semibold uppercase tracking-wider">Email</p>
                                <p className="text-text-primary font-medium truncate">{userEmail}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Menu - Solo admins */}
                {isAdmin && (
                    <div className="flex-1 p-3 space-y-1 overflow-y-auto">
                        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider px-3 mb-2">
                            Configuración del sistema
                        </p>
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeSection === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${isActive
                                        ? "bg-[#1976D2] text-white shadow-md"
                                        : "text-text-secondary hover:bg-bg-primary"
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-[#1976D2]"}`} />
                                    <span className={`font-semibold text-sm ${isActive ? "text-white" : "text-text-primary"}`}>
                                        {item.title}
                                    </span>
                                    {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
                                </button>
                            );
                        })}
                    </div>
                )}
                {!isAdmin && <div className="flex-1" />}

                {/* Logout */}
                <div className="p-3 border-t border-border-subtle">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* ===== CONTENT AREA ===== */}
            <main className="flex-1 bg-bg-primary overflow-y-auto">
                {isAdmin ? (
                    <>
                        {activeSection === "general" && (
                            <GeneralNodoModal inline />
                        )}
                        {activeSection === "dispositivos" && (
                            <DispositivosModal inline escritorioId={escritorioId} />
                        )}
                        {activeSection === "preferencias" && (
                            <PreferenciasModal inline />
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <div className="w-20 h-20 bg-bg-secondary rounded-2xl flex items-center justify-center mb-5">
                            <ShieldOff className="w-10 h-10 text-text-tertiary" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">Información no disponible</h3>
                        <p className="text-text-secondary text-sm max-w-md">
                            No tienes permisos de administrador para acceder a las configuraciones del sistema.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
