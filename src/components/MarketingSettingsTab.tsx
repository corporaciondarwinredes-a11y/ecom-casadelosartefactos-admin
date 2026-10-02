'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Megaphone,
  PhoneCall,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Power,
  Clock,
  ExternalLink,
  MessageCircle,
  Layers,
  Image as ImageIcon,
  UploadCloud,
  RefreshCw,
  X,
  AlertTriangle,
} from 'lucide-react';
import { getSafeImageUrl } from '@/lib/imageUtils';

interface Props {
  initialBanners?: any[];
  initialBanner?: any;
  initialAnnouncement: any;
  initialSupportChannels: any[];
  initialCategoryBanners?: any[];
  onFeedback: (msg: string) => void;
}

const DEFAULT_CATEGORIES = [
  {
    category: 'TELEVISORES',
    name: 'Televisores',
    subtitle: 'Neo QLED, OLED 4K y Cine en Casa',
    tag: 'Hasta 30% DCTO',
    imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    category: 'AUDIO',
    name: 'Audio',
    subtitle: 'Barras de Sonido Dolby Atmos y Equipos',
    tag: 'Sonido Envolvente',
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    category: 'LAVADORAS',
    name: 'Lavadoras / Secadoras',
    subtitle: 'Lavasecas Inteligentes y Carga Frontal',
    tag: 'Hasta 28% DCTO',
    imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    category: 'REFRIGERADORAS',
    name: 'Refrigeradoras',
    subtitle: 'Side by Side, No Frost y Multi-Door Inverter',
    tag: 'Hasta 25% DCTO',
    imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    category: 'CONGELADORAS',
    name: 'Congeladoras',
    subtitle: 'Horizontales y Verticales de Gran Capacidad',
    tag: 'Frío Extremo',
    imageUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    category: 'COCINAS_HORNOS',
    name: 'Cocinas / Hornos',
    subtitle: 'Cocinas Pro de pie, Empotrables y Hornos',
    tag: 'Hasta 35% DCTO',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    category: 'CLIMATIZACION',
    name: 'Climatización',
    subtitle: 'Aire Acondicionado Split Inverter y Purificadores',
    tag: 'Eficiencia A+++',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
];

export default function MarketingSettingsTab({
  initialBanners = [],
  initialBanner,
  initialAnnouncement,
  initialSupportChannels = [],
  initialCategoryBanners = [],
  onFeedback,
}: Props) {
  // Estado Banners del Carrusel
  const [banners, setBanners] = useState<any[]>(
    initialBanners && initialBanners.length > 0
      ? initialBanners
      : initialBanner
      ? [initialBanner]
      : []
  );

  const [showAddBanner, setShowAddBanner] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [newBanner, setNewBanner] = useState({
    title: '',
    subtitle: '',
    badgeText: 'CAMPAÑA OFICIAL',
    imageUrl: '',
    ctaText: 'Ver Promoción',
    ctaLink: '#catalogo',
    isActive: true,
  });

  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Estado Banners Cuadrados de Categorías
  const [categoryBanners, setCategoryBanners] = useState<any[]>(() => {
    const map = new Map((initialCategoryBanners || []).map((b: any) => [b.category, b]));
    return DEFAULT_CATEGORIES.map((def) => {
      const existing = map.get(def.category);
      return existing ? { ...def, ...existing } : def;
    });
  });
  const [uploadingCategoryImg, setUploadingCategoryImg] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);

  // Estado del Modal de Confirmación para Campañas
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const requestConfirmation = (config: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: config.title,
      description: config.description,
      confirmText: config.confirmText || 'Confirmar y Guardar',
      cancelText: config.cancelText || 'Cancelar',
      isDestructive: config.isDestructive || false,
      onConfirm: config.onConfirm,
    });
  };

  const executeConfirmAction = async () => {
    setConfirmLoading(true);
    try {
      await confirmModal.onConfirm();
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      console.error('Error executing confirmed action:', err);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleUploadCategoryImg = async (category: string, file: File) => {
    if (!file) return;
    setUploadingCategoryImg(category);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'banners');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setCategoryBanners((prev) =>
          prev.map((c) => (c.category === category ? { ...c, imageUrl: data.url } : c))
        );
        onFeedback(`¡Imagen de categoría guardada exitosamente! Recuerda hacer clic en "Guardar Banner".`);
      } else {
        alert(`Error al guardar imagen de categoría: ${data.error || 'Error'}`);
      }
    } catch (err: any) {
      console.error('Error uploading category image:', err);
      alert('Error de conexión al guardar imagen en disco local.');
    } finally {
      setUploadingCategoryImg(null);
    }
  };

  const handleSaveCategoryBanner = async (item: any) => {
    requestConfirmation({
      title: `¿Confirmar cambios en banner de ${item.name}?`,
      description: `Se actualizará la imagen, texto y estilo de la categoría "${item.name}" en la portada de la tienda.`,
      confirmText: 'Guardar Banner',
      onConfirm: async () => {
        setSavingCategory(item.category);
        try {
          const res = await fetch('/api/settings/category-banners', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: item.id,
              category: item.category,
              name: item.name,
              subtitle: item.subtitle,
              tag: item.tag,
              imageUrl: item.imageUrl,
              isActive: item.isActive,
            }),
          });

          const data = await res.json();
          if (res.ok) {
            setCategoryBanners((prev) =>
              prev.map((c) => (c.category === item.category ? { ...c, ...data } : c))
            );
            onFeedback(`¡Banner de categoría "${item.name}" guardado exitosamente!`);
          } else {
            alert(`Error al guardar banner: ${data.error || 'No se pudo guardar'}`);
          }
        } catch (err: any) {
          console.error('Error saving category banner:', err);
          alert('Error de conexión al actualizar categoría.');
        } finally {
          setSavingCategory(null);
        }
      },
    });
  };

  // Subir imagen del banner directamente a disco local C: con previsualización instantánea
  const handleUploadBannerImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Previsualización dinámica inmediata
    const instantPreview = URL.createObjectURL(file);
    setBannerPreview(instantPreview);
    setUploadingBannerImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'banners');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setNewBanner((prev) => ({ ...prev, imageUrl: data.url }));
        onFeedback('¡Imagen de banner guardada exitosamente en C:\\ecom-artefactos-uploads\\banners\\!');
      } else {
        alert(`Error al guardar imagen de banner: ${data.error || 'No se pudo guardar'}`);
        setBannerPreview(null);
      }
    } catch (err: any) {
      console.error('Error uploading banner image:', err);
      alert('Error de conexión al guardar la imagen en disco local.');
      setBannerPreview(null);
    } finally {
      setUploadingBannerImage(false);
    }
  };

  // Estado Encabezado
  const [announcement, setAnnouncement] = useState({
    message: initialAnnouncement?.message || '',
    highlightText: initialAnnouncement?.highlightText || '',
    linkText: initialAnnouncement?.linkText || '',
    linkUrl: initialAnnouncement?.linkUrl || '',
    badgeText: initialAnnouncement?.badgeText || '',
    isActive: initialAnnouncement?.isActive !== undefined ? initialAnnouncement.isActive : true,
  });

  // Estado Canales de Atención
  const [channels, setChannels] = useState<any[]>(initialSupportChannels);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: '',
    phone: '',
    formattedPhone: '',
    roleTitle: '',
    schedule: 'Lunes a Sábado: 8:00 AM - 8:00 PM',
    startHour: 8,
    endHour: 20,
    autoSchedule: true,
    isActive: true,
  });

  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingChannel, setSavingChannel] = useState(false);

  // Determinar si un canal está en horario ahora
  const isChannelOnline = (channel: any) => {
    if (!channel.isActive) return false;
    if (!channel.autoSchedule) return true;

    const currentHour = new Date().getHours();
    return currentHour >= channel.startHour && currentHour < channel.endHour;
  };

  // Crear nuevo slide de banner
  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanner.title) {
      alert('Por favor ingresa el título principal de la campaña.');
      return;
    }
    if (!newBanner.imageUrl) {
      alert('Por favor sube una imagen para el banner desde tu PC.');
      return;
    }

    requestConfirmation({
      title: '¿Publicar nuevo banner de campaña?',
      description: `Se agregará el slide "${newBanner.title}" al carrusel principal de la portada.`,
      confirmText: 'Publicar Banner',
      onConfirm: async () => {
        setSavingBanner(true);
        try {
          const res = await fetch('/api/settings/banner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newBanner),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setBanners([data.banner, ...banners]);
          setShowAddBanner(false);
          setBannerPreview(null);
          setNewBanner({
            title: '',
            subtitle: '',
            badgeText: 'CAMPAÑA OFICIAL',
            imageUrl: '',
            ctaText: 'Ver Promoción',
            ctaLink: '#catalogo',
            isActive: true,
          });
          onFeedback('¡Nuevo slide añadido al carrusel de banners!');
        } catch (err: any) {
          alert(`Error al crear banner: ${err.message}`);
        } finally {
          setSavingBanner(false);
        }
      },
    });
  };

  // Activar / Desactivar banner
  const handleToggleBanner = async (b: any) => {
    const updatedStatus = !b.isActive;
    requestConfirmation({
      title: updatedStatus ? '¿Activar banner de campaña?' : '¿Pausar banner de campaña?',
      description: updatedStatus
        ? `El banner "${b.title}" volverá a rotar en el carrusel de la página de inicio.`
        : `El banner "${b.title}" será pausado y no se mostrará a los clientes.`,
      confirmText: updatedStatus ? 'Activar Banner' : 'Pausar Banner',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/settings/banner', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: b.id, isActive: updatedStatus }),
          });
          if (!res.ok) throw new Error('Error al actualizar');

          setBanners(
            banners.map((item) => (item.id === b.id ? { ...item, isActive: updatedStatus } : item))
          );
          onFeedback(updatedStatus ? 'Banner activado en el carrusel' : 'Banner pausado del carrusel');
        } catch (err: any) {
          alert(`Error al cambiar estado: ${err.message}`);
        }
      },
    });
  };

  // Eliminar slide de banner
  const handleDeleteBanner = async (id: string, title: string) => {
    requestConfirmation({
      title: '¿Eliminar banner de campaña?',
      description: `¿Estás seguro de eliminar el banner "${title}" del carrusel? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar Banner',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/settings/banner?id=${id}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Error al eliminar');

          setBanners(banners.filter((b) => b.id !== id));
          onFeedback('Banner eliminado del carrusel.');
        } catch (err: any) {
          alert(`Error al eliminar: ${err.message}`);
        }
      },
    });
  };

  // Guardar Anuncio Superior
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    requestConfirmation({
      title: '¿Confirmar actualización del Encabezado de Anuncios?',
      description:
        'El mensaje superior, texto destacado y enlaces promocionales se actualizarán en vivo para todos los visitantes.',
      confirmText: 'Guardar Anuncio',
      onConfirm: async () => {
        setSavingAnnouncement(true);
        try {
          const res = await fetch('/api/settings/announcement', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(announcement),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setAnnouncement(data.announcement);
          onFeedback('¡Encabezado de anuncios actualizado correctamente!');
        } catch (err: any) {
          alert(`Error al guardar anuncio: ${err.message}`);
        } finally {
          setSavingAnnouncement(false);
        }
      },
    });
  };

  // Guardar Nuevo Canal
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannel.name || !newChannel.phone) {
      alert('Completa el nombre y número');
      return;
    }

    requestConfirmation({
      title: '¿Registrar nueva asesora oficial?',
      description: `Se creará el canal de soporte para "${newChannel.name}" con WhatsApp +51 ${newChannel.phone}.`,
      confirmText: 'Registrar Asesora',
      onConfirm: async () => {
        setSavingChannel(true);
        try {
          const res = await fetch('/api/settings/support-channels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newChannel),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setChannels([...channels, data.channel]);
          setShowAddChannel(false);
          setNewChannel({
            name: '',
            phone: '',
            formattedPhone: '',
            roleTitle: '',
            schedule: 'Lunes a Sábado: 8:00 AM - 8:00 PM',
            startHour: 8,
            endHour: 20,
            autoSchedule: true,
            isActive: true,
          });
          onFeedback(`Línea "${data.channel.name}" creada exitosamente.`);
        } catch (err: any) {
          alert(`Error al crear canal: ${err.message}`);
        } finally {
          setSavingChannel(false);
        }
      },
    });
  };

  // Alternar Activo/Inactivo de Canal
  const handleToggleChannel = async (channel: any) => {
    const updatedStatus = !channel.isActive;
    requestConfirmation({
      title: updatedStatus ? '¿Activar asesora comercial?' : '¿Pausar asesora comercial?',
      description: updatedStatus
        ? `"${channel.name}" aparecerá disponible para atender clientes y asignar pedidos.`
        : `"${channel.name}" quedará en modo fuera de línea temporalmente.`,
      confirmText: updatedStatus ? 'Activar' : 'Pausar',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/settings/support-channels', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: channel.id, isActive: updatedStatus }),
          });
          if (!res.ok) throw new Error('Error al actualizar');

          setChannels(
            channels.map((c) => (c.id === channel.id ? { ...c, isActive: updatedStatus } : c))
          );
          onFeedback(
            `Línea ${channel.name} ${updatedStatus ? 'activada' : 'desactivada (fuera de línea)'}.`
          );
        } catch (err: any) {
          alert(`Error al cambiar estado: ${err.message}`);
        }
      },
    });
  };

  // Eliminar Canal
  const handleDeleteChannel = async (id: string, name: string) => {
    requestConfirmation({
      title: '¿Eliminar línea de atención / asesora?',
      description: `¿Estás seguro de eliminar a "${name}" de las asesoras oficiales? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar Asesora',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/settings/support-channels?id=${id}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Error al eliminar');

          setChannels(channels.filter((c) => c.id !== id));
          onFeedback(`Canal "${name}" eliminado.`);
        } catch (err: any) {
          alert(`Error al eliminar canal: ${err.message}`);
        }
      },
    });
  };

  return (
    <div className="space-y-10">
      {/* HEADER DE LA SECCIÓN */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Configuración Comercial & Campañas en Vivo
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Gestión de Carrusel de Banners, Encabezados y Horarios de Atención
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Sube o cambia imágenes de banners promocionales para el carrusel principal, edita mensajes de la barra superior y administra los números de WhatsApp con horario automático sin tocar código.
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. SECCIÓN: ENCABEZADO SUPERIOR / ANUNCIO PROMOCIONAL */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Encabezado Superior (Barra de Descuentos & Campaña)
              </h3>
              <p className="text-xs text-slate-500">
                Franja visible en la parte más alta de la tienda para promociones del día.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
            <input
              type="checkbox"
              checked={announcement.isActive}
              onChange={(e) => setAnnouncement({ ...announcement, isActive: e.target.checked })}
              className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
            />
            <span className={announcement.isActive ? 'text-emerald-700' : 'text-slate-400'}>
              {announcement.isActive ? 'Barra Activa' : 'Barra Desactivada'}
            </span>
          </label>
        </div>

        {/* Vista previa en vivo */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Vista previa del encabezado:
          </span>
          <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 rounded-xl flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2 truncate">
              {announcement.highlightText && (
                <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded tracking-wide">
                  {announcement.highlightText}
                </span>
              )}
              <span className="font-medium truncate">{announcement.message || 'Sin mensaje configurado'}</span>
            </div>
            {announcement.linkText && (
              <span className="text-emerald-400 font-bold hover:underline cursor-pointer flex-shrink-0 ml-4">
                {announcement.linkText}
              </span>
            )}
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSaveAnnouncement} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">
              Mensaje del Anuncio / Campaña *
            </label>
            <input
              type="text"
              required
              value={announcement.message}
              onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
              placeholder="Ej. ¡Día del Shopping! Descuentos de hasta 40% en refrigeración y envíos gratis"
              className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Texto Destacado (Pill)</label>
            <input
              type="text"
              value={announcement.highlightText}
              onChange={(e) => setAnnouncement({ ...announcement, highlightText: e.target.value })}
              placeholder="Ej. CAMPAÑA VIGENTE, OFERTA FLASH"
              className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Texto del Enlace</label>
            <input
              type="text"
              value={announcement.linkText}
              onChange={(e) => setAnnouncement({ ...announcement, linkText: e.target.value })}
              placeholder="Ej. Ver Ofertas →"
              className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">URL de Destino</label>
            <input
              type="text"
              value={announcement.linkUrl}
              onChange={(e) => setAnnouncement({ ...announcement, linkUrl: e.target.value })}
              placeholder="Ej. /?category=REFRIGERACION o #catalogo"
              className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="md:col-span-2 pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingAnnouncement}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{savingAnnouncement ? 'Guardando...' : 'Guardar Encabezado'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* 2. SECCIÓN: CARRUSEL DE BANNERS PROMOCIONALES */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Carrusel de Banners de la Página de Inicio
              </h3>
              <p className="text-xs text-slate-500">
                Imágenes publicitarias rotativas en la portada. Puedes tener múltiples slides activos.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddBanner(!showAddBanner)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Banner al Carrusel</span>
          </button>
        </div>

        {/* Modal / Formulario para Agregar Nuevo Banner */}
        {showAddBanner && (
          <form
            onSubmit={handleCreateBanner}
            className="bg-slate-50 p-5 rounded-2xl border border-blue-200 space-y-4 text-xs animate-in fade-in duration-200"
          >
            <div className="font-black text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Registrar Nuevo Slide de Banner
              </span>
              <button
                type="button"
                onClick={() => setShowAddBanner(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Zona de Subida y Previsualización Dinámica del Banner */}
              <div className="md:col-span-2 space-y-2 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs">
                    Imagen del Banner Publicitario *
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Guardado automático en C:\ecom-artefactos-uploads\banners
                  </span>
                </div>

                {bannerPreview || newBanner.imageUrl ? (
                  <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 group shadow-md">
                    <img
                      src={bannerPreview || getSafeImageUrl(newBanner.imageUrl)}
                      alt="Vista previa del banner"
                      className="w-full h-44 sm:h-52 object-cover object-center"
                    />
                    {uploadingBannerImage && (
                      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                        <UploadCloud className="w-8 h-8 animate-bounce text-blue-400" />
                        <span className="text-xs font-bold">Guardando imagen en disco C:...</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                        ✓ Banner Cargado
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 py-1.5 px-3 bg-white/95 hover:bg-white text-slate-800 font-bold rounded-xl text-xs shadow-md backdrop-blur-xs transition-all active:scale-95">
                        <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                        <span>Cambiar Imagen de Banner</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingBannerImage}
                          onChange={handleUploadBannerImage}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center p-8 bg-white hover:bg-blue-50/50 rounded-2xl transition-all border border-slate-200 group text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {uploadingBannerImage ? 'Guardando en disco C:...' : 'Haz clic aquí para seleccionar la imagen del banner desde tu PC'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Formatos recomendados: JPG, PNG o WEBP (alta resolución para pantallas anchas)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingBannerImage}
                      onChange={handleUploadBannerImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Título Principal de la Campaña *
                </label>
                <input
                  type="text"
                  required
                  value={newBanner.title}
                  onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                  placeholder="Ej. Línea Blanca & Refrigeración Inverter"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Badge de Campaña</label>
                <input
                  type="text"
                  value={newBanner.badgeText}
                  onChange={(e) => setNewBanner({ ...newBanner, badgeText: e.target.value })}
                  placeholder="Ej. CAMPAÑA OFICIAL, OFERTA FLASH"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Subtítulo / Bajada de Campaña
                </label>
                <input
                  type="text"
                  value={newBanner.subtitle}
                  onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                  placeholder="Ej. Refrigeradoras French Door y Centros de Lavado con entrega inmediata"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Texto del Botón</label>
                <input
                  type="text"
                  value={newBanner.ctaText}
                  onChange={(e) => setNewBanner({ ...newBanner, ctaText: e.target.value })}
                  placeholder="Ej. Ver Ofertas, Comprar Ahora"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Enlace de Destino</label>
                <input
                  type="text"
                  value={newBanner.ctaLink}
                  onChange={(e) => setNewBanner({ ...newBanner, ctaLink: e.target.value })}
                  placeholder="Ej. /?category=REFRIGERACION o #catalogo"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddBanner(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingBanner}
                className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700"
              >
                {savingBanner ? 'Guardando...' : 'Añadir al Carrusel'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de Banners Actuales en el Carrusel */}
        <div className="space-y-4">
          {banners.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No hay banners registrados en el carrusel. Agrega uno con el botón superior.
            </p>
          ) : (
            banners.map((b) => (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  b.isActive
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail de la imagen */}
                  <div className="w-24 h-16 sm:w-32 sm:h-20 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 relative border border-slate-200">
                    <img
                      src={getSafeImageUrl(b.imageUrl)}
                      alt={b.title}
                      className="w-full h-full object-cover object-center"
                      onError={(e: any) => {
                        e.target.src =
                          'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400';
                      }}
                    />
                  </div>

                  {/* Datos del Slide */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {b.badgeText && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {b.badgeText}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {b.isActive ? 'Activo en Tienda' : 'Pausado'}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900">{b.title}</h4>
                    {b.subtitle && (
                      <p className="text-xs text-slate-500 line-clamp-1">{b.subtitle}</p>
                    )}

                    <div className="pt-1 flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>Destino: {b.ctaLink || '#catalogo'}</span>
                    </div>
                  </div>
                </div>

                {/* Acciones del Slide */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handleToggleBanner(b)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                      b.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{b.isActive ? 'Activo' : 'Pausado'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteBanner(b.id, b.title)}
                    className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors"
                    title="Eliminar slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SECCIÓN: NÚMEROS DE ATENCIÓN, WHATSAPP & HORARIOS */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Líneas de Atención & Canales WhatsApp con Horarios
              </h3>
              <p className="text-xs text-slate-500">
                Agrega, retira o apaga números de atención técnica y activa horarios automáticos.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddChannel(!showAddChannel)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Línea Telefónica</span>
          </button>
        </div>

        {/* Modal / Formulario para agregar nuevo canal */}
        {showAddChannel && (
          <form
            onSubmit={handleCreateChannel}
            className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs animate-in fade-in duration-200"
          >
            <div className="font-black text-slate-900 flex items-center justify-between">
              <span>Registrar Nueva Línea de Atención</span>
              <button
                type="button"
                onClick={() => setShowAddChannel(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Área / Asesor *</label>
                <input
                  type="text"
                  required
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  placeholder="Ej. Asesoría en Medidas"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de WhatsApp (9 dígitos) *</label>
                <input
                  type="text"
                  required
                  value={newChannel.phone}
                  onChange={(e) => setNewChannel({ ...newChannel, phone: e.target.value })}
                  placeholder="989438130"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rol / Especialidad</label>
                <input
                  type="text"
                  value={newChannel.roleTitle}
                  onChange={(e) => setNewChannel({ ...newChannel, roleTitle: e.target.value })}
                  placeholder="Ej. Cubicaje y subida de escaleras"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Horario Descriptivo</label>
                <input
                  type="text"
                  value={newChannel.schedule}
                  onChange={(e) => setNewChannel({ ...newChannel, schedule: e.target.value })}
                  placeholder="Lun-Sáb: 8:00 AM - 8:00 PM"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora Inicio (Formato 24h)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={newChannel.startHour}
                  onChange={(e) => setNewChannel({ ...newChannel, startHour: parseInt(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora Fin (Formato 24h)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={newChannel.endHour}
                  onChange={(e) => setNewChannel({ ...newChannel, endHour: parseInt(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="autoSched"
                  checked={newChannel.autoSchedule}
                  onChange={(e) => setNewChannel({ ...newChannel, autoSchedule: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="autoSched" className="font-bold text-slate-700 cursor-pointer">
                  Activar estado por horario automático
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddChannel(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingChannel}
                className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-sm hover:bg-emerald-700"
              >
                {savingChannel ? 'Guardando...' : 'Crear Canal'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de Canales Actuales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 col-span-2 text-center">
              No hay canales de soporte registrados. Crea uno con el botón superior.
            </p>
          ) : (
            channels.map((ch) => {
              const online = isChannelOnline(ch);
              return (
                <div
                  key={ch.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    ch.isActive
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-slate-900">{ch.name}</strong>
                        {online ? (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            En Línea
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Fuera de Horario
                          </span>
                        )}
                      </div>

                      {ch.roleTitle && (
                        <p className="text-[11px] text-slate-500">{ch.roleTitle}</p>
                      )}

                      <div className="pt-2 flex items-center gap-2 text-xs font-mono font-bold text-emerald-700">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{ch.formattedPhone || ch.phone}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{ch.schedule} ({ch.startHour}:00 - {ch.endHour}:00)</span>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => handleToggleChannel(ch)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 ${
                          ch.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                        }`}
                        title="Activar / Desactivar canal"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{ch.isActive ? 'Activo' : 'Pausado'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteChannel(ch.id, ch.name)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Eliminar línea"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN 4: BANNERS CUADRADOS DE CATEGORÍAS (PORTADA) */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Banners Cuadrados de Categorías en la Portada
              </h3>
              <p className="text-xs text-slate-500">
                Personaliza la imagen, título comercial, subtítulo y etiqueta promocional de cada categoría mostrada al cliente.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryBanners.map((cat) => (
            <div
              key={cat.category}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-2xs hover:border-blue-300 transition-all"
            >
              {/* Encabezado de la Categoría */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 uppercase">
                  {cat.category}
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={cat.isActive}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCategoryBanners((prev) =>
                        prev.map((c) => (c.category === cat.category ? { ...c, isActive: checked } : c))
                      );
                    }}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>{cat.isActive ? 'Activo' : 'Oculto'}</span>
                </label>
              </div>

              {/* Vista Previa de la Imagen Cuadrada */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 group">
                <img
                  src={getSafeImageUrl(cat.imageUrl)}
                  alt={cat.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-4 flex flex-col justify-end text-white">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                    {cat.tag}
                  </span>
                  <h4 className="text-sm font-black text-white leading-tight">
                    {cat.name}
                  </h4>
                  <p className="text-[10px] text-slate-300 line-clamp-1">
                    {cat.subtitle}
                  </p>
                </div>
              </div>

              {/* Controles para cambiar la Imagen */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Cambiar Imagen del Banner:
                </label>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-300 hover:border-blue-500 rounded-xl cursor-pointer text-xs font-semibold text-slate-700 hover:text-blue-600 shadow-2xs transition-all">
                    <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {uploadingCategoryImg === cat.category ? 'Subiendo...' : 'Subir Imagen Local'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCategoryImg === cat.category}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadCategoryImg(cat.category, file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    O pegar URL directa de imagen:
                  </label>
                  <input
                    type="url"
                    value={cat.imageUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategoryBanners((prev) =>
                        prev.map((c) => (c.category === cat.category ? { ...c, imageUrl: val } : c))
                      );
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 text-[11px] font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Formulario de Textos */}
              <div className="space-y-2 pt-1 border-t border-slate-200/80">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Título Comercial:
                  </label>
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategoryBanners((prev) =>
                        prev.map((c) => (c.category === cat.category ? { ...c, name: val } : c))
                      );
                    }}
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Subtítulo / Modelos:
                  </label>
                  <input
                    type="text"
                    value={cat.subtitle || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategoryBanners((prev) =>
                        prev.map((c) => (c.category === cat.category ? { ...c, subtitle: val } : c))
                      );
                    }}
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Etiqueta / Badge Promocional:
                  </label>
                  <input
                    type="text"
                    value={cat.tag || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategoryBanners((prev) =>
                        prev.map((c) => (c.category === cat.category ? { ...c, tag: val } : c))
                      );
                    }}
                    placeholder="Ej. Hasta 30% DCTO"
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Botón Guardar */}
              <button
                type="button"
                onClick={() => handleSaveCategoryBanner(cat)}
                disabled={savingCategory === cat.category}
                className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                {savingCategory === cat.category ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando en BD...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Banner {cat.name}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL DE CONFIRMACIÓN DE CAMBIOS EN CAMPAÑAS */}
      {/* ======================================================== */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  confirmModal.isDestructive
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {confirmModal.isDestructive ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Sparkles className="w-6 h-6" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-left">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {confirmModal.description}
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Esta modificación afectará la experiencia de los clientes en tiempo real.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={confirmLoading}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {confirmModal.cancelText || 'Cancelar'}
              </button>

              <button
                type="button"
                onClick={executeConfirmAction}
                disabled={confirmLoading}
                className={`py-2.5 px-5 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer ${
                  confirmModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Aplicando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{confirmModal.confirmText || 'Confirmar y Guardar'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
