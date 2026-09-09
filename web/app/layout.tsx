import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Custos — real escrow for freelance retainers on BOT Chain",
  description:
    "Custos holds a freelancer's retainer in true on-chain escrow, released on delivery, approval, dispute resolution, or auto-release. Built on BOT Chain.",
  icons: { icon: "/shield.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <BackgroundFX />
        {children}
      </body>
    </html>
  );
}

function BackgroundFX() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-void via-abyss to-void" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
      </div>
    </div>
  );
}
