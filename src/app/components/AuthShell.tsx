import { motion, useReducedMotion } from "motion/react";
import { Navbar } from "./Navbar";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import "../../styles/chrome.css";
import "../../styles/auth.css";
export function AuthShell({ children, mode }: { children: ReactNode; mode: "login" | "register" | "recovery" }) {
 const reducedMotion = useReducedMotion();
 const register = mode === "register";
 return <div className={`auth-page auth-${mode}`}><main className="auth-main">
  <Navbar plain backLink={{to:mode==='recovery'?'/acceso':'/',label:mode==='recovery'?'Volver al login':'Volver al inicio'}} />
  <motion.section key={mode} className="auth-stage" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeOut" }}><div className="auth-context"><h2>{register?<>Anticipa la demanda<br/>de tu farmacia para<br/><span>comprar mejor</span></>:mode==='recovery'?<>Recupera el acceso<br/><span>a tu farmacia</span></>:<>Bienvenido<br/><span>de vuelta</span></>}</h2>{register?<><p>Convierte tus ventas en un pronóstico de demanda y un plan de compras.</p><AuthForecast /><div className="auth-result-stats"><div><strong>&lt; 2 min</strong><span>Tiempo de análisis</span></div><div><strong>&gt; 80 %</strong><span>Precisión del pronóstico</span></div></div></>:<p>{mode==='recovery'?'Verifica tu correo y establece una nueva contraseña.':'Retoma tus análisis y revisa tus próximos planes de compra.'}</p>}</div><div className="auth-form-wrap">{children}</div></motion.section>
  <footer className="auth-bottom"><span>© 2026 PharmaCast</span><Link to={`/terminos?from=${register?'register':'login'}`}>Términos y condiciones <ArrowUpRight size={11}/></Link></footer>
 </main></div>;
}


function AuthForecast(){return <div className="auth-register-chart"><div><span>Proyección de demanda</span><span>Por producto</span></div><svg viewBox="0 0 360 110" role="img" aria-label="Gráfico de demanda histórica y proyección"><defs><clipPath id="auth-forecast-clip"><rect className="auth-forecast-reveal" width="360" height="110"/></clipPath></defs><path d="M0 25H360M0 65H360M0 105H360" stroke="#ffffff12"/><line x1="228" y1="5" x2="228" y2="105" stroke="#a7b4c980" strokeWidth="1" strokeDasharray="4 4"/><g clipPath="url(#auth-forecast-clip)"><path d="M4 93L36 78L68 84L100 56L132 64L164 39L196 47L228 27" fill="none" stroke="#68afff" strokeWidth="3" strokeLinejoin="round"/><path d="M228 27L260 35L292 17L324 23L356 7" fill="none" stroke="#68afff" strokeWidth="3" strokeDasharray="5 5"/></g></svg><div className="auth-register-chart-key"><span>Historial de ventas</span><span>Demanda estimada</span></div></div>;}

