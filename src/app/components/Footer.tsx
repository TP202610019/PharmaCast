import { Link } from "react-router";
import { ArrowUpRight, ArrowUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PharmaCastLogo } from "./PharmaCastLogo";
import "../../styles/chrome.css";

export function Footer({ workspace = false }: { workspace?: boolean } = {}) {
  const { isLoggedIn } = useAuth();
  return <footer className={`pc-footer ${workspace ? "pc-workspace-footer" : ""}`}><div className="pc-footer-inner">
    <div className="pc-footer-top">
      <div className="pc-footer-about"><Link to={isLoggedIn ? "/panel" : "/"} className="pc-brand" aria-label="PharmaCast, inicio"><PharmaCastLogo /></Link><p>Predicción de demanda y planificación de compras para farmacias. Convierte tu historial de ventas en información para preparar tu próxima compra.</p></div>
      {workspace ? <>
        <nav aria-label="Tu espacio"><h2>Tu espacio</h2><Link to="/panel">Mi panel</Link><Link to="/predicciones/nueva">Nueva predicción</Link><Link to="/historial">Historial de predicciones</Link></nav>
        <nav aria-label="Legal"><h2>Legal</h2><Link to="/terminos?from=workspace">Términos y condiciones</Link></nav>
      </> : <>
      <nav aria-label="Producto"><h2>Producto</h2><a href="/#producto">Conoce PharmaCast</a><a href="/#datos">Carga de datos</a><a href="/#procesamiento">Procesamiento</a><a href="/#compras">Plan de compras</a><a href="/#precision">Precisión del análisis</a></nav>
      <nav aria-label="Tu cuenta"><h2>Tu cuenta</h2>{isLoggedIn ? <><Link to="/panel">Mi panel</Link><Link to="/predicciones/nueva">Nueva predicción</Link><Link to="/historial">Historial</Link></> : <><Link to="/registro">Crear una cuenta <ArrowUpRight size={12}/></Link><Link to="/acceso">Iniciar sesión</Link></>}</nav>
      <nav aria-label="Legal"><h2>Legal</h2><Link to="/terminos">Términos y condiciones</Link></nav>
      </>}

    </div><a className="pc-back-top" aria-label="Volver arriba" title="Volver arriba" href="#" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}}><ArrowUp size={18}/></a><div className="pc-footer-bottom"><span>© {new Date().getFullYear()} PharmaCast.</span><span>Predicción de demanda · Planificación de compras</span></div>
  </div></footer>;
}
