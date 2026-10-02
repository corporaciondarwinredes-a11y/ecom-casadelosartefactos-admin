'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Credenciales incorrectas o usuario no autorizado.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError('Error de conexión con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setEmail(u);
    setPassword(p);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 inline-block mx-auto mb-2">
            <img
              src="/logo-darwin.png"
              alt="Corporación Darwin"
              className="h-16 w-auto object-contain mx-auto"
            />
          </div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block">
            Corporación Darwin S.A.C.
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Suite Administrativa Central
          </h1>
          <p className="text-xs text-slate-500">
            Acceso seguro para gestión de inventario, auditoría de Kardex y validación de pagos.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@corporaciondarwin.com"
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contraseña Encriptada
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-slate-900/20 active:scale-98"
            >
              {loading ? 'Verificando con PostgreSQL...' : 'Ingresar al Panel de Control'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center space-y-2">
            <p className="text-[11px] text-slate-400 font-medium">Credenciales preconfiguradas por Perfil RBAC:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('superadmin@corporaciondarwin.com', 'DarwinAdmin9438130!')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-600 rounded-lg text-[11px] font-mono border border-slate-200 text-center transition-colors"
              >
                👑 Superadmin (Total)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('almacen@corporaciondarwin.com', 'Artefactos2026!')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg text-[11px] font-mono border border-slate-200 text-center transition-colors"
              >
                📦 Almacén & Kardex
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('tesoreria@corporaciondarwin.com', 'Finanzas2026!')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-lg text-[11px] font-mono border border-slate-200 text-center transition-colors"
              >
                💰 Tesorería & Pagos
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('sandy@lacasadelosartefactos.pe', 'Darwin2026!')}
                className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-mono border border-blue-200 text-center transition-colors font-bold"
              >
                👩‍💼 Asesora SANDY
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('antonia@lacasadelosartefactos.pe', 'Darwin2026!')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg text-[11px] font-mono border border-slate-200 text-center transition-colors"
              >
                👩‍💼 Asesora Antonia
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('milagros@lacasadelosartefactos.pe', 'Darwin2026!')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg text-[11px] font-mono border border-slate-200 text-center transition-colors"
              >
                👩‍💼 Asesora Milagros
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('fabricio@lacasadelosartefactos.pe', 'Darwin2026!')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg text-[11px] font-mono border border-slate-200 text-center transition-colors"
              >
                👨‍💼 Asesor Fabricio
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('ventas@corporaciondarwin.com', 'Ventas2026!')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg text-[11px] font-mono border border-slate-200 text-center transition-colors"
              >
                💼 Mostrador General
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <a
            href="http://localhost:3000"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la tienda de artefactos (Puerto 3000)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
