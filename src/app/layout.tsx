import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import QueryProvider from '@/context/QueryProvider';
import { ToastProvider } from '@/components/ui/toast';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Prepyo — Nepal’s Premier PTE & IELTS AI Prep Platform',
  description: 'Master PTE 79+ and IELTS Band 8.0+ with realistic practice, full mock exam simulations, instant AI writing & speaking evaluations, and Nepal leaderboards.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased selection:bg-primary selection:text-white transition-colors duration-200">
        <QueryProvider>
          <ToastProvider>
            <AppProvider>
              <AppLayout>{children}</AppLayout>
            </AppProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
