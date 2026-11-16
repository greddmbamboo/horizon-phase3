import type { Metadata } from 'next';
import '@fontsource-variable/montserrat';
import '@fontsource-variable/source-serif-4';
import './globals.css';


export const metadata: Metadata = { title: 'Hofund · Operator App', description: 'Hofund Horizon operator app' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
