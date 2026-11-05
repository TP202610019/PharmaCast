import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PharmaCastLogo } from "../components/PharmaCastLogo";
import "../../styles/terms.css";
import { Link, useSearchParams } from "react-router";
import { Activity, ArrowLeft, ArrowRight, Shield, FileText, Database, Lock, AlertCircle, RefreshCw } from "lucide-react";

const sections = [
  {
    icon: FileText,
    title: "1. Aceptación de los términos",
    content:
      "Al acceder y utilizar PharmaCast, usted acepta quedar vinculado por estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio. El uso continuo de la plataforma implica la aceptación de cualquier modificación futura a estos términos.",
  },
  {
    icon: Shield,
    title: "2. Descripción del servicio",
    content:
      "PharmaCast es una plataforma de análisis predictivo de demanda para farmacias. El sistema procesa datos históricos de ventas e inventario para generar proyecciones de demanda y recomendaciones de compra. Los resultados son de carácter orientativo y no constituyen asesoramiento financiero o comercial vinculante.",
  },
  {
    icon: Database,
    title: "3. Uso de datos",
    content:
      "Los datos que usted cargue en la plataforma (archivos de ventas e inventario) son procesados exclusivamente para generar predicciones dentro de su cuenta. PharmaCast no comparte sus datos operativos con terceros. Los datos son almacenados de forma segura y pueden ser eliminados a solicitud del usuario en cualquier momento.",
  },
  {
    icon: Lock,
    title: "4. Privacidad y seguridad",
    content:
      "Implementamos medidas de seguridad técnicas y organizativas para proteger su información. Las credenciales de acceso son de responsabilidad exclusiva del usuario. PharmaCast no solicita ni almacena datos personales de pacientes ni información de salud protegida (PHI). Usted es responsable de mantener la confidencialidad de su cuenta.",
  },
  {
    icon: AlertCircle,
    title: "5. Limitación de responsabilidad",
    content:
      "Las predicciones generadas por PharmaCast son estimaciones basadas en modelos estadísticos y datos históricos. No garantizamos la exactitud absoluta de los resultados. PharmaCast no será responsable por decisiones comerciales tomadas en base a las proyecciones del sistema, pérdidas de inventario, ni por errores derivados de datos incorrectos proporcionados por el usuario.",
  },
  {
    icon: RefreshCw,
    title: "6. Modificaciones del servicio",
    content:
      "PharmaCast se reserva el derecho de modificar, suspender o discontinuar cualquier parte del servicio en cualquier momento, con o sin previo aviso. También podemos actualizar estos Términos y Condiciones periódicamente. Los cambios entrarán en vigor inmediatamente después de su publicación en la plataforma. Se notificará a los usuarios registrados por correo electrónico sobre cambios significativos.",
  },
  {
    icon: Shield,
    title: "7. Propiedad intelectual",
    content:
      "Todo el contenido, algoritmos, diseños, modelos de predicción y tecnología de PharmaCast son propiedad exclusiva de sus desarrolladores y están protegidos por las leyes de propiedad intelectual aplicables. Queda prohibida la reproducción, distribución o ingeniería inversa del sistema sin autorización expresa por escrito.",
  },
  {
    icon: FileText,
    title: "8. Ley aplicable",
    content:
      "Estos términos se rigen por las leyes aplicables en la jurisdicción donde opera PharmaCast. Cualquier disputa relacionada con el uso del servicio será sometida a la jurisdicción de los tribunales competentes. Si alguna disposición de estos términos resulta inválida, el resto de las disposiciones continuará en plena vigencia.",
  },
];

export function Terms() {
  const [params] = useSearchParams();
  const fromRegister = params.get("from") === "register";
  const fromLogin = params.get("from") === "login";
  const fromWorkspace = params.get("from") === "workspace";
  const fromAuth = fromRegister || fromLogin;
  const backPath = fromRegister ? "/registro" : fromLogin ? "/acceso" : fromWorkspace ? "/panel" : "/";
  const backLabel = fromRegister ? "Volver al registro" : fromLogin ? "Volver al login" : fromWorkspace ? "Volver a Mi panel" : "Volver al inicio";
  return <div className={`terms-page ${fromAuth ? "terms-from-auth" : ""}`}>
    <Navbar backLink={fromAuth || fromWorkspace ? { to: backPath, label: backLabel } : undefined} />
    <main className="terms-container">
      <div className="terms-intro">{!fromAuth && !fromWorkspace && <Link className="terms-page-return" to={backPath}><ArrowLeft size={15}/>{backLabel}</Link>}<h1>Términos y<br/><span>condiciones.</span></h1><div className="terms-meta"><FileText size={14}/><span>Última actualización: 7 de mayo de 2026</span><span>8 apartados</span></div><p>Conoce las condiciones de uso de PharmaCast, el tratamiento de tu información y el alcance de las recomendaciones de la plataforma.</p></div>
      <div className="terms-layout"><aside className="terms-index"><span>EN ESTE DOCUMENTO</span><nav aria-label="Índice de términos">{sections.map((section,i)=><a key={section.title} href={`#term-${i+1}`}><small>{String(i+1).padStart(2,"0")}</small>{section.title.replace(/^\d+\. /,"")}</a>)}</nav></aside>
      <article className="terms-document">{sections.map((section,i)=><section id={`term-${i+1}`} key={section.title}><span className="terms-number">{String(i+1).padStart(2,"0")}</span><div><h2>{section.title.replace(/^\d+\. /,"")}</h2><p>{section.content}</p></div></section>)}
      <div className="terms-contact"><h2>¿Tienes preguntas?</h2><p>Si tienes alguna duda sobre estas condiciones, escribe a <a href="mailto:legal@pharmacast.io">legal@pharmacast.io</a>.</p></div>
      <div className="terms-document-end"><span>Fin del documento</span></div>
      </article></div>
      
    </main>
    {fromAuth ? <div className="terms-auth-bottom">© 2026 PharmaCast</div> : <Footer workspace={fromWorkspace} />}
  </div>;
}
