import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { TestClockProvider } from "@/context/TestClockContext";

export const metadata: Metadata = {
  title: "RFID Access Control System",
  description: "IoT-Based RFID Access Control and Monitoring System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <TestClockProvider>{children}</TestClockProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
