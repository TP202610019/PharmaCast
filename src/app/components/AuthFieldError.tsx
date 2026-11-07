export function AuthFieldError({ message }: { message?: string }) {
  return message ? (
    <div role="alert" className="mt-1 text-left text-xs leading-4 text-red-600">
      {message}
    </div>
  ) : null;
}
