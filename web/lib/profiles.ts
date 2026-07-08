// Freelancer profiles — DEMO storage in the browser's localStorage.
//
// NOTE: this is intentionally demo-scoped. Profiles live only in the browser
// that created them; they do NOT sync across devices/browsers. This is enough
// to demo the "freelancer creates a profile -> hirer browses & hires" flow
// while we're still testing. A production version would move this to an
// on-chain registry or a shared backend.

export interface Profile {
  address: string; // Stacks address (the key)
  name: string;
  title: string; // e.g. "Frontend developer"
  skills: string[];
  rate?: string; // free text, e.g. "0.5 USDCx / milestone"
  bio?: string;
  createdAt: number;
}

const KEY = "custos.profiles";

function read(): Record<string, Profile> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function write(all: Record<string, Profile>) {
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function saveProfile(p: Omit<Profile, "createdAt"> & { createdAt?: number }) {
  const all = read();
  all[p.address] = {
    ...p,
    createdAt: all[p.address]?.createdAt ?? p.createdAt ?? Date.now(),
  };
  write(all);
}

export function getProfile(address: string): Profile | null {
  return read()[address] ?? null;
}

export function listProfiles(): Profile[] {
  return Object.values(read()).sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteProfile(address: string) {
  const all = read();
  delete all[address];
  write(all);
}

// --- Cross-browser sharing -------------------------------------------------
// Because storage is per-browser, a freelancer can export their profile as a
// short base64 code and the client can import it. This makes the two-wallet
// test work across different browsers/incognito without a backend.

export function exportProfile(address: string): string | null {
  const p = getProfile(address);
  if (!p) return null;
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
  } catch {
    return null;
  }
}

export function importProfile(code: string): Profile | null {
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(code.trim())))) as Profile;
    if (!p.address || !/^ST[0-9A-Z]{38,40}$/.test(p.address)) return null;
    saveProfile(p);
    return p;
  } catch {
    return null;
  }
}

// Seed a couple of sample profiles the first time, so the directory isn't
// empty on a fresh browser. Only runs if there are zero profiles.
export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (Object.keys(read()).length > 0) return;
  const samples: Profile[] = [
    {
      address: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      name: "Ava Stone",
      title: "Product designer",
      skills: ["UI/UX", "Figma", "Design systems"],
      rate: "0.5 USDCx / milestone",
      bio: "Sample profile. I design clean, trustworthy product interfaces.",
      createdAt: Date.now() - 200000,
    },
    {
      address: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP",
      name: "Milo Reyes",
      title: "Smart-contract developer",
      skills: ["Clarity", "Stacks", "Testing"],
      rate: "1 USDCx / milestone",
      bio: "Sample profile. Clarity contracts with full test coverage.",
      createdAt: Date.now() - 100000,
    },
  ];
  const all: Record<string, Profile> = {};
  for (const s of samples) all[s.address] = s;
  write(all);
}
