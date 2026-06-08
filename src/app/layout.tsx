import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DictionaryPopup } from "../features/texthooker";
import { NetflixWrapper } from "../components/NetflixWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JapanOS - Language Immersion Hub",
  description: "A premium Japanese language learning workspace featuring Netflix-style navigation, reader, video player, and texthooker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-black text-white" suppressHydrationWarning>
        <NetflixWrapper>
          {children}
        </NetflixWrapper>
        <DictionaryPopup />
      </body>
    </html>
  );
}
