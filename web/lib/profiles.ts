// Freelancer profiles — DEMO storage in the browser's localStorage.

export interface Profile {
  address: string;
  name: string;
  title: string;
  skills: string[];
  rate?: string;
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
    if (!p.address || !/^0x[a-fA-F0-9]{40}$/.test(p.address)) return null;
    saveProfile(p);
    return p;
  } catch {
    return null;
  }
}

export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (Object.keys(read()).length > 0) return;
  const samples: Profile[] = [
    {
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      name: "Ava Stone",
      title: "Product designer",
      skills: ["UI/UX", "Figma", "Design systems"],
      rate: "0.5 USDC / milestone",
      bio: "Sample profile. I design clean, trustworthy product interfaces.",
      createdAt: Date.now() - 200000,
    },
    {
      address: "0x8Ba1f109551bD4328030126458ac136c22C501a3",
      name: "Milo Reyes",
      title: "Smart-contract developer",
      skills: ["Solidity", "EVM", "Testing"],
      rate: "1 USDC / milestone",
      bio: "Sample profile. Solidity contracts with full test coverage.",
      createdAt: Date.now() - 100000,
    },
  ];
  const all: Record<string, Profile> = {};
  for (const s of samples) all[s.address] = s;
  write(all);
}
