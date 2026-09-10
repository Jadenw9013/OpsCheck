import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpsCheck',
  description:
    'Trace a plan finding back to its source. Independent prototype using synthetic data.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
