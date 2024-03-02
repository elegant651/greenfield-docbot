import { ConnectButton } from '@rainbow-me/rainbowkit';

interface LayoutProps {
  children?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="mx-auto flex flex-col space-y-4">
      <header className="container sticky top-0 z-40 bg-white">
        <div className="justify-between flex h-16 border-b border-b-slate-200 py-4">
          <nav className="ml-4 pl-6">
            <a href="/" className="hover:text-slate-600 cursor-pointer">
              Home
            </a>
            <a href="/upload" className="ml-6 hover:text-slate-600 cursor-pointer">
              Upload
            </a>
          </nav>
          <ConnectButton accountStatus="address" />
        </div>
      </header>
      <div>
        <main className="flex w-full flex-1 flex-col overflow-hidden p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
