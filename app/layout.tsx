import type { Metadata } from 'next';
import { Oswald, JetBrains_Mono, Inter } from 'next/font/google';
import './globals.css';

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Promo Music Station',
  description: 'Studio di produzione musicale AI-assistita — testi, concept e audio in un unico posto.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${oswald.variable} ${jetbrainsMono.variable} ${inter.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
