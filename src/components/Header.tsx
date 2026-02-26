import { Link } from '@tanstack/react-router'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/tanstack-react-start'

import { useState, useEffect } from 'react'
import { Home, Menu, X, Truck, User, ShoppingBag, ListChecks, Flame, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b",
          isScrolled 
            ? "bg-slate-950/80 backdrop-blur-md border-slate-800/50 shadow-lg" 
            : "bg-transparent border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors md:hidden"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all">
                <Flame className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold font-heading text-white tracking-tight hidden sm:block">Refillr</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/merchants" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Find Dealers
            </Link>
            <Link to="/merchant-setup" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              For Merchants
            </Link>
            <Link to="/rider-setup" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              For Riders
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <SignedIn>
              <div className="hidden md:block">
                <Link to="/order/new">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 shadow-lg shadow-orange-500/20">
                    Order Now
                  </Button>
                </Link>
              </div>
              <div className="hover-scale">
                <UserButton 
                  afterSignOutUrl="/" 
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 border-2 border-slate-800 hover:border-orange-500 transition-colors"
                    }
                  }}
                />
              </div>
            </SignedIn>
            <SignedOut>
              <div className="hidden sm:flex items-center gap-3">
                <SignInButton forceRedirectUrl="/" fallbackRedirectUrl="/">
                  <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800/50">
                    Log in
                  </Button>
                </SignInButton>
                <SignUpButton forceRedirectUrl="/" fallbackRedirectUrl="/">
                  <Button size="sm" className="bg-white text-slate-950 hover:bg-slate-200 rounded-full px-6 font-medium">
                    Sign up
                  </Button>
                </SignUpButton>
              </div>
              <div className="sm:hidden">
                <SignInButton forceRedirectUrl="/" fallbackRedirectUrl="/">
                  <Button size="sm" className="bg-white text-slate-950 hover:bg-slate-200 rounded-full px-4 font-medium">
                    Log in
                  </Button>
                </SignInButton>
              </div>
            </SignedOut>
          </div>
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
