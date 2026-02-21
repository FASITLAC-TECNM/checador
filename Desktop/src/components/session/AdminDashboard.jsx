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
    Briefcase,
    Building2,
    FileText,
    Bell,
    Calendar,
    Fingerprint,
    Camera,
} from "lucide-react";
import GeneralNodoModal from "./GeneralNodoModal";
import DispositivosModal from "./DispositivosModal";
import PreferenciasModal from "./PreferenciasModal";
import EmployeeInfo from "./EmployeeInfo";

export default function AdminDashboard({
    escritorioId,
    datosCompletos,
    departamentos = [],
    onLogout,
    // Employee-specific props
    time,
    notices = [],
    loadingEmpleado,
    userHorario,
    readerConnected,
    isCameraConnected = false,
    isOnline,
    onShowHorario,
    onShowHistorial,
    onShowBiometric,
    onShowRegisterFace,
    onSelectNotice,
}) {
    const userName = datosCompletos?.nombre || "Usuario";
    const userEmail = datosCompletos?.correo || datosCompletos?.email || "N/A";
    const userPhone = datosCompletos?.telefono || "N/A";
    const userUsername = datosCompletos?.usuario || datosCompletos?.username || "N/A";
    const userDepartamento = datosCompletos?.departamento || datosCompletos?.departamento_nombre ||
        (departamentos.length > 0 ? departamentos.map(d => d.nombre || d).join(', ') : null);
    const userRFC = datosCompletos?.rfc;
    const userNSS = datosCompletos?.nss;

    const isAdmin = !!datosCompletos?.esAdmin || !!datosCompletos?.es_admin ||
        (Array.isArray(datosCompletos?.roles) && datosCompletos.roles.some(r => r.es_admin));
    const isEmployee = !!datosCompletos?.es_empleado || !!(datosCompletos?.rfc && datosCompletos?.nss);

    // Default section: employees see "empleado", admins see "general"
    const [activeSection, setActiveSection] = useState(
        isEmployee ? "empleado" : isAdmin ? "general" : "empleado"
    );
    const [showDeptPopover, setShowDeptPopover] = useState(false);

    // Config items for admin users
    const configItems = [
        { id: "general", title: "General del Nodo", icon: Settings },
        { id: "dispositivos", title: "Dispositivos", icon: Smartphone },
        { id: "preferencias", title: "Preferencias", icon: Sliders },
    ];

    return (
        <>
            <div className="flex h-full rounded-2xl shadow-lg border border-border-subtle overflow-hidden">
                {/* ===== SIDEBAR ===== */}
                <aside className="w-[280px] bg-bg-secondary border-r border-border-subtle flex flex-col flex-shrink-0">

                    {/* Profile Card - Compact */}
                    <div className="p-4 border-b border-border-subtle">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-[#1976D2] rounded-full p-[2px]">
                                    <div className="w-full h-full bg-bg-primary rounded-full" />
                                </div>
                                {datosCompletos?.foto ? (
                                    <img
                                        src={datosCompletos.foto}
                                        alt={userName}
                                        className="relative w-12 h-12 rounded-full object-cover border-[3px] border-transparent"
                                        style={{ background: "none" }}
                                    />
                                ) : (
                                    <div className="relative w-12 h-12 bg-[#E3F2FD] dark:bg-[#1565C0]/20 rounded-full flex items-center justify-center shadow-md border-2 border-[#1976D2]">
                                        <User className="w-6 h-6 text-[#1976D2] dark:text-[#42A5F5]" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-bg-secondary" />
                            </div>

                            <div className="flex flex-col overflow-hidden">
                                <h2 className="text-sm font-bold text-text-primary truncate leading-tight">
                                    {userName}
                                </h2>
                            </div>
                        </div>

                        {/* Info rows - Compact 2-column grid */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <User className="w-3 h-3 text-[#1976D2] flex-shrink-0" />
                                <div className="overflow-hidden">
                                    <p className="text-text-tertiary text-[9px] font-semibold uppercase leading-none">Usuario</p>
                                    <p className="text-text-primary font-medium truncate text-[11px]">{userUsername}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <Phone className="w-3 h-3 text-[#1976D2] flex-shrink-0" />
                                <div className="overflow-hidden">
                                    <p className="text-text-tertiary text-[9px] font-semibold uppercase leading-none">Teléfono</p>
                                    <p className="text-text-primary font-medium truncate text-[11px]">{userPhone}</p>
                                </div>
                            </div>
                            <div className="col-span-2 flex items-center gap-1.5 overflow-hidden">
                                <Mail className="w-3 h-3 text-[#1976D2] flex-shrink-0" />
                                <div className="overflow-hidden">
                                    <p className="text-text-tertiary text-[9px] font-semibold uppercase leading-none">Email</p>
                                    <p className="text-text-primary font-medium truncate text-[11px]">{userEmail}</p>
                                </div>
                            </div>
                            {userDepartamento && (
                                <div className="col-span-2 flex items-center gap-1.5 overflow-hidden">
                                    <Building2 className="w-3 h-3 text-[#1976D2] flex-shrink-0" />
                                    <div className="overflow-hidden flex-1 min-w-0">
                                        <p className="text-text-tertiary text-[9px] font-semibold uppercase leading-none">Departamento</p>
                                        <div className="flex items-center gap-1">
                                            <p className="text-text-primary font-medium truncate text-[11px]">
                                                {departamentos.length > 0
                                                    ? (departamentos[0]?.nombre || departamentos[0])
                                                    : (typeof userDepartamento === 'object' ? userDepartamento.nombre : userDepartamento)
                                                }
                                            </p>
                                            {departamentos.length > 1 && (
                                                <button
                                                    onClick={() => setShowDeptPopover(!showDeptPopover)}
                                                    className="px-1.5 py-0.5 bg-[#E3F2FD] dark:bg-[#1565C0]/20 text-[#1976D2] text-[9px] font-bold rounded-md hover:bg-[#BBDEFB] transition-colors flex-shrink-0"
                                                >
                                                    +{departamentos.length - 1}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {userRFC && (
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <FileText className="w-3 h-3 text-[#1976D2] flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-text-tertiary text-[9px] font-semibold uppercase leading-none">RFC</p>
                                        <p className="text-text-primary font-medium truncate text-[11px]">{userRFC}</p>
                                    </div>
                                </div>
                            )}
                            {userNSS && (
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <Fingerprint className="w-3 h-3 text-[#1976D2] flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-text-tertiary text-[9px] font-semibold uppercase leading-none">NSS</p>
                                        <p className="text-text-primary font-medium truncate text-[11px]">{userNSS}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Employee Menu Item - Above divider */}
                    {isEmployee && (
                        <div className="p-3 pb-0">
                            {(() => {
                                const Icon = Briefcase;
                                const isActive = activeSection === "empleado";
                                return (
                                    <button
                                        onClick={() => setActiveSection("empleado")}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${isActive
                                            ? "bg-[#1976D2] text-white shadow-md"
                                            : "text-text-secondary hover:bg-bg-primary"
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-[#1976D2]"}`} />
                                        <span className={`font-semibold text-sm ${isActive ? "text-white" : "text-text-primary"}`}>
                                            Información del Empleado
                                        </span>
                                        {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
                                    </button>
                                );
                            })()}
                        </div>
                    )}

                    {/* Config Menu Items - Below divider */}
                    {isAdmin && (
                        <div className={`flex-1 p-3 space-y-1 overflow-y-auto ${isEmployee ? 'border-t border-border-subtle mt-2 pt-3' : ''}`}>
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider px-3 mb-2">
                                Configuración del sistema
                            </p>
                            {configItems.map((item) => {
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
                    {/* Employee Info Section */}
                    {activeSection === "empleado" && isEmployee && (
                        <div className="p-5 h-full flex flex-col gap-4 overflow-y-auto">
                            {/* Top Row - Schedule + Notices side by side */}
                            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                                {/* Left: Schedule Card + Stats */}
                                <div className="col-span-7 flex flex-col gap-3 overflow-y-auto">
                                    <EmployeeInfo
                                        time={time}
                                        empleado={datosCompletos}
                                        horario={userHorario}
                                        loading={loadingEmpleado}
                                    />
                                </div>

                                {/* Right: Personal Notices */}
                                <div className="col-span-5 bg-bg-secondary rounded-2xl shadow-lg p-4 border border-border-subtle flex flex-col min-h-0">
                                    <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                        <Bell className="w-5 h-5 text-blue-600" />
                                        <h2 className="text-base font-bold text-text-primary">
                                            Avisos Personales
                                        </h2>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                                        {notices.length > 0 ? notices.slice(0, 6).map((notice, index) => (
                                            <div
                                                key={index}
                                                onClick={() => onSelectNotice?.(notice)}
                                                className="bg-bg-primary rounded-xl p-3 border border-border-subtle cursor-pointer hover:shadow-lg hover:border-[#1976D2]/30 transition-all"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <Bell className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] text-blue-600 font-bold mb-0.5">{notice.time}</p>
                                                        <h4 className="font-bold text-text-primary text-xs leading-tight truncate">
                                                            {notice.subject}
                                                        </h4>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                <Bell className="w-6 h-6 text-text-tertiary mb-2" />
                                                <p className="text-text-tertiary text-sm">Sin avisos recientes</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Row - Quick Action Buttons (4 columns) */}
                            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
                                <button
                                    onClick={onShowHorario}
                                    className="bg-bg-secondary hover:bg-bg-tertiary rounded-2xl shadow-sm p-4 transition-all hover:shadow-md flex flex-col items-center justify-center border border-border-subtle text-[#1976D2] dark:text-[#42A5F5]"
                                >
                                    <Calendar className="w-8 h-8 mb-2" />
                                    <h3 className="text-sm font-bold text-text-primary mb-0.5">Ver Horario</h3>
                                    <p className="text-[10px] text-text-secondary">Lunes a Domingo</p>
                                </button>

                                <button
                                    onClick={onShowHistorial}
                                    className="bg-bg-secondary hover:bg-bg-tertiary rounded-2xl shadow-sm p-4 transition-all hover:shadow-md flex flex-col items-center justify-center border border-border-subtle text-[#1976D2] dark:text-[#42A5F5]"
                                >
                                    <Calendar className="w-8 h-8 mb-2" />
                                    <h3 className="text-sm font-bold text-text-primary mb-0.5">Historial</h3>
                                    <p className="text-[10px] text-text-secondary">Días anteriores</p>
                                </button>

                                <button
                                    onClick={() => readerConnected && isOnline && onShowBiometric?.()}
                                    disabled={!readerConnected || !isOnline}
                                    className={`rounded-2xl shadow-sm p-4 transition-all flex flex-col items-center justify-center border border-border-subtle ${readerConnected && isOnline
                                        ? "bg-bg-secondary hover:bg-bg-tertiary hover:shadow-md cursor-pointer text-[#1976D2] dark:text-[#42A5F5]"
                                        : "bg-gray-100 dark:bg-slate-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                        }`}
                                >
                                    <Fingerprint className="w-8 h-8 mb-2" />
                                    <h3 className={`text-sm font-bold mb-0.5 ${readerConnected && isOnline ? "text-text-primary" : "text-gray-400 dark:text-gray-500"}`}>Reg. Huella</h3>
                                    <p className={`text-[10px] ${readerConnected && isOnline ? "text-text-secondary" : "text-gray-400 dark:text-gray-500"}`}>
                                        {!isOnline ? "Sin conexión" : readerConnected ? "Vincular huella" : "Desconectado"}
                                    </p>
                                </button>

                                <button
                                    disabled={!isOnline || !isCameraConnected}
                                    onClick={() => isOnline && isCameraConnected && onShowRegisterFace?.()}
                                    className={`rounded-2xl shadow-sm p-4 transition-all flex flex-col items-center justify-center border border-border-subtle ${isOnline && isCameraConnected
                                        ? "bg-bg-secondary hover:bg-bg-tertiary hover:shadow-md cursor-pointer text-[#1976D2] dark:text-[#42A5F5]"
                                        : "bg-gray-100 dark:bg-slate-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                        }`}
                                >
                                    <Camera className="w-8 h-8 mb-2" />
                                    <h3 className={`text-sm font-bold mb-0.5 ${isOnline && isCameraConnected ? "text-text-primary" : "text-gray-400 dark:text-gray-500"}`}>Reg. Rostro</h3>
                                    <p className={`text-[10px] ${isOnline && isCameraConnected ? "text-text-secondary" : "text-gray-400 dark:text-gray-500"}`}>
                                        {!isOnline ? "Sin conexión" : !isCameraConnected ? "Cámara no disponible" : "Reconocimiento facial"}
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Config Sections - Admin only */}
                    {activeSection === "general" && isAdmin && (
                        <GeneralNodoModal inline />
                    )}
                    {activeSection === "dispositivos" && isAdmin && (
                        <DispositivosModal inline escritorioId={escritorioId} />
                    )}
                    {activeSection === "preferencias" && isAdmin && (
                        <PreferenciasModal inline />
                    )}

                    {/* No access message */}
                    {!isEmployee && !isAdmin && (
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

            {/* Department Popover - Fixed position to avoid overflow clipping */}
            {
                showDeptPopover && departamentos.length > 1 && (
                    <>
                        <div className="fixed inset-0 z-[60] bg-black/20" onClick={() => setShowDeptPopover(false)} />
                        <div className="fixed z-[70] top-1/2 left-[140px] -translate-y-1/2 bg-bg-primary border border-border-subtle rounded-xl shadow-2xl p-3 min-w-[220px] max-w-[280px]">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider px-2 mb-2">
                                Todos los departamentos ({departamentos.length})
                            </p>
                            <div className="space-y-1">
                                {departamentos.map((dep, i) => (
                                    <div key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-bg-secondary transition-colors">
                                        <Building2 className="w-4 h-4 text-[#1976D2] flex-shrink-0" />
                                        <span className="text-text-primary font-medium text-sm truncate">{dep?.nombre || dep}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
        </>
    );
}
