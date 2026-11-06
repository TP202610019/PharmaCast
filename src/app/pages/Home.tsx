import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowUpRight, ArrowRight, ChartNoAxesCombined, ShoppingBag, History, Plus, ChevronDown, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../../styles/home.css";
import { ProductStory } from "../components/ProductStory";

const demandPreviews = [
  { name: "Amoxicilina 500 mg", days: 30, priority: "critical", history: "M0 119 L32 103 L64 110 L96 87 L128 96 L160 72 L192 82 L224 63 L256 92 L288 74 L320 82", forecast: "M320 82 L352 65 L384 73 L416 48 L448 58 L480 42" },
  { name: "Ibuprofeno 400 mg", days: 60, priority: "critical", history: "M0 100 L32 81 L64 98 L96 91 L128 65 L160 78 L192 51 L224 67 L256 60 L288 93 L320 82", forecast: "M320 82 L352 91 L384 70 L416 55 L448 72 L480 63" },
  { name: "Paracetamol 500 mg", days: 90, priority: "high", history: "M0 128 L32 115 L64 124 L96 104 L128 112 L160 84 L192 96 L224 77 L256 90 L288 61 L320 82", forecast: "M320 82 L352 69 L384 76 L416 52 L448 64 L480 55" },
  { name: "Omeprazol 20 mg", days: 30, priority: "medium", history: "M0 112 L64 95 L128 104 L192 74 L256 88 L320 82", forecast: "M320 82 L352 75 L384 84 L416 62 L448 70 L480 60" },
];

export function Home() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [previewIndex, setPreviewIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const preview = demandPreviews[2];
  const heroPreview = demandPreviews[previewIndex];
  const historyWidth = 480 * 60 / (60 + heroPreview.days);
  const forecastScale = (480 - historyWidth) / 160;
  const forecastTransform = `translate(${historyWidth - 320 * forecastScale} 0) scale(${forecastScale} 1)`;
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let interval: number | undefined;
    const sync = () => {
      window.clearInterval(interval);
      if (!preference.matches) {
        interval = window.setInterval(() => setPreviewIndex(index => (index + 1) % demandPreviews.length), 6000);
      }
    };
    sync();
    preference.addEventListener("change", sync);
    return () => {
      window.clearInterval(interval);
      preference.removeEventListener("change", sync);
    };
  }, []);
  const homeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('ph-in-view'); observer.unobserve(entry.target); } });
    }, { threshold: 0.12 });
    const elements = homeRef.current?.querySelectorAll('.ph-bento article, .ps-upload-visual, .ps-pipeline, .ps-plan, .ps-tools-grid article, .ps-scorecard, .ph-story-intro, .ph-faq');
    elements?.forEach(element => { element.classList.add('ph-reveal'); observer.observe(element); });
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (isLoggedIn) navigate("/panel", { replace: true }); }, [isLoggedIn, navigate]);
  return (
    <div className="ph-home" ref={homeRef}>
      <div className="ph-hero-band"><section id="inicio" className="ph-hero" aria-labelledby="hero-title">
        <div className="ph-copy">
          
          <h1 id="hero-title">Anticipa la demanda de tu farmacia <span>para comprar mejor</span></h1>
          <p>Convierte tu historial de ventas en pronósticos de demanda y un plan de compras para tu farmacia.</p>
          <div className="ph-actions">
            <Link to="/registro" className="ph-primary">Comenzar <ArrowUpRight size={19} /></Link>
            <a href="#proceso" className="ph-secondary">Conocer el proceso <ArrowRight size={17} /></a>
          </div>
          
        </div>
        <div className="ph-visual">
          <div className="ph-photo">
            <img src="/hero-inventario.png" alt="Trabajadora revisando existencias en un almacén de medicamentos" />
            <div className="ph-photo-shade" />
            
            
          </div>
          <div className="ph-orbit" aria-hidden="true"><ArrowUpRight size={30} /></div>
          <div className="ph-forecast">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={heroPreview.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .28 }}>
                <div className="ph-forecast-head"><span className={`ph-chart-icon ps-priority-${heroPreview.priority}`} aria-hidden="true"><i className="ph-forecast-dot"/></span><div><strong>{heroPreview.name.toUpperCase()}</strong><span>Pronóstico a {heroPreview.days} días</span></div></div>
                <svg className="ph-hero-chart" viewBox="-8 0 496 160" preserveAspectRatio="none" role="img" aria-label={`Histórico y pronóstico a ${heroPreview.days} días de ${heroPreview.name}`}>
                  <path d="M0 40H480 M0 90H480 M0 140H480" stroke="#edf0ed" fill="none"/>
                  <path d={`M${historyWidth} 12V140`} stroke="#ccd8d2" strokeDasharray="4 5"/>
                  <defs><clipPath id="hero-demand-reveal">
                    <motion.rect x="-8" y="0" height="160" initial={{ width: reducedMotion ? 496 : 0 }} animate={{ width: 496 }} transition={{ duration: reducedMotion ? 0 : 1.1, ease: "easeInOut" }}/>
                  </clipPath></defs>
                  <g clipPath="url(#hero-demand-reveal)">
                    <path d={heroPreview.forecast} transform={forecastTransform} fill="none" stroke="#007aff" strokeWidth="20" opacity=".13" strokeLinejoin="round"/>
                    <path d={heroPreview.history} transform={`scale(${historyWidth / 320} 1)`} fill="none" stroke="#007aff" strokeWidth="4" strokeLinejoin="round"/>
                    <path d={heroPreview.forecast} transform={forecastTransform} fill="none" stroke="#007aff" strokeWidth="4" strokeDasharray="7 5" strokeLinejoin="round"/>
                  </g>
                </svg>
              </motion.div>
            </AnimatePresence>
            <div className="ph-chart-key"><span><i /> Historial de ventas</span><span><i /> Pronóstico</span></div>
          </div>
          
        </div>
      </section></div>
      <div className="ph-overview-band"><section className="ph-benefits ph-section" id="producto">
        <div className="ph-centered"><span className="ph-eyebrow">EL SIGUIENTE PASO PARA TU FARMACIA</span><h2>Tu inventario tiene una historia.<br /><span>Úsala para decidir lo que viene.</span></h2><p>Las ventas cambian. Tu planificación también debería hacerlo.<br />Conecta tus datos con las decisiones de cada día.</p></div>
        <div className="ph-bento">
          <article className="ph-bento-main"><span className="ph-bento-icon"><ChartNoAxesCombined size={25}/></span><h3>Que la demanda<br />no te tome por sorpresa.</h3><p>Reconoce cómo se mueve cada producto y explora su demanda proyectada para preparar tu siguiente compra.</p><figure className="ph-demand-preview">
            <strong className="ph-demand-medication">{preview.name}</strong><figcaption><span>Histórico</span><span>Pronóstico</span></figcaption>
            <svg viewBox="0 0 480 160" preserveAspectRatio="none" role="img" aria-label={`Demanda histórica y pronóstico de ${preview.name}`}>
              <path d="M0 40H480 M0 90H480 M0 140H480" stroke="#d7e0ec" strokeDasharray="4 6"/>
              <path d="M320 12V140" stroke="#8998ad" strokeDasharray="4 5"/>
              <path d={preview.forecast} fill="none" stroke="#007aff" strokeWidth="24" strokeLinejoin="round" opacity=".13"/>
              <path d={preview.history} fill="none" stroke="#007aff" strokeWidth="3" strokeLinejoin="round"/>
              <path d={preview.forecast} fill="none" stroke="#007aff" strokeWidth="3" strokeDasharray="7 5" strokeLinejoin="round"/>
            </svg>
          </figure></article>
          <article className="ph-bento-card"><ShoppingBag size={25}/><h3>Cada compra,<br />con una prioridad.</h3><p>Revisa cantidades sugeridas y niveles de urgencia para organizar la reposición.</p><div className="ph-priority"><span>Prioridades de compra</span><div className="ph-priority-chips">{[["critical","Crítico"],["high","Alto"],["medium","Medio"],["low","Bajo"]].map(([level,label]) => <span key={level} className={`ps-priority ps-priority-${level}`}>{label}</span>)}</div></div></article>
          <article className="ph-bento-card ph-bento-dark"><History size={25}/><h3>La información,<br />en un mismo lugar.</h3><p>Consulta tus análisis anteriores y da seguimiento a tus decisiones.</p><a href="#proceso">Explorar el proceso <ArrowUpRight size={17}/></a></article>
        </div>
      </section>
      <section className="ph-story-intro ph-section" id="recorrido"><span className="ph-eyebrow">CÓMO FUNCIONA PHARMACAST</span><h2>Un recorrido completo.<br /><span>De tus ventas a tu próxima compra.</span></h2><p>Carga tus archivos, sigue el análisis y revisa el plan de reposición.<br />Estas son las pantallas que te acompañan en cada etapa.</p></section>
      </div>
      <div id="proceso" className="ph-story-flow"><ProductStory /></div>
      <div className="ph-questions-band"><section className="ph-faq ph-section" id="preguntas"><div><span className="ph-eyebrow">ANTES DE COMENZAR</span><h2>Preguntas frecuentes.</h2><p>Lo que necesitas saber para dar<br />el primer paso con PharmaCast.</p></div><div className="ph-faq-list">{[
        ['¿Qué necesito para comenzar?','Un archivo CSV o Excel con el historial de ventas. El inventario es opcional. El flujo de carga te permite revisar y relacionar las columnas antes del análisis.'],
        ['¿Qué obtengo después del análisis?','Una proyección de demanda y un plan de compras con cantidades sugeridas y prioridades, para apoyar la planificación de reposición.'],
        ['¿La precisión es igual para todos los productos?','No. Cambia según el historial, la variación de las ventas y el horizonte de predicción. Revisa las métricas disponibles para cada análisis.'],
        ['¿PharmaCast realiza las compras por mí?','No. El sistema genera recomendaciones. Tú revisas el plan y decides qué comprar, cuánto y cuándo.'],
        ['¿Puedo consultar análisis anteriores?','Sí. Desde tu cuenta puedes acceder al historial y revisar el detalle de tus análisis anteriores.']
      ].map(([q,a],i)=><details key={q} name="pharma-faq"><summary><span className="ph-faq-number">{String(i+1).padStart(2,"0")}</span><span className="ph-faq-question">{q}</span><span className="ph-faq-toggle"><ChevronDown size={17}/></span></summary><div className="ph-faq-answer"><p>{a}</p></div></details>)}</div></section>
      </div>
      <div className="ph-final-band"><section className="ph-final" id="comenzar"><span className="ph-eyebrow">TU PRÓXIMA COMPRA EMPIEZA AQUÍ</span><h2>Tus ventas ya tienen<br /><span>la información.</span></h2><p>Dales el siguiente paso. Carga tu historial y prepara un plan de compras para tu farmacia.</p><Link to="/registro" className="ph-primary">Comenzar con PharmaCast <ArrowUpRight size={19}/></Link><a href="/acceso">Ya tengo una cuenta →</a></section></div>
    </div>
  );
}
