'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  FileCheck,
  Zap,
  Boxes,
  HelpCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedProduct {
  name: string;
  brand: string;
  category: string;
  sku: string;
  modelCode?: string;
  retailPrice?: number;
  price: number;
  discountPrice?: number;
  stock: number;
  warrantyMonths: number;
  hasEnergyRating: number; // 1 o 0
  energyRating?: string;
  dimensions?: string;
  voltage?: string;
  specifications?: string;
  description?: string;
  image?: string;
  barcode?: string;
  isValid: boolean;
  errors: string[];
}

export default function BulkImportModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. DESCARGAR PLANTILLA EXCEL OFICIAL
  const downloadTemplate = () => {
    const templateData = [
      {
        nombre: 'Refrigeradora No Frost 400L Inverter con Dispensador',
        marca: 'SAMSUNG',
        categoria: 'REFRIGERADORAS',
        sku: 'REF-SAM-400L-01',
        codigo_modelo: 'RT38K5930SL',
        precio_regular: 3499.00,
        precio_oferta: 2899.00,
        stock_inicial: 5,
        garantia_meses: 12,
        tiene_eficiencia: 1, // 1 = SÍ TIENE
        eficiencia_energetica: 'A+', // Letra cuando tiene_eficiencia es 1
        dimensiones: '178.5cm x 70.0cm x 68.0cm',
        voltaje: '220V / 60Hz',
        especificaciones: 'Motor Digital Inverter; Sistema No Frost envolvente; Dispensador exterior',
        descripcion: 'Refrigeradora espaciosa de bajo consumo energético con 10 años de garantía en motor.',
        imagen_url: '', // Se deja vacío para subir después
        codigo_barras: '7751234567890',
      },
      {
        nombre: 'Televisor Smart TV 55" 4K UHD Google TV',
        marca: 'TCL',
        categoria: 'TELEVISORES',
        sku: 'TV-TCL-55-4K',
        codigo_modelo: '55P635',
        precio_regular: 1899.00,
        precio_oferta: 1499.00,
        stock_inicial: 8,
        garantia_meses: 24,
        tiene_eficiencia: 0, // 0 = NO TIENE EFICIENCIA (ideal para TVs)
        eficiencia_energetica: '', // Se deja vacío si tiene_eficiencia es 0
        dimensiones: '123.0cm x 71.0cm x 8.0cm',
        voltaje: '220V / 60Hz',
        especificaciones: 'Resolución 4K HDR10; Google TV con control de voz; 3 puertos HDMI 2.1',
        descripcion: 'Smart TV con marco ultradelgado y sonido envolvente Dolby Audio.',
        imagen_url: '',
        codigo_barras: '7759876543210',
      },
      {
        nombre: 'Lavadora Carga Superior 18Kg Tecnología TurboWash',
        marca: 'LG',
        categoria: 'LAVADORAS',
        sku: 'LAV-LG-18KG-02',
        codigo_modelo: 'WT18DV6',
        precio_regular: 2299.00,
        precio_oferta: 1799.00,
        stock_inicial: 4,
        garantia_meses: 12,
        tiene_eficiencia: 1,
        eficiencia_energetica: 'A',
        dimensiones: '102.0cm x 63.2cm x 67.0cm',
        voltaje: '220V / 60Hz',
        especificaciones: 'Motor Smart Inverter; Filtro atrapa pelusas inteligente; Tambor de acero inoxidable',
        descripcion: 'Lavadora de gran capacidad ideal para familias numerosas con lavado rápido.',
        imagen_url: '',
        codigo_barras: '7754567891234',
      },
      {
        nombre: 'Torre de Sonido Bluetooth 500W con Luces LED',
        marca: 'SONY',
        categoria: 'AUDIO',
        sku: 'AUD-SNY-500W-V1',
        codigo_modelo: 'MHC-V13',
        precio_regular: 1199.00,
        precio_oferta: 949.00,
        stock_inicial: 6,
        garantia_meses: 12,
        tiene_eficiencia: 0,
        eficiencia_energetica: '',
        dimensiones: '60.0cm x 33.3cm x 29.9cm',
        voltaje: '220V / 60Hz',
        especificaciones: 'Potencia 500W RMS; Entrada para micrófono y guitarra; Conectividad Bluetooth LDAC',
        descripcion: 'Sistema de audio potente para eventos y reuniones con bajos profundos Jet Bass Booster.',
        imagen_url: '',
        codigo_barras: '7753216549870',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Ajustar ancho de columnas para que se lea impecable
    worksheet['!cols'] = [
      { wch: 45 }, // nombre
      { wch: 15 }, // marca
      { wch: 18 }, // categoria
      { wch: 18 }, // sku
      { wch: 16 }, // codigo_modelo
      { wch: 15 }, // precio_regular
      { wch: 15 }, // precio_oferta
      { wch: 14 }, // stock_inicial
      { wch: 15 }, // garantia_meses
      { wch: 16 }, // tiene_eficiencia
      { wch: 20 }, // eficiencia_energetica
      { wch: 28 }, // dimensiones
      { wch: 14 }, // voltaje
      { wch: 50 }, // especificaciones
      { wch: 50 }, // descripcion
      { wch: 25 }, // imagen_url
      { wch: 18 }, // codigo_barras
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Artefactos');
    XLSX.writeFile(workbook, 'Plantilla_Carga_Masiva_Artefactos.xlsx');
  };

  // 2. PARSEAR ARCHIVO SUBIDO
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg('El archivo de Excel seleccionado no contiene filas de datos.');
          setParsedItems([]);
          return;
        }

        const parsed: ParsedProduct[] = rawJson.map((row, idx) => {
          const errors: string[] = [];

          // Obtener valores flexibles (español o inglés)
          const name = String(row.nombre || row.name || '').trim();
          const brand = String(row.marca || row.brand || '').trim().toUpperCase();
          const category = String(row.categoria || row.category || 'TELEVISORES').trim().toUpperCase();
          const sku = String(row.sku || row.codigo_sku || row.codigo || '').trim().toUpperCase();
          const modelCode = String(row.codigo_modelo || row.modelCode || row.modelo || '').trim();

          const rawPrice = row.precio_oferta ?? row.price ?? row.precio;
          const price = Number(rawPrice);

          const rawRetail = row.precio_regular ?? row.retailPrice ?? row.precio_tachado;
          const retailPrice = rawRetail ? Number(rawRetail) : price;

          const rawDiscount = row.precio_descuento ?? row.discountPrice;
          const discountPrice = rawDiscount ? Number(rawDiscount) : undefined;

          const rawStock = row.stock_inicial ?? row.stock ?? row.cantidad;
          const stock = Math.max(0, parseInt(String(rawStock), 10) || 0);

          const warrantyMonths = parseInt(String(row.garantia_meses || row.warrantyMonths || 12), 10) || 12;

          // Regla clave: Si tiene_eficiencia es 1 -> rating; si 0 -> vacio
          const rawHasEff = row.tiene_eficiencia ?? row.hasEnergyRating ?? row.activa_eficiencia;
          const hasEnergyRating =
            rawHasEff === 1 ||
            rawHasEff === '1' ||
            String(rawHasEff).toLowerCase() === 'si' ||
            String(rawHasEff).toLowerCase() === 'true'
              ? 1
              : 0;

          const rawRating = String(row.eficiencia_energetica || row.energyRating || '').trim().toUpperCase();
          const energyRating = hasEnergyRating === 1 ? (rawRating || 'A+') : '';

          const dimensions = String(row.dimensiones || row.dimensions || '').trim();
          const voltage = String(row.voltaje || row.voltage || '220V / 60Hz').trim();
          const specifications = String(row.especificaciones || row.specifications || '').trim();
          const description = String(row.descripcion || row.description || '').trim();
          const image = String(row.imagen_url || row.image || '').trim();
          const barcode = String(row.codigo_barras || row.barcode || '').trim();

          // Validaciones obligatorias
          if (!name) errors.push('Falta Nombre');
          if (!brand) errors.push('Falta Marca');
          if (!sku) errors.push('Falta SKU');
          if (isNaN(price) || price <= 0) errors.push('Precio inválido');

          return {
            name,
            brand,
            category,
            sku,
            modelCode,
            retailPrice,
            price,
            discountPrice,
            stock,
            warrantyMonths,
            hasEnergyRating,
            energyRating,
            dimensions,
            voltage,
            specifications,
            description,
            image,
            barcode,
            isValid: errors.length === 0,
            errors,
          };
        });

        setParsedItems(parsed);
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        setErrorMsg('Error al leer el archivo Excel. Asegúrate de subir un formato .xlsx o .csv válido.');
        setParsedItems([]);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  // 3. ENVIAR A PROCESAR AL BACKEND
  const handleImport = async () => {
    const validItems = parsedItems.filter((it) => it.isValid);
    if (validItems.length === 0) {
      setErrorMsg('No hay filas válidas para importar.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: validItems }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la importación masiva');
      }

      setSuccessMsg(data.message || `¡Éxito! Se importaron ${validItems.length} artefactos.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error importing products:', err);
      setErrorMsg(err.message || 'Error de conexión al importar productos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedItems.filter((i) => i.isValid).length;
  const invalidCount = parsedItems.length - validCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera del Modal */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Carga Masiva de Artefactos con Excel</h2>
              <p className="text-xs text-slate-400">
                Importa decenas o cientos de productos rápidamente sin necesidad de fotos previas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Tarjeta Informativa & Descarga de Plantilla */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                ¿Cómo funciona la regla de Eficiencia y Fotos?
              </span>
              <p className="text-xs text-blue-700 leading-relaxed max-w-xl">
                • <strong>Eficiencia Energética:</strong> Si pones <strong>1</strong> en la casilla, se activa con la letra indicada (ej. <em>A+, A, B</em>). Si pones <strong>0</strong>, se guarda desactivado (ideal para TVs y Audio).<br/>
                • <strong>Fotografías:</strong> No son obligatorias. El sistema asignará una portada provisional y podrás subir las fotos después desde el catálogo.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs border border-blue-300 hover:border-blue-600 shadow-xs transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Plantilla Excel (.xlsx)</span>
            </button>
          </div>

          {/* Zona de Subida de Archivo */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Selecciona o arrastra el archivo de Excel relleno:
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
              <div className="text-xs">
                {file ? (
                  <span className="font-bold text-slate-800">
                    Archivo seleccionado: <span className="text-blue-600 underline">{file.name}</span>
                  </span>
                ) : (
                  <>
                    <span className="font-bold text-blue-600">Haz clic para buscar</span> o arrastra tu archivo Excel (.xlsx / .csv)
                  </>
                )}
              </div>
              <span className="text-[11px] text-slate-400">Formatos soportados: .xlsx, .xls, .csv</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Mensajes de Alerta / Éxito */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Vista Previa de Filas Parseadas */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Vista Previa ({parsedItems.length} artefactos detectados):
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                    ✓ {validCount} válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-bold">
                      ⚠ {invalidCount} con errores (se omitirán)
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto shadow-2xs">
                <table className="w-full text-left text-[11px] divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Artefacto / Marca</th>
                      <th className="px-3 py-2">Categoría</th>
                      <th className="px-3 py-2">Precio Oferta</th>
                      <th className="px-3 py-2">Stock Inicial</th>
                      <th className="px-3 py-2">Eficiencia Energética</th>
                      <th className="px-3 py-2">Imagen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className={item.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {item.isValid ? (
                            <span className="text-emerald-600 font-black">✓ OK</span>
                          ) : (
                            <span className="text-rose-600 font-bold" title={item.errors.join(', ')}>
                              ⚠ Error ({item.errors.join(', ')})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {item.sku || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-900 truncate max-w-xs">{item.name || '-'}</p>
                          <span className="text-[10px] text-slate-500 font-bold">{item.brand}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{item.category}</td>
                        <td className="px-3 py-2 font-bold text-blue-700 whitespace-nowrap">
                          S/ {item.price ? item.price.toFixed(2) : '0.00'}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-800 whitespace-nowrap">
                          {item.stock} unid.
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {item.hasEnergyRating === 1 ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                              <Zap className="w-2.5 h-2.5" /> {item.energyRating || 'A+'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">⚪ Desactivado (0)</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500 text-[10px]">
                          {item.image && item.image.startsWith('http') ? (
                            <span className="text-blue-600 font-bold">📷 Con URL</span>
                          ) : (
                            <span className="text-slate-400 italic">🕒 Placeholder (subir luego)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={isProcessing || validCount === 0}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
              isProcessing || validCount === 0
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Procesando e Importando...</span>
              </>
            ) : (
              <>
                <Boxes className="w-4 h-4" />
                <span>Importar {validCount} Artefactos a Catálogo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
