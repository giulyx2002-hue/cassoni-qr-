import Image from "next/image";

export function Logo({ className = "h-9" }: { className?: string }) {
  return (
    <Image
      src="/logo-morgans.png"
      alt="Morgan's — economia circolare"
      width={600}
      height={150}
      priority
      className={`w-auto ${className}`}
    />
  );
}
