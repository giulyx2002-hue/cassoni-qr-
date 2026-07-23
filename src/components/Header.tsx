import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import type { Profile } from "@/lib/types";

export function Header({ profile }: { profile: Profile | null }) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <Link href="/" className="font-semibold text-gray-900">
        Tracciamento Cassoni
      </Link>
      <div className="flex items-center gap-3">
        {profile && (
          <span className="text-sm text-gray-500">
            {profile.nome} · {profile.ruolo}
          </span>
        )}
        <LogoutButton />
      </div>
    </header>
  );
}
