import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowUpRight, ArrowRight, ChartNoAxesCombined, ShoppingBag, Plus, ChevronDown, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../../styles/home.css";
import { ProductStory } from "../components/ProductStory";

export function Home() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
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
      <div className="ph-hero-band"><section className="ph-hero" aria-labelledby="hero-title">
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
            <img src="https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1200&q=85" alt="Estanterías de medicamentos en una farmacia" />
            <div className="ph-photo-shade" />
            
            
          </div>
          <div className="ph-orbit" aria-hidden="true"><ArrowUpRight size={30} /></div>
          <div className="ph-forecast">
            <div className="ph-forecast-head"><span className="ph-chart-icon"><ChartNoAxesCombined size={18} /></span><div><strong>Demanda por producto</strong><span>Proyección de demanda</span></div></div>
            <svg className="ph-hero-chart" viewBox="0 0 300 86" role="img" aria-label="Ejemplo ilustrativo de demanda histórica y proyectada">
              <defs><clipPath id="forecast-reveal"><rect className="ph-chart-reveal" x="0" y="0" width="300" height="86" /></clipPath><linearGradient id="forecast-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#007AFF" stopOpacity=".2"/><stop offset="100%" stopColor="#007AFF" stopOpacity="0"/></linearGradient></defs>
              <path d="M0 23H300 M0 48H300 M0 73H300" stroke="#edf0ed" fill="none" />
              <g clipPath="url(#forecast-reveal)"><path d="M4 68L31 58L58 63L85 39L112 45L139 30L166 36L193 23L220 29L247 13L292 9V85H4Z" fill="url(#forecast-fill)" />
              <path d="M4 68L31 58L58 63L85 39L112 45L139 30L166 36" fill="none" stroke="#007AFF" strokeWidth="3" strokeLinejoin="round" />
              <path d="M166 36L193 23L220 29L247 13L292 9" fill="none" stroke="#007AFF" strokeWidth="3" strokeDasharray="5 5" />
              </g><path d="M166 6V80" stroke="#ccd8d2" strokeDasharray="3 4" />
            </svg>
            <div className="ph-chart-key"><span><i /> Historial de ventas</span><span><i /> Demanda estimada</span></div>
          </div>
          
        </div>
      </section></div>
      <div className="ph-overview-band"><section className="ph-benefits ph-section" id="producto">
        <div className="ph-centered"><span className="ph-eyebrow">EL SIGUIENTE PASO PARA TU FARMACIA</span><h2>Tu inventario tiene una historia.<br /><span>Úsala para decidir lo que viene.</span></h2><p>Las ventas cambian. Tu planificación también debería hacerlo.<br />Conecta tus datos con las decisiones de cada día.</p></div>
        <div className="ph-bento">
          <article className="ph-bento-main"><span className="ph-bento-icon"><ChartNoAxesCombined size={25}/></span><h3>Que la demanda<br />no te tome por sorpresa.</h3><p>Reconoce cómo se mueve cada producto y explora su demanda proyectada para preparar tu siguiente compra.</p><div className="ph-bars" aria-hidden="true">{[32,49,40,66,52,75,62,85,71,94,83,100].map((h,i)=><i key={i} style={{height:`${h}%`,opacity:i>7?.4:1,animationDelay:`${i*65}ms`}}/>)}</div></article>
          <article className="ph-bento-card"><ShoppingBag size={25}/><h3>Cada compra,<br />con una prioridad.</h3><p>Revisa cantidades sugeridas y niveles de urgencia para organizar la reposición.</p><div className="ph-priority"><span>Prioridad de compra</span><b>Alta</b></div></article>
          <article className="ph-bento-card ph-bento-dark"><ChartNoAxesCombined size={25}/><h3>La información,<br />en un mismo lugar.</h3><p>Consulta tus análisis anteriores y da seguimiento a tus decisiones.</p><a href="#proceso">Explorar el proceso <ArrowUpRight size={17}/></a></article>
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
