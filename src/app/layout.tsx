import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { ShieldCheck, Lock, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Suite Administrativa — Corporación Darwin | La Casa de los Artefactos',
  description: 'Panel de control privado para gestión de catálogo, auditoría de Kardex y validación de transferencias bancarias.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-slate-100 text-slate-900 selection:bg-blue-600 selection:text-white">
        {/* Barra superior de seguridad administrativa */}
        <header className="bg-slate-900 text-white border-b border-slate-800 py-3 px-6 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-sm shadow-md shadow-blue-500/20">
                CD
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight leading-tight">
                  CORPORACIÓN DARWIN S.A.C.
                </span>
                <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-widest flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Suite Administrativa Privada • Puerto 3001
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="hidden sm:flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                PostgreSQL Local (casa_artefactos)
              </span>
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                title="Abrir la Tienda de Clientes en el puerto 3000"
              >
                <span>Ver Tienda (3000)</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Corporación Darwin S.A.C. — Entorno de Control Interno y Auditoría de Kardex.
        </footer>
      </body>
    </html>
  );
}
