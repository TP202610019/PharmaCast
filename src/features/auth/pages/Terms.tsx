import { Link } from "react-router";
import { Activity, ArrowLeft, Shield, FileText, Database, Lock, AlertCircle, RefreshCw } from "lucide-react";

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
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 group-hover:bg-cyan-500/20 transition-colors">
              <Activity className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-gray-900 tracking-tight" style={{ fontSize: "0.875rem", fontWeight: 700 }}>
                PharmaCast
              </span>
              <span className="text-gray-400" style={{ fontSize: "0.55rem", letterSpacing: "0.1em" }}>
                PREDICTION SYSTEM
              </span>
            </div>
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors"
            style={{ fontSize: "0.875rem" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al registro
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 mb-4">
            <FileText className="h-3.5 w-3.5 text-cyan-600" />
            <span className="text-cyan-600" style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
              Documento legal
            </span>
          </div>
          <h1 className="text-gray-900 mb-3" style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2 }}>
            Términos y Condiciones
          </h1>
          <p className="text-gray-500" style={{ fontSize: "0.9375rem", lineHeight: 1.7 }}>
            Última actualización: 7 de mayo de 2026
          </p>
          <p className="text-gray-500 mt-2" style={{ fontSize: "0.9375rem", lineHeight: 1.7 }}>
            Por favor, lea detenidamente estos términos antes de utilizar la plataforma PharmaCast. El uso del servicio implica la aceptación de las condiciones descritas a continuación.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 mt-0.5">
                    <Icon className="h-4 w-4 text-cyan-500" />
                  </div>
                  <div>
                    <h2 className="text-gray-900 mb-3" style={{ fontSize: "1rem", fontWeight: 600 }}>
                      {section.title}
                    </h2>
                    <p className="text-gray-600" style={{ fontSize: "0.9rem", lineHeight: 1.75 }}>
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact */}
        <div className="mt-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
          <h3 className="text-cyan-700 mb-2" style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
            ¿Tienes preguntas sobre estos términos?
          </h3>
          <p className="text-gray-600" style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
            Si tienes alguna duda sobre estos Términos y Condiciones o sobre el uso de la plataforma, puedes contactarnos en{" "}
            <span className="text-cyan-600 font-medium">legal@pharmacast.io</span>. Nos comprometemos a responder en un plazo de 48 horas hábiles.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-8 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
            © 2026 PharmaCast · Todos los derechos reservados
          </p>
          <div className="flex gap-4">
            <Link to="/login" className="text-cyan-500 hover:text-cyan-600 transition-colors" style={{ fontSize: "0.8125rem" }}>
              Iniciar sesión
            </Link>
            <Link to="/register" className="text-cyan-500 hover:text-cyan-600 transition-colors" style={{ fontSize: "0.8125rem" }}>
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
