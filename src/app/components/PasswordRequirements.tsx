import { CheckCircle2 } from "lucide-react";

export const passwordRequirements = [
  { label: "Al menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Una letra mayúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Un número", test: (p: string) => /[0-9]/.test(p) },
];

export function PasswordRequirements({ password }: { password: string }) {
  const passwordStrength = passwordRequirements.filter((r) => r.test(password)).length;
  const strengthLabel = ["Débil", "Regular", "Fuerte"][passwordStrength - 1] ?? "";
  const strengthColor =
    passwordStrength === 3
      ? "bg-blue-500"
      : passwordStrength === 2
      ? "bg-yellow-400"
      : passwordStrength === 1
      ? "bg-red-400"
      : "bg-gray-200";
  return (
    <div className="space-y-2">
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
          style={{ width: `${(passwordStrength / 3) * 100}%` }}
        />
      </div>
      {strengthLabel && (
        <span
          className={`${
            passwordStrength === 3 ? "text-blue-500" : passwordStrength === 2 ? "text-yellow-500" : "text-red-400"
          }`}
          style={{ fontSize: "0.75rem", fontWeight: 500 }}
        >
          {strengthLabel}
        </span>
      )}
    </div>
    <div className="space-y-1">
      {passwordRequirements.map((req) => {
        const met = req.test(password);
        return (
          <div key={req.label} className="flex items-center gap-1.5">
            <CheckCircle2 className={`h-3 w-3 transition-colors ${met ? "text-blue-500" : "text-gray-300"}`} />
            <span
              className={`transition-colors ${met ? "text-gray-600" : "text-gray-400"}`}
              style={{ fontSize: "0.75rem" }}
            >
              {req.label}
            </span>
          </div>
        );
      })}
    </div>
    </div>
  );
}
