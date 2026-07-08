"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Address } from "@/components/Address";
import { useWallet } from "@/hooks/useWallet";
import { listProfiles, seedIfEmpty, importProfile, type Profile } from "@/lib/profiles";

// Hirer-facing directory: browse freelancer profiles and hire one directly
// (prefilling the hire form with their address).
export default function Directory() {
  const router = useRouter();
  const { address } = useWallet();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [importCode, setImportCode] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);

  useEffect(() => {
    seedIfEmpty();
    setProfiles(listProfiles());
  }, []);

  const doImport = () => {
    const p = importProfile(importCode);
    if (p) {
      setProfiles(listProfiles());
      setImportCode("");
      setImportMsg(`Imported ${p.name}. You can hire them below.`);
    } else {
      setImportMsg("That code isn't valid. Paste the full share code.");
    }
    setTimeout(() => setImportMsg(null), 3000);
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Header />

      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-faint">Directory</div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg">
          Find a freelancer
        </h1>
        <p className="mt-1 text-muted">
          Browse freelancers and hire directly — their address is filled in for you.
        </p>
      </div>

      {/* Import a shared profile (for two-browser testing) */}
      <div className="custos-card mb-8 p-4">
        <div className="mb-2 text-xs font-medium text-fg">Have a freelancer&apos;s share code?</div>
        <div className="flex gap-2">
          <input
            className="custos-input tabular text-xs"
            placeholder="Paste a profile share code…"
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
          />
          <button className="custos-btn custos-btn--secondary shrink-0" disabled={!importCode.trim()} onClick={doImport}>
            Import
          </button>
        </div>
        {importMsg && <p className="mt-2 text-xs text-accent">{importMsg}</p>}
      </div>

      {profiles.length === 0 ? (
        <div className="custos-card p-10 text-center text-muted">
          No freelancer profiles yet.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {profiles.map((p) => {
            const isYou = p.address === address;
            return (
              <div key={p.address} className="custos-card flex flex-col p-5">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="font-serif text-lg font-semibold text-fg">{p.name}</div>
                    <div className="text-sm text-muted">{p.title}</div>
                  </div>
                  {p.rate && (
                    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                      {p.rate}
                    </span>
                  )}
                </div>

                {p.bio && <p className="mb-3 text-sm text-muted">{p.bio}</p>}

                {p.skills.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {p.skills.map((s) => (
                      <span key={s} className="rounded-full border border-line bg-overlay px-2 py-0.5 text-xs text-fg">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                  <Address address={p.address} viewer={address} showCopy={false} size="sm" />
                  <button
                    className="custos-btn custos-btn--primary h-9 px-4 text-sm"
                    disabled={isYou}
                    title={isYou ? "You can't hire yourself" : undefined}
                    onClick={() =>
                      router.push(
                        `/hire?to=${encodeURIComponent(p.address)}&role=${encodeURIComponent(p.title)}`
                      )
                    }
                  >
                    {isYou ? "This is you" : "Hire"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
