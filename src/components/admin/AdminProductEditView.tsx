import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { EbookProductUploadForm } from '../EbookProductUploadForm';
import { updateAdminProductEntry, fetchAdminProductForEdit, AdminProductEditMeta } from '../../lib/adminProductApi';
import { 
  ShieldCheck, 
  Package, 
  BookOpen, 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  Calendar, 
  Tag, 
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Archive,
  Layers
} from 'lucide-react';

interface AdminProductEditViewProps {
  productId: string;
  initialProduct?: Product | null;
  onBack: () => void;
  onProductUpdated?: (updatedProduct: Product) => void;
  onViewInStorefront?: (product: Product) => void;
  sellerId?: string;
  sellerName?: string;
}

export const AdminProductEditView: React.FC<AdminProductEditViewProps> = ({
  productId,
  initialProduct,
  onBack,
  onProductUpdated,
  onViewInStorefront,
  sellerId = 'nexovira-official',
  sellerName = 'NEXOVIRA Official'
}) => {
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [meta, setMeta] = useState<AdminProductEditMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialProduct);
  const [loadError, setLoadError] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Load product if not already supplied via initialProduct
  useEffect(() => {
    let isMounted = true;
    if (!initialProduct && productId) {
      setLoading(true);
      fetchAdminProductForEdit(productId)
        .then((res) => {
          if (isMounted) {
            setProduct(res.product);
            setMeta(res.meta);
            setLoadError('');
          }
        })
        .catch((err) => {
          if (isMounted) {
            setLoadError(err.message || `Failed to load archive for product "${productId}".`);
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else if (initialProduct) {
      setProduct(initialProduct);
      setMeta({
        productId: initialProduct.id,
        createdAt: initialProduct.createdAt || new Date().toISOString(),
        updatedAt: (initialProduct as any).updatedAt || initialProduct.createdAt || new Date().toISOString(),
        isArchiveRecord: true,
        sku: `NEXO-${initialProduct.id}`,
        status: 'active'
      });
    }
    return () => {
      isMounted = false;
    };
  }, [productId, initialProduct]);

  const handleCopyId = () => {
    if (product?.id) {
      navigator.clipboard.writeText(product.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    if (!product) return;
    setIsUpdating(true);
    setSaveSuccessMsg('');
    try {
      // Execute isolated RESTful PUT /api/v1/admin/products/:id request
      const updated = await updateAdminProductEntry(
        product.id,
        productData,
        'admin-operator',
        'admin'
      );
      setProduct(updated);
      setMeta((prev) => ({
        ...(prev || {
          productId: updated.id,
          createdAt: updated.createdAt,
          isArchiveRecord: true,
          sku: `NEXO-${updated.id}`,
          status: 'active'
        }),
        updatedAt: new Date().toISOString()
      }));
      setSaveSuccessMsg(`Inventory archive record "${updated.title}" successfully updated!`);
      if (onProductUpdated) {
        onProductUpdated(updated);
      }
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error('Failed to update product via RESTful PUT:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4 p-12 text-center bg-slate-950/40 rounded-3xl border border-slate-800/80">
        <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-white">Retrieving Catalog Archive Record...</p>
          <p className="text-xs text-slate-400 font-mono">Product ID: {productId}</p>
        </div>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="p-8 bg-slate-900 border border-red-500/30 rounded-3xl text-left space-y-4 max-w-3xl mx-auto my-6 shadow-xl">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <h2 className="text-lg font-black text-white">Catalog Archive Retrieval Failed</h2>
        </div>
        <p className="text-xs text-slate-300">
          {loadError || `The product with ID "${productId}" could not be located in active inventory records.`}
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Product Inventory List</span>
        </button>
      </div>
    );
  }

  const isDigital = Boolean(product.isDigital || product.productType === 'digital_ebook');
  const formattedCreatedDate = product.createdAt 
    ? new Date(product.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Archive Standard (Verified)';
  
  const formattedUpdatedDate = (product as any).updatedAt
    ? new Date((product as any).updatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : formattedCreatedDate;

  return (
    <div className="space-y-6 text-left animate-fadeIn max-w-7xl mx-auto">
      {/* 1. Breadcrumbs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="hover:text-cyan-400 flex items-center gap-1 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Products Inventory</span>
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500 font-mono">Archive #{product.id}</span>
          <span className="text-slate-600">/</span>
          <span className="text-cyan-400 font-bold truncate max-w-xs sm:max-w-md">
            Modifying Existing Inventory: {product.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onViewInStorefront && (
            <button
              onClick={() => onViewInStorefront(product)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>View in Storefront</span>
            </button>
          )}

          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <span>Close Editor</span>
          </button>
        </div>
      </div>

      {/* 2. Prominent Edit Layout Header & Archive Banner (Rule 1) */}
      <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top Classification Pill & Alert */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                <Archive className="w-3.5 h-3.5" />
                Inventory Modification Mode
              </span>
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Catalog Status: Active & Grounded
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              RESTful Target: <span className="text-cyan-400 font-bold">PUT /api/v1/admin/products/{product.id}</span>
            </div>
          </div>

          {/* Prominent Header Text Mandated by Rule 1 */}
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              {isDigital ? (
                <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400 shrink-0" />
              ) : (
                <Package className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400 shrink-0" />
              )}
              <span>Modifying Existing Inventory: {product.title}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
              You are updating an existing catalog record in the live database. Changes made here directly alter pricing, stock allocations, technical specifications, and delivery assets across storefront and search indexes.
            </p>
          </div>

          {/* Read-Only Metadata Bar Mandated by Rule 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Product ID (Immutable)</span>
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-xs font-black text-cyan-400 truncate" title={product.id}>
                  {product.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                  title="Copy Product ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Date Created</span>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{formattedCreatedDate}</span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Last Modified</span>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{formattedUpdatedDate}</span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Classification</span>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                {isDigital ? (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    <span>Digital E-Book</span>
                  </>
                ) : (
                  <>
                    <Package className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Physical Device</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned SKU</span>
              <div className="text-xs font-mono font-bold text-amber-400 truncate">
                NEXO-{product.id}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Stock Allocation</span>
              <div className="text-xs font-bold text-white">
                {isDigital ? 'Instant Delivery' : `${product.stock} units recorded`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold rounded-2xl flex items-center gap-3 text-xs shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">{saveSuccessMsg}</div>
          <button
            onClick={() => setSaveSuccessMsg('')}
            className="text-xs text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Form Component with Explicit isEditMode Boolean (Rule 2 & Rule 3) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 sm:p-8 shadow-xl">
        <EbookProductUploadForm
          initialProduct={product}
          isEditMode={true}
          submitButtonText="Save Changes"
          cancelButtonText="Cancel & Return to Products"
          headerTitle={`Modifying Existing Inventory: ${product.title}`}
          headerSubtitle="Archive Record • Active Catalog Listing"
          onSave={handleSaveProduct}
          onCancel={onBack}
          sellerId={sellerId}
          sellerName={sellerName}
          isAdmin={true}
        />
      </div>
    </div>
  );
};
