import { Link } from '@tanstack/react-router'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/tanstack-react-start'

import { useState } from 'react'
import { Home, Menu, X, Truck, User, ShoppingBag, ListChecks, Flame, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <header className="p-4 flex items-center glass-card text-white shadow-lg sticky top-0 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors hover-scale"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="ml-4 text-xl font-bold font-heading flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <Flame className="text-orange-500" size={20} />
            <span className="text-gradient">Refillr</span>
          </Link>
        </h1>
        <div className="ml-auto flex items-center gap-4">
          <SignedIn>
            <div className="hover-scale">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal" signUpFallbackRedirectUrl="/" fallbackRedirectUrl="/">
              <button className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal" signInFallbackRedirectUrl="/" fallbackRedirectUrl="/">
              <button className="px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all glow-orange hover-scale">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-80 glass-sidebar text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <h2 className="text-xl font-bold font-heading text-gradient">Refillr Menu</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors hover-scale"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-2">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 hover-scale transition-all"
            activeProps={{
              className: 'flex items-center gap-3 p-3 rounded-xl bg-orange-500 shadow-lg shadow-orange-500/20 text-white font-semibold transform scale-[1.02]',
            }}
          >
            <Home size={20} />
            <span>Home</span>
          </Link>

          <Link
            to="/merchants"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 hover-scale transition-all"
            activeProps={{
              className: 'flex items-center gap-3 p-3 rounded-xl bg-orange-500 shadow-lg shadow-orange-500/20 text-white font-semibold transform scale-[1.02]',
            }}
          >
            <ShoppingBag size={20} />
            <span>Nearby Dealers</span>
          </Link>

          <Link
            to="/orders"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 hover-scale transition-all"
            activeProps={{
              className: 'flex items-center gap-3 p-3 rounded-xl bg-orange-500 shadow-lg shadow-orange-500/20 text-white font-semibold transform scale-[1.02]',
            }}
          >
            <ListChecks size={20} />
            <span>Order History</span>
          </Link>

          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 hover-scale transition-all"
            activeProps={{
              className: 'flex items-center gap-3 p-3 rounded-xl bg-orange-500 shadow-lg shadow-orange-500/20 text-white font-semibold transform scale-[1.02]',
            }}
          >
            <User size={20} />
            <span>My Profile</span>
          </Link>

          <div className="pt-4 mt-4 border-t border-slate-800/50">
            <Link
              to="/rider"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 hover-scale transition-all"
              activeProps={{
                className: 'flex items-center gap-3 p-3 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/20 text-white font-semibold transform scale-[1.02]',
              }}
            >
              <Truck size={20} />
              <span>Rider Workspace</span>
            </Link>

            <Link
              to="/merchant/overview"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 hover-scale transition-all"
              activeProps={{
                className: 'flex items-center gap-3 p-3 rounded-xl bg-orange-600 shadow-lg shadow-orange-500/20 text-white font-semibold transform scale-[1.02]',
              }}
            >
              <Store size={20} />
              <span>Merchant Dashboard</span>
            </Link>
          </div>
        </nav>

        <div className="p-6 border-t border-slate-800/50">
          <p className="text-xs text-slate-500 text-center">
            Refillr v1.0.0 • Verified LPG Delivery
          </p>
        </div>
      </aside>
    </>
  )
}
