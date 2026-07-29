import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Intro } from "@/components/Intro";

export const metadata: Metadata = {
  title: "Milescraft Drivers",
  description: "Driver clock-in & wages",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Intro />
        <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-12">
          {children}
        </div>
      </body>
    </html>
  );
}
