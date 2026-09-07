import React, { useState } from 'react';
import { Product } from '../../types';
import { EbookProductUploadForm } from '../EbookProductUploadForm';
import { createAdminProductEntry } from '../../lib/adminProductApi';
import { 
  PlusCircle, 
  ArrowLeft, 
  Package, 
  Sparkles,
  CheckCircle2,
  Layers
} from 'lucide-react';

interface AdminProductCreateViewProps {
  onBack: () => void;
  onProductCreated?: (newProduct: Product) => void;
  sellerId?: string;
  sellerName?: string;
}

export const AdminProductCreateView: React.FC<AdminProductCreateViewProps> = ({
  onBack,
  onProductCreated,
  sellerId = 'nexovira-official',
  sellerName = 'NEXOVIRA Official'
}) => {
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleCreateProduct = async (productData: Partial<Product>) => {
    try {
      // Execute isolated RESTful POST /api/v1/admin/products request
      const created = await createAdminProductEntry(
        productData,
        'admin-operator',
        'admin'
      );
      setSuccessMsg(`New product document "${created.title}" successfully created and published!`);
      if (onProductCreated) {
        onProductCreated(created);
      }
    } catch (err: any) {
      console.error('Failed to create product via RESTful POST:', err);
      throw err;
    }
  };

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
          <span className="text-cyan-400 font-bold">Create New Inventory Entry</span>
        </div>

        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <span>Cancel & Return</span>
        </button>
      </div>

      {/* 2. Distinct Creation Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              <PlusCircle className="w-3.5 h-3.5" />
              New Inventory Creation Flow
            </span>

            <div className="text-[11px] text-slate-400 font-mono">
              RESTful Target: <span className="text-blue-400 font-bold">POST /api/v1/admin/products</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400 shrink-0" />
              <span>Create New Inventory Entry</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
              Configure a new physical appliance or digital e-book entry. Specify product classifications, technical attributes, warehouse stock, and pricing tiers to publish immediately to the live marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold rounded-2xl flex items-center gap-3 text-xs shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">{successMsg}</div>
          <button
            onClick={onBack}
            className="px-3 py-1 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-emerald-400"
          >
            View in Catalog List
          </button>
        </div>
      )}

      {/* 3. Form Component with Explicit isEditMode={false} (Rule 2 & Rule 3) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 sm:p-8 shadow-xl">
        <EbookProductUploadForm
          isEditMode={false}
          submitButtonText="Create Product Document"
          cancelButtonText="Cancel"
          headerTitle="Create New Inventory Entry"
          headerSubtitle="Specify classification, pricing, and media assets to publish a new catalog entry"
          onSave={handleCreateProduct}
          onCancel={onBack}
          sellerId={sellerId}
          sellerName={sellerName}
          isAdmin={true}
        />
      </div>
    </div>
  );
};
