import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo } from "@/components/Logo";
import type { Profile } from "@/lib/types";

export function Header({ profile }: { profile: Profile | null }) {
  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <Logo />
        <span className="hidden text-sm font-medium text-gray-400 sm:inline">
          Tracciamento Cassoni
        </span>
      </Link>
      <div className="flex items-center gap-4">
        {profile && (
          <span className="hidden text-sm text-gray-500 sm:inline">
            {profile.nome} ·{" "}
            <span className="font-medium text-brand-green-dark">{profile.ruolo}</span>
          </span>
        )}
        <LogoutButton />
      </div>
    </header>
  );
}
