import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title: 'AI Jira Project Management Monitoring System',
  description: 'Production-ready AI PM monitoring system actively tracking Jira Cloud projects, issues, and Git traceability.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen">
        <Sidebar />
        <div className="ml-64 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 pt-20 p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
