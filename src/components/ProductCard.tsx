import React from 'react';
import { Product, CurrencyCode } from '../types';
import { Star, ShieldCheck, ShoppingCart, Check, Zap, Heart, BookOpen, FileText, Bell } from 'lucide-react';
import { formatCurrency } from '../lib/currency';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onAskAI: (product: Product, e: React.MouseEvent) => void;
  onToggleCompare?: (product: Product, e: React.MouseEvent) => void;
  onToggleWishlist?: (product: Product, e: React.MouseEvent) => void;
  onSetPriceAlert?: (product: Product, e: React.MouseEvent) => void;
  isCompared?: boolean;
  isInWishlist?: boolean;
  hasPriceAlert?: boolean;
  currentCurrency?: CurrencyCode;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onAddToCart,
  onAskAI,
  onToggleCompare,
  onToggleWishlist,
  onSetPriceAlert,
  isCompared = false,
  isInWishlist = false,
  hasPriceAlert = false,
  currentCurrency = 'NGN',
}) => {
  const currency = (currentCurrency as CurrencyCode) || 'NGN';

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className="group relative bg-white dark:bg-[#0D2B45] rounded-2xl border border-[#E2E8F0] dark:border-slate-800/80 hover:border-[#1769FF]/50 dark:hover:border-[#00A6A6]/50 shadow-xs motion-card-lift flex flex-col overflow-hidden cursor-pointer text-left"
    >
      {/* Badges & Media Container */}
      <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-[#081A2B] overflow-hidden">
        <img
          src={product.images?.[0] || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=600&auto=format&fit=crop&q=80'}
          alt={product.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=600&auto=format&fit=crop&q=80';
          }}
          className={`w-full h-full object-cover transition-transform duration-500 ease-out ${product.stock <= 0 ? 'opacity-60 grayscale-[40%]' : 'group-hover:scale-108'}`}
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 items-start">
          {product.stock <= 0 ? (
            <span className="bg-rose-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs">
              Out of Stock
            </span>
          ) : (product.isDigital || product.productType === 'digital_ebook') ? (
            <span className="bg-[#1769FF] text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
              <BookOpen className="w-3 h-3 fill-current" />
              DIGITAL E-BOOK
            </span>
          ) : null}
          {product.stock > 0 && product.isFlashDeal && (
            <span className="bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
              <Zap className="w-3 h-3 fill-current" />
              Flash Deal
            </span>
          )}
          {product.energyRating && (
            <span className="bg-[#DDF8F2] text-[#00A6A6] font-bold text-[10px] px-2 py-0.5 rounded-md border border-[#00A6A6]/30 shadow-xs">
              Energy {product.energyRating}
            </span>
          )}
        </div>

        {/* Multi-Image Preview Badge */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 z-10 bg-[#081A2B]/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700 shadow-xs">
            +{product.images.length - 1} photos
          </div>
        )}

        {/* Top Right Wishlist, Price Alert & Compare buttons */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {onSetPriceAlert && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetPriceAlert(product, e);
              }}
              className={`p-1.5 sm:p-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all shadow-xs min-w-[34px] min-h-[34px] flex items-center justify-center ${
                hasPriceAlert
                  ? 'bg-[#F4B740] text-[#081A2B] ring-2 ring-amber-300 scale-105'
                  : 'bg-[#081A2B]/70 text-slate-200 hover:bg-[#081A2B] hover:text-[#F4B740]'
              }`}
              title={hasPriceAlert ? 'Target Price Alert Active' : 'Set Target Price Alert'}
            >
              <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${hasPriceAlert ? 'fill-current' : ''}`} />
            </button>
          )}

          {onToggleWishlist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist(product, e);
              }}
              className={`p-1.5 sm:p-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all shadow-xs min-w-[34px] min-h-[34px] flex items-center justify-center ${
                isInWishlist
                  ? 'bg-rose-500 text-white ring-2 ring-rose-300 scale-105'
                  : 'bg-[#081A2B]/70 text-slate-200 hover:bg-[#081A2B] hover:text-rose-400'
              }`}
              title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isInWishlist ? 'fill-current text-white' : ''}`} />
            </button>
          )}

          {onToggleCompare && (
            <button
              onClick={(e) => onToggleCompare(product, e)}
              className={`p-1.5 rounded-lg text-xs font-semibold backdrop-blur-md transition-all min-h-[34px] flex items-center justify-center ${
                isCompared
                  ? 'bg-[#1769FF] text-white shadow-xs ring-2 ring-blue-300'
                  : 'bg-[#081A2B]/70 text-slate-200 hover:bg-[#081A2B] hover:text-[#00A6A6]'
              }`}
              title="Compare with NEXOVIRA AI"
            >
              {isCompared ? <Check className="w-3.5 h-3.5" /> : 'Compare'}
            </button>
          )}
        </div>

        {/* Seller Verification Pill */}
        {product.sellerVerified && (
          <div className="absolute bottom-2.5 left-2.5 bg-[#081A2B]/90 backdrop-blur-md text-[#DDF8F2] border border-[#00A6A6]/40 font-medium text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00A6A6]" />
            <span>Lagos Hub Verified</span>
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Capacity Header */}
          <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400 font-semibold mb-1">
            <span className="uppercase tracking-wider text-[#1769FF] dark:text-blue-400 font-bold truncate max-w-[130px]">
              {(product.isDigital || product.productType === 'digital_ebook') 
                ? (product.author ? `By ${product.author}` : product.brand)
                : product.brand}
            </span>
            <span className="shrink-0 text-[#64748B] dark:text-slate-400 font-medium">
              {(product.isDigital || product.productType === 'digital_ebook') ? 'PDF • Digital' : (product.capacity || 'In Stock')}
            </span>
          </div>

          {/* Product Title */}
          <h3 className="font-bold text-[#17202A] dark:text-slate-100 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-[#1769FF] dark:group-hover:text-[#00A6A6] transition-colors">
            {product.title}
          </h3>

          {/* Ratings, Stock & Warranty */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
            <div className="flex items-center text-[#F4B740]">
              <Star className="w-3.5 h-3.5 fill-[#F4B740]" />
              <span className="text-xs font-bold text-[#17202A] dark:text-slate-200 ml-1">
                {product.rating ? Number(product.rating).toFixed(1) : '5.0'}
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium ml-1">
                ({product.reviewCount ?? 0})
              </span>
            </div>

            <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>

            {product.stock > 0 ? (
              <span className="text-[11px] font-semibold text-[#168A5B] dark:text-emerald-400">
                {product.stock} in stock
              </span>
            ) : (
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                Out of stock
              </span>
            )}

            {product.warranty && (
              <>
                <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
                <span className="text-[#64748B] dark:text-slate-400 text-[11px] truncate max-w-[120px]" title={product.warranty}>
                  {product.warranty}
                </span>
              </>
            )}
          </div>

          {product.sellerName && (
            <div className="mt-1 text-[11px] text-[#64748B] dark:text-slate-400 truncate">
              Sold by <span className="font-medium text-slate-700 dark:text-slate-300">{product.sellerName}</span>
            </div>
          )}

          {/* Key Specification snippet */}
          <div className="mt-2 flex flex-wrap gap-1">
            {product.keyFeatures.slice(0, 2).map((feature, i) => (
              <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-300 px-2 py-0.5 rounded truncate max-w-full">
                • {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Pricing & Footer Actions */}
        <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-800/80 flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-[#17202A] dark:text-white">
                {formatCurrency(product.price, currency)}
              </span>
              {product.originalPrice && (
                <span className="text-[11px] text-[#64748B] dark:text-slate-400 line-through">
                  {formatCurrency(product.originalPrice, currency)}
                </span>
              )}
            </div>

            {product.discountPercentage && (
              <span className="text-[10px] font-extrabold text-[#168A5B] dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                -{product.discountPercentage}%
              </span>
            )}
          </div>

          {/* Action Button Row */}
          <div className="grid grid-cols-2 gap-2">
            {product.stock > 0 ? (
              <button
                onClick={(e) => onAddToCart(product, e)}
                className="w-full py-2.5 px-2 rounded-xl bg-[#081A2B] hover:bg-[#1769FF] dark:bg-[#1769FF] dark:hover:bg-[#0E56D9] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs min-h-[42px] cursor-pointer motion-btn-pop active:scale-95"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-blue-200" />
                <span>Add Cart</span>
              </button>
            ) : (
              <button
                disabled
                onClick={(e) => e.stopPropagation()}
                className="w-full py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[#64748B] dark:text-slate-500 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-[#E2E8F0] dark:border-slate-800 min-h-[42px]"
              >
                <span>Out of Stock</span>
              </button>
            )}

            <button
              onClick={(e) => onAskAI(product, e)}
              className="w-full py-2.5 px-2 rounded-xl bg-[#00A6A6]/10 hover:bg-[#00A6A6]/20 text-[#00A6A6] dark:text-teal-300 font-semibold text-xs flex items-center justify-center gap-1 transition-colors border border-[#00A6A6]/30 min-h-[42px] cursor-pointer motion-btn-pop active:scale-95"
            >
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
