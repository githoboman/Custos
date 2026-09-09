"use client";

import { useEffect, useState } from "react";
import { getProfile, saveProfile, exportProfile } from "@/lib/profiles";

export function ProfileForm({
  address,
  onSaved,
}: {
  address: string;
  onSaved?: () => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [rate, setRate] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = getProfile(address);
    if (p) {
      setName(p.name);
      setTitle(p.title);
      setSkills(p.skills.join(", "));
      setRate(p.rate ?? "");
      setBio(p.bio ?? "");
    }
  }, [address]);

  const submit = () => {
    saveProfile({
      address,
      name: name.trim() || "Unnamed",
      title: title.trim(),
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      rate: rate.trim() || undefined,
      bio: bio.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaved?.();
  };

  return (
    <div className="custos-card p-6">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold text-fg">Your freelancer profile</h3>
        <p className="mt-1 text-sm text-muted">
          Fill this in so clients can find and hire you from the directory.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name">
          <input className="custos-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ava Stone" />
        </Field>
        <Field label="Title">
          <input className="custos-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Product designer" />
        </Field>
      </div>
      <Field label="Skills (comma separated)">
        <input className="custos-input" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="UI/UX, Figma, Design systems" />
      </Field>
      <Field label="Rate (optional)">
        <input className="custos-input" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 0.5 USDC / milestone" />
      </Field>
      <Field label="Short bio (optional)">
        <textarea
          className="custos-input h-20 resize-none py-2"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A sentence about what you do."
        />
      </Field>

      <div className="mt-2 flex items-center gap-3">
        <button className="custos-btn custos-btn--primary" onClick={submit}>
          {saved ? "Saved ✓" : "Save profile"}
        </button>
        <span className="text-xs text-faint">
          Demo: saved in this browser only.
        </span>
      </div>

      {getProfile(address) && <ShareCode address={address} />}
    </div>
  );
}

function ShareCode({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const code = exportProfile(address);
  if (!code) return null;
  return (
    <div className="mt-5 rounded border border-line bg-abyss p-4">
      <div className="mb-1 text-xs font-medium text-fg">Share your profile</div>
      <p className="mb-2 text-xs text-muted">
        Testing across two browsers? Copy this code and paste it into the client's
        "Find freelancers" page so they can hire you.
      </p>
      <div className="flex gap-2">
        <input readOnly value={code} className="custos-input tabular text-xs" onFocus={(e) => e.target.select()} />
        <button
          className="custos-btn custos-btn--secondary shrink-0"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs text-muted">{label}</label>
      {children}
    </div>
  );
}
