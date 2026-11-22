import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { LogOut, Package, X } from 'lucide-react';
import type { OrderRecord } from '../data/products';

interface MyOrdersModalProps {
  isOpen: boolean;
  user: User | null;
  orders: OrderRecord[];
  onClose: () => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function MyOrdersModal({
  isOpen,
  user,
  orders,
  onClose,
  onSignIn,
  onSignOut,
}: MyOrdersModalProps) {
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await onSignIn();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to complete sign-in.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Customer Account and Orders"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-zinc-950" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold uppercase text-zinc-950">
              {user ? 'My Account & Orders' : 'Customer Sign In'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!user ? (
          <div className="mt-6">
            <p className="text-sm text-zinc-600 leading-relaxed">
              Sign in with Google to track your Toy Tron orders, view receipts,
              and speed through Express Checkout.
            </p>
            {authError && (
              <p className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {authError}
              </p>
            )}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="mt-6 w-full py-3 px-4 min-h-[44px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg cursor-pointer"
            >
              Continue with Google
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-950 truncate">
                  {user.displayName || 'Toy Tron Shopper'}
                </p>
                <p className="text-xs font-mono text-zinc-500 truncate">
                  {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Order History ({orders.length})
              </h3>
              {orders.length === 0 ? (
                <div className="p-6 rounded-xl border border-zinc-200 text-center">
                  <p className="text-sm font-medium text-zinc-900">
                    No orders placed yet
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Your confirmed Toy Tron orders will appear here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {orders.map((order) => (
                    <li
                      key={order.id}
                      className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs font-semibold text-zinc-950">
                          #{order.orderNumber}
                        </span>
                        <span className="text-xs font-semibold text-zinc-900">
                          {order.status} · {order.paymentMethod}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600">
                        {order.itemsSummary.join(', ')}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-200 text-xs">
                        <span className="text-zinc-500">
                          {new Date(order.createdAtMs).toLocaleDateString('en-IN')}
                        </span>
                        <span className="font-mono font-bold text-zinc-950 tabular-nums">
                          ₹{order.total.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
