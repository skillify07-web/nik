import { useEffect, useState } from 'react';
import { Minus, Plus, ShieldCheck, Truck, X } from 'lucide-react';
import type { Product } from '../data/products';
import { ResilientImage } from './ResilientImage';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, variant: string, quantity: number) => void;
  onBuyNow: (product: Product, variant: string, quantity: number) => void;
}

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}: ProductDetailModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (product) {
      setSelectedVariant(product.variants[0] ?? 'Standard Edition');
      setQuantity(1);
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [product, onClose]);

  if (!product) return null;

  const handleAdd = () => {
    onAddToCart(product, selectedVariant, quantity);
    onClose();
  };

  const handleDirectBuy = () => {
    onBuyNow(product, selectedVariant, quantity);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl border border-zinc-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left: Product Gallery */}
          <div className="md:col-span-6 bg-zinc-100 border-b md:border-b-0 md:border-r border-zinc-200 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-white border border-zinc-200">
              <ResilientImage
                src={product.image}
                alt={product.imageAlt}
                fallbackTitle={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right: Contiguous Purchase Module */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500 font-medium">
                  <span>{product.category}</span>
                  {product.tag && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-950 font-semibold">{product.tag}</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close product details"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h2
                id="pdp-title"
                className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight uppercase text-zinc-950"
              >
                {product.name}
              </h2>

              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {product.compareAtPrice && (
                  <span className="font-mono text-sm text-zinc-400 line-through tabular-nums">
                    ₹{product.compareAtPrice.toLocaleString('en-IN')}
                  </span>
                )}
                <span className="text-xs font-medium text-emerald-700">
                  In Stock · Ready to Ship
                </span>
              </div>

              <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
                {product.description}
              </p>

              {/* Finish / Variant Selector */}
              <div className="mt-6">
                <p className="text-xs font-semibold text-zinc-900 mb-2.5">
                  Select Edition: <span className="font-normal text-zinc-600">{selectedVariant}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isSelected = selectedVariant === variant;
                    return (
                      <button
                        key={variant}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-3.5 py-2 min-h-[40px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-950 text-[#EBFC68] border-zinc-950'
                            : 'bg-white text-zinc-800 border-zinc-300 hover:border-zinc-950'
                        }`}
                      >
                        {variant}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specifications */}
              <dl className="mt-6 pt-5 border-t border-zinc-200 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="text-zinc-500">Material</dt>
                  <dd className="font-medium text-zinc-950 mt-0.5">
                    {product.specs.material}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Specification</dt>
                  <dd className="font-medium text-zinc-950 mt-0.5">
                    {product.specs.scaleOrPower}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Dimensions</dt>
                  <dd className="font-mono font-medium text-zinc-950 tabular-nums mt-0.5">
                    {product.specs.dimensions}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Net Weight</dt>
                  <dd className="font-mono font-medium text-zinc-950 tabular-nums mt-0.5">
                    {product.specs.weight}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Purchase Action Row */}
            <div className="mt-8 pt-5 border-t border-zinc-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-zinc-300 rounded-lg bg-white h-11">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-10 h-full inline-flex items-center justify-center text-zinc-700 hover:text-zinc-950 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-9 text-center font-mono text-sm font-semibold tabular-nums text-zinc-950">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="w-10 h-full inline-flex items-center justify-center text-zinc-700 hover:text-zinc-950 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDirectBuy}
                  className="flex-1 h-11 px-4 text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Buy Now · ₹{(product.price * quantity).toLocaleString('en-IN')}
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className="w-full h-11 px-4 text-sm font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Add to Bag
              </button>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-zinc-700" aria-hidden="true" />
                  <span>Dispatches in 24 hrs</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" aria-hidden="true" />
                  <span>7-Day Replacement Guarantee</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
