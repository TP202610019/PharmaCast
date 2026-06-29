import { Upload, Settings, BarChart3, TrendingUp, ShoppingCart, Activity } from "lucide-react";

export const STEPS = [
  { id: 1, label: "Carga de datos",   icon: Upload },
  { id: 2, label: "Configuración",    icon: Settings },
  { id: 3, label: "Análisis",         icon: BarChart3 },
  { id: 4, label: "Resultados",       icon: TrendingUp },
  { id: 5, label: "Plan de compras",  icon: ShoppingCart },
];

export const priorityConfig = {
  critical: { label: "Crítico", color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/30",    dot: "bg-red-500" },
  high:     { label: "Alto",    color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  medium:   { label: "Medio",   color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  low:      { label: "Bajo",    color: "text-cyan-500",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   dot: "bg-cyan-500" },
};

export const PIPELINE_STEPS = [
  { label: "Carga de datos",           description: "Leyendo archivos de ventas e inventario",             icon: Upload },
  { label: "Preprocesamiento",         description: "Limpiando valores atípicos y normalizando registros", icon: Settings },
  { label: "Ingeniería de variables",  description: "Extrayendo estacionalidad y tendencias",             icon: BarChart3 },
  { label: "Entrenamiento del modelo", description: "XGBoost (modelo de predicción de demanda)",          icon: Activity },
  { label: "Proyecciones de demanda",  description: "Calculando demanda futura por producto",             icon: TrendingUp },
  { label: "Plan de compras",          description: "Calculando recomendaciones de reabastecimiento",     icon: ShoppingCart },
];

export const PAGE_SIZE_TABLE = 10;
export const PAGE_SIZE_PLAN  = 10;

export const FALLBACK_SALES_COLS = ["fecha_venta","nombre_producto","cant_vendida","precio_unit","categoria","tipo_prod","unidad_med","metodo_pago","pct_descuento"];
export const FALLBACK_INV_COLS   = ["nombre_med","stock_actual","fecha_venc","stock_min","stock_seguridad","num_lote","costo_unit","estado_prod"];
