import { Logo } from "@/components/Logo";

export function SchermataCard({
  children,
  maxWidth = "max-w-sm",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-green-light/60 to-gray-50 px-4 py-8">
      <div className="mx-auto mb-6 flex justify-center print:hidden">
        <Logo className="h-9" />
      </div>
      <div className={`mx-auto ${maxWidth}`}>{children}</div>
    </div>
  );
}
