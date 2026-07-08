import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Custos — real escrow for freelance retainers",
  description:
    "Custos holds a freelancer's retainer in true on-chain escrow, released on delivery, approval, dispute resolution, or auto-release. Built on Stacks.",
  icons: { icon: "/shield.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
