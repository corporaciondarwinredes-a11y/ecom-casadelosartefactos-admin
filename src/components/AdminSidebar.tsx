'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import {
  ShoppingCart,
  PlusCircle,
  Package,
  Tag,
  FileSpreadsheet,
  Users,
  Sparkles,
  Volume2,
  VolumeX,
  LogOut,
  ShieldCheck,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';

export type AdminTab = 'orders' | 'catalog' | 'brands' | 'kardex' | 'manualOrder' | 'users' | 'marketing';

interface Props {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  userRole: string;
  profile?: any;
  isSuperadmin: boolean;
  canCatalog: boolean;
  canOrders: boolean;
  canKardex: boolean;
  kpis: {
    totalSales: number;
    pendingValidationCount: number;
    totalStockUnits: number;
    lowStockAlerts: number;
    totalOrdersCount: number;
  };
  productCount: number;
  brandCount: number;
  userCount: number;
  assistedCartCount: number;
  isRealtimeConnected: boolean;
  soundEnabled: boolean;
  toggleSound: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  currentUser,
  userRole,
  profile,
  isSuperadmin,
  canCatalog,
  canOrders,
  canKardex,
  kpis,
  productCount,
  brandCount,
  userCount,
  assistedCartCount,
  isRealtimeConnected,
  soundEnabled,
  toggleSound,
}: Props) {
  const handleTabClick = (tab: AdminTab) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay oscuro para móviles */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Barra lateral fija */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:sticky ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Encabezado Corporativo del Sidebar */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-darwin.png"
              alt="Corporación Darwin"
              className="h-10 w-auto object-contain bg-white/5 p-1 rounded-xl border border-slate-700/60"
            />
            <div className="flex flex-col">
              <span className="text-xs font-black text-white tracking-tight leading-tight">
                CORPORACIÓN DARWIN
              </span>
              <span className="text-[10px] text-blue-400 font-semibold tracking-wide">
                La Casa de los Artefactos
              </span>
              <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isRealtimeConnected ? 'SSE En Vivo' : 'Reconectando...'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Módulos de Navegación Agrupados */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 text-xs">
          {/* GRUPO 1: OPERACIONES DE VENTA */}
          {canOrders && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-300">
                Operaciones Comerciales
              </span>

              {/* Órdenes */}
              <button
                type="button"
                onClick={() => handleTabClick('orders')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${
                  activeTab === 'orders'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className={`w-4 h-4 ${activeTab === 'orders' ? 'text-white' : 'text-blue-400'}`} />
                  <span>Órdenes & Validación</span>
                </div>
                {kpis.pendingValidationCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                    {kpis.pendingValidationCount}
                  </span>
                )}
              </button>

              {/* Venta Asistida POS */}
              <button
                type="button"
                onClick={() => handleTabClick('manualOrder')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${
                  activeTab === 'manualOrder'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PlusCircle className={`w-4 h-4 ${activeTab === 'manualOrder' ? 'text-white' : 'text-emerald-400'}`} />
                  <span>Venta Asistida POS</span>
                </div>
                {assistedCartCount > 0 && (
                  <span className="bg-emerald-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                    {assistedCartCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* GRUPO 2: CATÁLOGO & INVENTARIO */}
          {(canCatalog || canKardex) && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-300">
                Inventario & Catálogo
              </span>

              {/* Catálogo Maestro */}
              {canCatalog && (
                <button
                  type="button"
                  onClick={() => handleTabClick('catalog')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${
                    activeTab === 'catalog'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Package className={`w-4 h-4 ${activeTab === 'catalog' ? 'text-white' : 'text-blue-400'}`} />
                    <span>Catálogo Maestro</span>
                  </div>
                  <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    {productCount}
                  </span>
                </button>
              )}

              {/* Marcas Oficiales */}
              {canCatalog && (
                <button
                  type="button"
                  onClick={() => handleTabClick('brands')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${
                    activeTab === 'brands'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Tag className={`w-4 h-4 ${activeTab === 'brands' ? 'text-white' : 'text-amber-400'}`} />
                    <span>Marcas Oficiales</span>
                  </div>
                  <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    {brandCount}
                  </span>
                </button>
              )}

              {/* Kardex Calculado */}
              {canKardex && (
                <button
                  type="button"
                  onClick={() => handleTabClick('kardex')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${
                    activeTab === 'kardex'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'kardex' ? 'text-white' : 'text-emerald-400'}`} />
                    <span>Kardex Calculado</span>
                  </div>
                  {kpis.lowStockAlerts > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {kpis.lowStockAlerts}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* GRUPO 3: MARKETING & CANALES */}
          {(isSuperadmin || canCatalog) && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-300">
                Marketing & Front
              </span>

              <button
                type="button"
                onClick={() => handleTabClick('marketing')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${
                  activeTab === 'marketing'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className={`w-4 h-4 ${activeTab === 'marketing' ? 'text-white' : 'text-amber-400'}`} />
                  <span>Campañas & Banners</span>
                </div>
              </button>
            </div>
          )}

          {/* GRUPO 4: ADMINISTRACIÓN & SEGURIDAD */}
          {isSuperadmin && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-300">
                Sistema & Seguridad
              </span>

              <button
                type="button"
                onClick={() => handleTabClick('users')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${
                  activeTab === 'users'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={`w-4 h-4 ${activeTab === 'users' ? 'text-white' : 'text-purple-400'}`} />
                  <span>Usuarios & RBAC</span>
                </div>
                <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {userCount}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Controles de Sonido y Perfil de Usuario en el Pie del Sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/60">
          {/* Botón de Sonido en Vivo */}
          <button
            type="button"
            onClick={toggleSound}
            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              soundEnabled
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <span>Alertas de Sirena</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase">
              {soundEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Tarjeta de Operador */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md">
                {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'OP'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate leading-tight">
                  {currentUser?.name || currentUser?.email}
                </span>
                <span className="text-[9px] font-mono text-slate-400 truncate">
                  {profile?.name || userRole}
                </span>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Cerrar Sesión Segura"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
