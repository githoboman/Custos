"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";
import { WalletButton } from "./WalletButton";

const NAV = [
  { href: "/app/client", label: "I'm hiring" },
  { href: "/directory", label: "Find freelancers" },
  { href: "/app/freelancer", label: "My work" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="mb-10 flex items-center justify-between border-b border-line pb-4">
      <div className="flex items-center gap-8">
        <Link href="/" className="no-underline">
          <Brand />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-1.5 text-sm no-underline transition-colors ${
                  active
                    ? "bg-overlay font-medium text-fg"
                    : "text-muted hover:text-fg"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <WalletButton />
    </header>
  );
}
