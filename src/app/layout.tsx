import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Who's That Pokemon?",
  description: "Generation-based silhouette guessing game powered by PokeAPI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
