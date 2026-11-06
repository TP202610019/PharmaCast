import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ChevronDown, CheckCircle, Upload, FileSpreadsheet, Check, ArrowRight, ArrowUpRight, Clock3, CircleCheck, Calendar, Package, BarChart3, Download, History, SlidersHorizontal, ChartNoAxesCombined } from "lucide-react";
import "../../styles/product-story.css";

// Values from the repository's demonstration record, not production benchmarks.

const stages = ['Carga de datos', 'Preprocesamiento', 'Ingeniería de variables', 'Entrenamiento del modelo', 'Proyecciones de demanda', 'Plan de compras'];
const products = [
  { name: 'Amoxicilina 500 mg', buy: 300, priority: 'Crítico' },
  { name: 'Ibuprofeno 400 mg', buy: 380, priority: 'Crítico' },
  { name: 'Paracetamol 500 mg', buy: 240, priority: 'Alto' },
  { name: 'Loratadina 10 mg', buy: 90, priority: 'Bajo' },
];

export function ProductStory() {
  const [stage, setStage] = useState(0);
  const [processSeconds, setProcessSeconds] = useState(0);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const durations = [1500, 1800, 2000, 2500, 7000, 3000, 1800];
    const cycle = durations.reduce((sum, duration) => sum + duration, 0);
    let started = performance.now();
    let timer: number | undefined;
    const tick = () => {
      const elapsed = (performance.now() - started) % cycle;
      let remaining = elapsed;
      let current = 0;
      while (current < durations.length - 1 && remaining >= durations[current]) {
        remaining -= durations[current++];
      }
      setStage(current);
      setProcessSeconds(Math.floor(elapsed / 1000));
    };
    const sync = () => {
      window.clearInterval(timer);
      if (preference.matches) {
        setStage(3);
        setProcessSeconds(0);
      } else {
        started = performance.now();
        tick();
        timer = window.setInterval(tick, 250);
      }
    };
    sync();
    preference.addEventListener("change", sync);
    return () => {
      window.clearInterval(timer);
      preference.removeEventListener("change", sync);
    };
  }, []);
  return <>
    <div className="ps-input-band">
    <section className="ph-section ps-upload" id="datos"><div className="ps-explanation"><span className="ph-eyebrow">01 / CARGA Y CONFIGURACIÓN</span><h2>Empieza con el Excel<br/>que ya usas.</h2><p>Sube tu historial de ventas y relaciona sus columnas con los campos del sistema. Si también cargas tu inventario, podrás incorporar el stock a la planificación.</p><ul><li><Check/>Ventas en CSV, XLS o XLSX.</li><li><Check/>Inventario opcional.</li><li><Check/>Mapeo de columnas antes de ejecutar.</li></ul><a href="#proceso">Ver el recorrido completo <ArrowRight size={16}/></a></div><div className="ps-upload-visual"><h3 className="ps-preview-heading">Archivo cargado</h3><div className="ps-file ps-uploaded-preview">
      <span className="ps-uploaded-icon"><CheckCircle size={20} aria-hidden="true"/></span>
      <div className="ps-uploaded-details"><strong>Datos de ventas <sup>*</sup></strong><span>ventas_farmacia.xlsx</span></div><small className="ps-uploaded-meta">2.1 MB · Subido</small>
    </div><h3 className="ps-preview-heading ps-required-heading">Variables requeridas</h3><ul className="ps-field-preview">{[['fecha_venta','Fecha de venta'],['nombre_producto','Producto / SKU'],['cant_vendida','Cantidad vendida']].map(([column, label]) => <li key={column}><span>{label} <sup>*</sup></span><span className="ps-field-value">{column}<ChevronDown size={14} aria-hidden="true"/></span></li>)}</ul><h3 className="ps-preview-heading ps-required-heading ps-optional-heading">Variables opcionales</h3><ul className="ps-field-preview">{[["Categoría", "categoria"], ["Precio unitario", "precio_unit"]].map(([label, column]) => <li key={column}><span>{label}</span><span className="ps-field-value">{column}<ChevronDown size={14} aria-hidden="true"/></span></li>)}</ul><div className="ps-upload-bottom"><Upload size={14}/> Relaciona tus columnas y continúa con el análisis.</div></div></section>
    <section className="ps-processing-band" id="procesamiento"><div className="ph-section ps-processing"><div className="ps-pipeline"><div className="ps-panel-label">Procesamiento del análisis</div><div className="ps-pipeline-progress ps-indeterminate"><span /></div><div className="ps-progress-meta"><span>540 registros · 30 días a predecir</span><span>Tiempo de proceso: 00:{String(processSeconds).padStart(2, "0")}</span></div><div className="ps-pipeline-list">{stages.map((label,i)=><div key={label} className={i<stage?'is-done':i===stage?'is-current':''}><span>{i<stage?<CheckCircle size={14}/>:i===stage?<i className="ps-stage-spinner" aria-hidden="true"/>:String(i+1).padStart(2,'0')}</span><strong>{label}</strong>{i===stage && <small>En curso</small>}</div>)}</div><div className="ps-pipeline-bottom"><Clock3 size={15}/><span>El tiempo de análisis depende del volumen y la calidad de los datos.</span></div></div><div className="ps-explanation"><span className="ph-eyebrow">02 / PROCESAMIENTO</span><h2>Sigue el análisis,<br/>paso a paso.</h2><p>La pantalla de procesamiento muestra el recorrido desde la carga hasta las recomendaciones de compra. Sabes en qué etapa se encuentra tu análisis.</p><div className="ps-processing-detail"><b>6 etapas</b><span>Desde los archivos de entrada<br/>hasta el plan de reabastecimiento.</span></div></div></div></section>
    </div>
    <div className="ps-results-band">
    <section className="ph-section ps-validation" id="precision"><div className="ps-explanation"><span className="ph-eyebrow">03 / PRECISIÓN DEL PRONÓSTICO</span><h2>Planifica con una visión<br/>más clara de la demanda.</h2><p>Consulta la precisión estimada de tu análisis junto con los productos y el período evaluado. Así puedes revisar el pronóstico antes de preparar tu próxima compra.</p><p>Cada farmacia tiene un comportamiento distinto. La precisión varía según el historial de ventas y el período que quieras proyectar.</p><Link to="/registro">Crear mi cuenta <ArrowUpRight size={17}/></Link></div><div className="ps-scorecard ps-summary-preview">
      <div className="ps-summary-heading"><h3>Análisis completado</h3><p>Tus resultados están listos.</p></div>
      <div className="ps-summary-metrics">
        {[{ label: "Precisión", value: "84%", icon: BarChart3 },
          { label: "Productos analizados", value: "48", icon: Package },
          { label: "Horizonte", value: "30 días", icon: Calendar }].map(({ label, value, icon: Icon }) =>
          <div key={label}><span><Icon size={17} aria-hidden="true" />{label}</span><strong>{value}</strong></div>
        )}
      </div>
    </div></section>
    <section className="ph-section ps-purchase" id="compras"><div className="ps-purchase-header"><div><span className="ph-eyebrow">04 / RESULTADOS Y COMPRAS</span><h2>Qué se va a vender.<br/><span>Qué necesitas reponer.</span></h2></div><p>Revisa la demanda, contrástala con tu stock y consulta<br/>las cantidades sugeridas antes de preparar tu pedido.</p></div><div className="ps-results-bento"><div className="ps-plan">
      <div className="ps-plan-top">
        <div><b>Plan de compras recomendado</b><span>Basado en la predicción para los próximos 30 días</span></div>
      </div>
      <div className="ps-table-scroll"><table>
        <caption className="sr-only">Ejemplo de recomendaciones del plan de compras</caption>
        <thead><tr><th>Producto</th><th>Cant. total prevista</th><th>Cant. diaria</th><th>Prioridad</th></tr></thead>
        <tbody>{products.map(product => <tr key={product.name}>
          <td><b>{product.name}</b></td>
          <td><strong>{product.buy} uds.</strong></td>
          <td>{Math.round(product.buy / 30)} uds./día</td>
          <td><span className={`ps-priority ps-priority-${{ "Crítico": "critical", Alto: "high", Medio: "medium", Bajo: "low" }[product.priority]}`}>{product.priority}</span></td>
        </tr>)}</tbody>
      </table></div>
    </div>
    <div className="ps-tools-grid"><article><span className="ps-tool-icon"><History/></span><h3>Vuelve a cada análisis</h3><p>Consulta el historial, abre una ejecución anterior y revisa su demanda y su plan de compras.</p><div className="ps-history-preview">
      <div className="ps-history-details"><small>Análisis 657E9A76</small><strong><Calendar size={13} aria-hidden="true"/> 6 de noviembre de 2026</strong></div>
      <span className="ps-history-status"><CircleCheck size={12}/> Completado</span>
    </div></article><article className="ps-export-card"><span className="ps-tool-icon"><Download/></span><h3>Lleva el resultado a tu equipo</h3><p>Exporta el análisis en CSV o PDF para revisar las recomendaciones fuera de la plataforma.</p><div className="ps-export-mini"><span><Download size={14}/> Exportar CSV</span><span><Download size={14}/> Exportar PDF</span></div></article><article><span className="ps-tool-icon"><SlidersHorizontal/></span><h3>Evalúa con lo que sí se vendió</h3><p>Carga las ventas reales para contrastarlas con el plan de PharmaCast y, si lo tienes, el plan de tu farmacia.</p><div className="ps-compare-mini"><div><span>Plan de PharmaCast</span><i/></div><div><span>Ventas reales</span><i/></div></div></article></div></div></section>

    </div>
  </>;
}
