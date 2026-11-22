import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import type { ProductCategory } from '../data/products';

interface NavbarProps {
  brandName: string;
  marqueeText: string;
  cartCount: number;
  onOpenCart: () => void;
  onSelectCategory: (category: 'All' | ProductCategory) => void;
  onBuyHotWheels: () => void;
  onOpenAdmin: () => void;
}

export function Navbar({
  brandName,
  marqueeText,
  cartCount,
  onOpenCart,
  onSelectCategory,
  onBuyHotWheels,
  onOpenAdmin,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleCategoryNav = (category: 'All' | ProductCategory) => {
    onSelectCategory(category);
    setMobileOpen(false);
    const catalog = document.getElementById('catalog');
    catalog?.scrollIntoView({ behavior: 'smooth' });
  };

  const runningSegment = `${marqueeText}  ·  `;

  return (
    <div className="sticky top-0 z-40">
      {/* Starting Running Marquee Header Strip */}
      <div className="bg-zinc-950 text-[#EBFC68] h-9 border-b border-zinc-800 overflow-hidden marquee-wrapper flex items-center">
        <button
          type="button"
          onClick={onBuyHotWheels}
          aria-label="Featured Promotion — Click to buy now"
          className="w-full h-full flex items-center overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#EBFC68]"
        >
          <div className="animate-marquee text-xs font-mono font-medium tracking-wider uppercase whitespace-nowrap">
            <span className="px-4">{runningSegment}</span>
            <span className="px-4" aria-hidden="true">
              {runningSegment}
            </span>
            <span className="px-4" aria-hidden="true">
              {runningSegment}
            </span>
            <span className="px-4" aria-hidden="true">
              {runningSegment}
            </span>
          </div>
        </button>
      </div>

      {/* Strict 3-Zone Top Bar */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-zinc-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#"
            className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-950 rounded"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect width="28" height="28" rx="6" fill="#18181B" />
              <path
                d="M15.8 5.5L8.5 15.2H13.7L12.2 22.5L19.5 12.8H14.3L15.8 5.5Z"
                fill="#EBFC68"
              />
            </svg>
            <span className="font-display text-2xl sm:text-[27px] font-extrabold uppercase tracking-[0.06em] text-zinc-950 leading-none">
              {brandName}
            </span>
          </a>

          <nav
            aria-label="Storefront navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600"
          >
            <button
              type="button"
              onClick={() => handleCategoryNav('All')}
              className="hover:text-zinc-950 hover:underline underline-offset-4 decoration-zinc-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Shop All
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNav('Car Showpieces')}
              className="hover:text-zinc-950 hover:underline underline-offset-4 decoration-zinc-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Car Showpieces
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNav('Desk Gadgets')}
              className="hover:text-zinc-950 hover:underline underline-offset-4 decoration-zinc-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Desk Gadgets
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNav('Collectibles')}
              className="hover:text-zinc-950 hover:underline underline-offset-4 decoration-zinc-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Collectibles
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hover:text-zinc-950 hover:underline underline-offset-4 decoration-zinc-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Admin
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open shopping bag with ${cartCount} items`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              <span>Bag</span>
              <span className="font-mono tabular-nums text-xs bg-zinc-950 text-[#EBFC68] px-1.5 py-0.5 rounded">
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-zinc-200 text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-zinc-200 bg-white px-6 py-4">
            <nav aria-label="Mobile storefront navigation" className="flex flex-col">
              {(
                ['All', 'Car Showpieces', 'Desk Gadgets', 'Collectibles'] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryNav(cat)}
                  className="py-3 text-left text-base font-medium text-zinc-800 hover:text-zinc-950 border-b border-zinc-100 cursor-pointer"
                >
                  {cat === 'All' ? 'Shop All' : cat}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAdmin();
                }}
                className="py-3 text-left text-base font-semibold text-zinc-950 cursor-pointer"
              >
                Admin Console
              </button>
            </nav>
          </div>
        )}
      </header>
    </div>
  );
}
