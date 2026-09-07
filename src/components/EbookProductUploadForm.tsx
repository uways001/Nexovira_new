import React, { useState } from 'react';
import { Product, CategoryId, ProductImage } from '../types';
import { EbookImageGallery } from './EbookImageGallery';
import { safeFetchJson } from '../lib/safeFetch';
import { 
  detectMaliciousPayload, 
  sanitizeText, 
  sanitizeMultilineText, 
  sanitizeUrl, 
  logSecurityThreatAttempt 
} from '../lib/sanitization';
import { 
  BookOpen, 
  Package, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  X, 
  ShieldCheck, 
  Tag, 
  DollarSign 
} from 'lucide-react';

interface EbookProductUploadFormProps {
  initialProduct?: Partial<Product> | null;
  onSave: (productData: Partial<Product>) => Promise<void>;
  onCancel?: () => void;
  sellerId: string;
  sellerName: string;
  isAdmin?: boolean;
  isEditMode?: boolean;
  submitButtonText?: string;
  cancelButtonText?: string;
  headerTitle?: string;
  headerSubtitle?: string;
}

export const EbookProductUploadForm: React.FC<EbookProductUploadFormProps> = ({
  initialProduct,
  onSave,
  onCancel,
  sellerId,
  sellerName,
  isAdmin = false,
  isEditMode: isEditModeProp,
  submitButtonText,
  cancelButtonText,
  headerTitle,
  headerSubtitle
}) => {
  // Explicit isEditMode check mandated by Rule 3
  const isEditMode = isEditModeProp !== undefined ? isEditModeProp : Boolean(initialProduct?.id);

  // Product Type State
  const [productType, setProductType] = useState<'physical' | 'digital_ebook'>(
    initialProduct?.productType || (initialProduct?.isDigital ? 'digital_ebook' : 'physical')
  );
  const [isDigital, setIsDigital] = useState<boolean>(
    initialProduct?.isDigital || initialProduct?.productType === 'digital_ebook' || false
  );

  // Gallery Images State
  const initialGalleryItems: ProductImage[] = (() => {
    if (initialProduct?.productImages && initialProduct.productImages.length > 0) {
      return initialProduct.productImages;
    }
    if (initialProduct?.images && initialProduct.images.length > 0) {
      return initialProduct.images.map((url, idx) => ({
        id: `img-${idx}-${Date.now()}`,
        url,
        displayOrder: idx,
        isPrimary: idx === 0,
        createdAt: new Date().toISOString(),
        fileName: idx === 0 ? 'Primary Cover Image' : `Preview Image ${idx + 1}`
      }));
    }
    return [{
      id: `img-default-${Date.now()}`,
      url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
      displayOrder: 0,
      isPrimary: true,
      createdAt: new Date().toISOString(),
      fileName: 'Cover Image'
    }];
  })();

  const [galleryImages, setGalleryImages] = useState<ProductImage[]>(initialGalleryItems);

  // Common Fields State (Pre-populated from initialProduct)
  const [title, setTitle] = useState(initialProduct?.title || '');
  const [brand, setBrand] = useState(initialProduct?.brand || (initialProduct?.isDigital ? 'NEXOVIRA Press' : 'NEXOVIRA Tech'));
  const [price, setPrice] = useState<number>(initialProduct?.price || 25);
  const [originalPrice, setOriginalPrice] = useState<number>(initialProduct?.originalPrice || 35);
  const [categoryId, setCategoryId] = useState<CategoryId>(
    initialProduct?.categoryId || (initialProduct?.isDigital ? 'ebooks' : 'air-conditioners')
  );
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [tags, setTags] = useState<string>(initialProduct?.tags ? initialProduct.tags.join(', ') : 'ebook, guide, tech');

  // Physical Product Specifics
  const [stock, setStock] = useState<number>(initialProduct?.stock ?? 50);
  const [warranty, setWarranty] = useState(initialProduct?.warranty || '1 Year Guarantee');

  // Digital E-book Specifics
  const [author, setAuthor] = useState(initialProduct?.author || 'NEXOVIRA Author');
  const [publisher, setPublisher] = useState(initialProduct?.publisher || 'NEXOVIRA Digital Publishing');
  const [publicationYear, setPublicationYear] = useState(initialProduct?.publicationYear || new Date().getFullYear().toString());
  const [isbn, setIsbn] = useState(initialProduct?.isbn || '');
  const [pdfUrl, setPdfUrl] = useState<string>(initialProduct?.pdfUrl || '');
  const [pdfFileName, setPdfFileName] = useState<string>(initialProduct?.pdfFileName || '');
  const [pdfFileSize, setPdfFileSize] = useState<string>(initialProduct?.pdfFileSize || '');

  // Snapshot of original archive values for visual change indicators
  const originalSnapshot = React.useRef({
    title: initialProduct?.title || '',
    brand: initialProduct?.brand || (initialProduct?.isDigital ? 'NEXOVIRA Press' : 'NEXOVIRA Tech'),
    price: initialProduct?.price || 25,
    originalPrice: initialProduct?.originalPrice || 35,
    stock: initialProduct?.stock ?? 50,
    categoryId: initialProduct?.categoryId || (initialProduct?.isDigital ? 'ebooks' : 'air-conditioners'),
    description: initialProduct?.description || '',
    warranty: initialProduct?.warranty || '1 Year Guarantee',
    tags: initialProduct?.tags ? initialProduct.tags.join(', ') : 'ebook, guide, tech',
    author: initialProduct?.author || 'NEXOVIRA Author',
    publisher: initialProduct?.publisher || 'NEXOVIRA Digital Publishing',
    publicationYear: initialProduct?.publicationYear || new Date().getFullYear().toString(),
    isbn: initialProduct?.isbn || '',
    pdfUrl: initialProduct?.pdfUrl || ''
  }).current;

  // Helper to determine if a field was modified from the archive baseline
  const getFieldChange = (fieldKey: keyof typeof originalSnapshot, currentValue: any) => {
    if (!isEditMode) return { isModified: false, original: '' };
    const orig = originalSnapshot[fieldKey];
    const isModified = currentValue !== orig;
    return {
      isModified,
      original: String(orig)
    };
  };

  // Revert single field to its original archive value
  const handleRevertField = (fieldKey: keyof typeof originalSnapshot) => {
    const orig = originalSnapshot[fieldKey];
    switch (fieldKey) {
      case 'title': setTitle(orig as string); break;
      case 'brand': setBrand(orig as string); break;
      case 'price': setPrice(orig as number); break;
      case 'originalPrice': setOriginalPrice(orig as number); break;
      case 'stock': setStock(orig as number); break;
      case 'categoryId': setCategoryId(orig as CategoryId); break;
      case 'description': setDescription(orig as string); break;
      case 'warranty': setWarranty(orig as string); break;
      case 'tags': setTags(orig as string); break;
      case 'author': setAuthor(orig as string); break;
      case 'publisher': setPublisher(orig as string); break;
      case 'publicationYear': setPublicationYear(orig as string); break;
      case 'isbn': setIsbn(orig as string); break;
      case 'pdfUrl': setPdfUrl(orig as string); break;
    }
  };

  // Revert all fields to archive baseline
  const handleRevertAll = () => {
    setTitle(originalSnapshot.title);
    setBrand(originalSnapshot.brand);
    setPrice(originalSnapshot.price);
    setOriginalPrice(originalSnapshot.originalPrice);
    setStock(originalSnapshot.stock);
    setCategoryId(originalSnapshot.categoryId);
    setDescription(originalSnapshot.description);
    setWarranty(originalSnapshot.warranty);
    setTags(originalSnapshot.tags);
    setAuthor(originalSnapshot.author);
    setPublisher(originalSnapshot.publisher);
    setPublicationYear(originalSnapshot.publicationYear);
    setIsbn(originalSnapshot.isbn);
    setPdfUrl(originalSnapshot.pdfUrl);
  };

  // Calculate total modified parameters count
  const modifiedFieldsCount = isEditMode ? [
    title !== originalSnapshot.title,
    brand !== originalSnapshot.brand,
    price !== originalSnapshot.price,
    originalPrice !== originalSnapshot.originalPrice,
    stock !== originalSnapshot.stock,
    categoryId !== originalSnapshot.categoryId,
    description !== originalSnapshot.description,
    warranty !== originalSnapshot.warranty,
    tags !== originalSnapshot.tags,
    author !== originalSnapshot.author,
    publisher !== originalSnapshot.publisher,
    publicationYear !== originalSnapshot.publicationYear,
    isbn !== originalSnapshot.isbn,
    pdfUrl !== originalSnapshot.pdfUrl
  ].filter(Boolean).length : 0;

  // UI States
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(pdfUrl ? 100 : 0);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Handle Switch Product Type
  const handleTypeSelect = (type: 'physical' | 'digital_ebook') => {
    setProductType(type);
    const digitalFlag = type === 'digital_ebook';
    setIsDigital(digitalFlag);
    if (digitalFlag) {
      if (categoryId !== 'ebooks') setCategoryId('ebooks');
      if (stock < 999) setStock(9999);
    } else {
      if (categoryId === 'ebooks') setCategoryId('air-conditioners');
      if (stock === 9999) setStock(50);
    }
  };

  const handleToggleDigital = (active: boolean) => {
    setIsDigital(active);
    const type = active ? 'digital_ebook' : 'physical';
    setProductType(type);
    if (active) {
      setCategoryId('ebooks');
      setStock(9999);
    } else {
      setCategoryId('air-conditioners');
      setStock(50);
    }
  };

  // Process PDF Upload File
  const processPdfFile = (file: File) => {
    setUploadError('');
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Invalid file type. Only PDF documents (.pdf) are allowed for E-books.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds maximum limit of 50MB.');
      return;
    }

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    setPdfFileName(file.name);
    setPdfFileSize(sizeFormatted);
    setIsUploadingPdf(true);
    setUploadProgress(15);

    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const percent = Math.round((evt.loaded / evt.total) * 90);
        setUploadProgress(percent);
      }
    };

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPdfUrl(dataUrl);
      setUploadProgress(100);
      setIsUploadingPdf(false);
    };

    reader.onerror = () => {
      setUploadError('Failed to read PDF file. Please try selecting another document.');
      setIsUploadingPdf(false);
    };

    reader.readAsDataURL(file);
  };

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processPdfFile(e.target.files[0]);
    }
  };

  const handlePdfDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPdfFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePdf = () => {
    setPdfUrl('');
    setPdfFileName('');
    setPdfFileSize('');
    setUploadProgress(0);
  };

  // Image upload handler
  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const url = evt.target?.result as string;
        setGalleryImages(prev => [
          {
            id: `img-${Date.now()}`,
            url,
            displayOrder: 0,
            isPrimary: true,
            createdAt: new Date().toISOString(),
            fileName: imgFile.name
          },
          ...prev.map((item, idx) => ({ ...item, displayOrder: idx + 1, isPrimary: false }))
        ]);
      };
      reader.readAsDataURL(imgFile);
    }
  };

  // AI Description Generator
  const handleGenerateAI = async () => {
    if (!title.trim()) return;
    setIsGeneratingAI(true);
    try {
      const res = await safeFetchJson<{ description?: string }>('/api/v1/ai/seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, brand, isDigital, author })
      });
      if (res.ok && res.data?.description) {
        setDescription(res.data.description);
      }
    } catch (e) {
      if (isDigital) {
        setDescription(`Comprehensive digital guide "${title}" written by ${author}. Features in-depth technical analysis, practical step-by-step frameworks, and verified industry insights formatted in crisp high-resolution PDF.`);
      } else {
        setDescription(`Premium ${brand} ${title} engineered with zero-defect quality, energy-efficient technology, and verified warranty.`);
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // 1. Security Threat Inspection across all user-entered text fields
    const inputsToCheck = [
      { field: 'Title', value: title },
      { field: 'Brand', value: brand },
      { field: 'Description', value: description },
      { field: 'Author', value: author },
      { field: 'Publisher', value: publisher },
      { field: 'ISBN', value: isbn },
      { field: 'Tags', value: tags },
      { field: 'PDF File Name', value: pdfFileName },
    ];

    for (const item of inputsToCheck) {
      if (item.value) {
        const threat = detectMaliciousPayload(item.value);
        if (threat.isSuspicious) {
          logSecurityThreatAttempt('Seller Studio Product Upload', item.field, threat, item.value);
          setFormError(`Security Violation: Malicious or unauthorized code syntax detected in ${item.field} (${threat.threatType}).`);
          return;
        }
      }
    }

    // 2. Clean and Sanitize text
    const cleanTitle = sanitizeText(title, 180);
    if (!cleanTitle.trim()) {
      setFormError('Please provide a valid product title.');
      return;
    }

    const cleanBrand = sanitizeText(brand, 80) || 'NEXOVIRA';
    const cleanDescription = sanitizeMultilineText(description, 5000);
    const cleanAuthor = sanitizeText(author, 120);
    const cleanPublisher = sanitizeText(publisher, 120);
    const cleanPubYear = sanitizeText(publicationYear, 10);
    const cleanIsbn = sanitizeText(isbn, 30);
    const cleanWarranty = sanitizeText(warranty, 100) || 'Certified Quality';

    if (price <= 0) {
      setFormError('Price must be greater than 0.');
      return;
    }

    if (galleryImages.length === 0) {
      setFormError('Required: Please upload at least one image (Primary Cover Image) for this product.');
      return;
    }

    // Check gallery image URLs for safe protocols
    for (const img of galleryImages) {
      const urlCheck = sanitizeUrl(img.url);
      if (!urlCheck.isValid) {
        setFormError(`Image security warning: ${urlCheck.error}`);
        return;
      }
    }

    // STRICT E-BOOK VALIDATION
    if (isDigital || productType === 'digital_ebook') {
      if (!pdfUrl || !pdfFileName) {
        setFormError('Required: You must upload a valid PDF document before publishing a Digital E-book.');
        return;
      }
      const pdfCheck = sanitizeUrl(pdfUrl);
      if (!pdfCheck.isValid) {
        setFormError(`PDF URL security warning: ${pdfCheck.error}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const parsedTags = tags
        .split(',')
        .map(t => sanitizeText(t.trim(), 40))
        .filter(Boolean);

      const primaryImageObj = galleryImages.find(img => img.isPrimary) || galleryImages[0];
      const imageUrls = galleryImages.map(img => img.url);
      const sortedImageUrls = [
        primaryImageObj.url,
        ...imageUrls.filter(u => u !== primaryImageObj.url)
      ];

      const payload: Partial<Product> = {
        title: cleanTitle,
        brand: cleanBrand,
        price: Math.max(1, Number(price)),
        originalPrice: Number(originalPrice) || Number(price) * 1.25,
        currency: 'NGN',
        categoryId,
        description: cleanDescription || 'Verified product document.',
        images: sortedImageUrls,
        productImages: galleryImages,
        keyFeatures: isDigital 
          ? [`Digital PDF Format (${pdfFileSize || 'Verified'})`, `Author: ${cleanAuthor || 'Verified Author'}`, 'Instant Download Access']
          : ['Certified Quality', 'Zero-Defect Guarantee', cleanWarranty],
        specifications: isDigital 
          ? { Author: cleanAuthor, Publisher: cleanPublisher, 'File Format': 'PDF', 'File Size': pdfFileSize }
          : { Warranty: cleanWarranty },
        tags: parsedTags,
        sellerId,
        sellerName,
        sellerVerified: true,
        rating: initialProduct?.rating || 5.0,
        reviewCount: initialProduct?.reviewCount || 1,
        
        // Digital E-book Attributes
        productType,
        isDigital,
        author: cleanAuthor,
        publisher: cleanPublisher,
        publicationYear: cleanPubYear,
        isbn: cleanIsbn,
        pdfUrl,
        pdfFileName: sanitizeText(pdfFileName, 120),
        pdfFileSize,
        stock: isDigital ? 9999 : Math.max(0, Math.floor(Number(stock))),
        warranty: isDigital ? 'Lifetime Digital License' : cleanWarranty,
      };

      await onSave(payload);
    } catch (err: any) {
      console.error('Failed to save product:', err);
      setFormError(err.message || 'An error occurred while saving the product document.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl text-left space-y-6 text-xs text-slate-900 dark:text-slate-100 max-w-4xl mx-auto">
      
      {/* Header - Enforce explicit separation between Add and Edit flows (Rule 1 & Rule 3) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            {isDigital ? <BookOpen className="w-5 h-5 text-purple-500" /> : <Package className="w-5 h-5 text-cyan-500" />}
            <span>
              {headerTitle || (isEditMode 
                ? `Modifying Existing Inventory: ${initialProduct?.title || 'Product'}` 
                : 'Create New Inventory Entry')}
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {headerSubtitle || (isEditMode 
              ? 'Catalog Archive Record • Changes update live pricing, stock allocations, and metadata'
              : (isDigital ? 'Create a digital e-book entry with secure PDF delivery' : 'List hardware or physical appliances with stock inventory'))}
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Unsaved Changes Indicator Bar in Edit Mode (Rule 3) */}
      {isEditMode && modifiedFieldsCount > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-amber-300 text-xs shadow-md">
          <div className="flex items-center gap-2.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>Unsaved Changes: {modifiedFieldsCount} parameter{modifiedFieldsCount > 1 ? 's' : ''} modified from catalog archive record</span>
          </div>
          <button
            type="button"
            onClick={handleRevertAll}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Revert All to Archive</span>
          </button>
        </div>
      )}

      {formError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded-2xl flex items-center gap-2 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. PRODUCT TYPE / CLASSIFICATION (Rule 3: Hide creation selector in Edit Mode) */}
        {!isEditMode ? (
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-slate-400">1. Select Product Type *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeSelect('physical')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                  productType === 'physical'
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-md ring-2 ring-cyan-500/20'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${productType === 'physical' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">Physical Product</div>
                  <div className="text-[11px] text-slate-400 font-normal">Appliances, devices, solar hardware with inventory & shipping</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeSelect('digital_ebook')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                  productType === 'digital_ebook'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-md ring-2 ring-purple-500/20'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${productType === 'digital_ebook' ? 'bg-purple-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">Digital E-book</div>
                  <div className="text-[11px] text-slate-400 font-normal">PDF books, manuals & research with instant digital library delivery</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDigital ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                {isDigital ? <BookOpen className="w-5 h-5" /> : <Package className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-extrabold text-white flex items-center gap-2">
                  <span>Archive Classification: {isDigital ? 'Digital E-Book (Instant PDF Delivery)' : 'Physical Appliance (Inventory-Tracked)'}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-mono">
                    Immutable Record Schema
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Product classification is locked in the catalog archive. Modifications apply to pricing tiers, specifications, inventory stock, and media gallery.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
              Asset ID: {initialProduct?.id}
            </span>
          </div>
        )}

        {/* 2. DIGITAL E-BOOK TOGGLE SWITCH (Rule 3: Hidden in Edit Mode) */}
        {!isEditMode && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDigital ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">Is this a Digital E-book?</span>
                <p className="text-[11px] text-slate-400">Activates PDF file upload, author information, and instant library access</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleDigital(!isDigital)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                isDigital ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  isDigital ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {/* 3. E-BOOK PDF UPLOAD SECTION (WHEN DIGITAL E-BOOK = ON) */}
        {isDigital && (
          <div className="p-5 bg-purple-950/20 border border-purple-900/40 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-sm text-purple-300">Upload E-book PDF Document *</h3>
              </div>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">
                PDF Format Only (Max 50MB)
              </span>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handlePdfDrop}
              className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all ${
                isDragging
                  ? 'border-purple-400 bg-purple-500/20'
                  : pdfFileName
                  ? 'border-emerald-500/60 bg-emerald-500/10'
                  : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-purple-500/50'
              }`}
            >
              {pdfFileName ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">{pdfFileName}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">Size: {pdfFileSize || 'Verified PDF'}</div>
                  </div>

                  {isUploadingPdf && (
                    <div className="w-full max-w-xs mx-auto space-y-1">
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <span className="text-[10px] text-purple-300 font-bold">Uploading PDF... {uploadProgress}%</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer text-xs flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Replace PDF</span>
                      <input type="file" accept=".pdf,application/pdf" onChange={handlePdfFileSelect} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemovePdf}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Drag & drop your E-book PDF document here</p>
                    <p className="text-xs text-slate-400">or browse from your desktop files</p>
                  </div>
                  <label className="inline-block px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer transition-transform active:scale-95 text-xs">
                    Choose PDF File
                    <input type="file" accept=".pdf,application/pdf" onChange={handlePdfFileSelect} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="text-xs font-bold text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {uploadError}
              </p>
            )}
          </div>
        )}

        {/* 4. GENERAL PRODUCT / E-BOOK METADATA (With Visual Change Indicators) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-400">
                {isDigital ? 'E-book Title *' : 'Product Title *'}
              </label>
              {(() => {
                const change = getFieldChange('title', title);
                if (!change.isModified) return null;
                return (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Modified • Archive: "{change.original}"
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRevertField('title')}
                      className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Revert
                    </button>
                  </div>
                );
              })()}
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isDigital ? 'e.g. Masterclass on Solar Energy Systems' : 'e.g. NEXOVIRA Smart AC 1.5HP'}
              className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-cyan-500 ${
                getFieldChange('title', title).isModified
                  ? 'border-amber-500/70 ring-2 ring-amber-500/20 bg-amber-500/5'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            />
          </div>

          {isDigital ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-400">Author Name *</label>
                {(() => {
                  const change = getFieldChange('author', author);
                  if (!change.isModified) return null;
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Modified • Archive: "{change.original}"
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevertField('author')}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Revert
                      </button>
                    </div>
                  );
                })()}
              </div>
              <input
                type="text"
                required={isDigital}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Dr. A. O. Ogunlesi"
                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none ${
                  getFieldChange('author', author).isModified
                    ? 'border-amber-500/70 ring-2 ring-amber-500/20 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-400">Brand / Manufacturer</label>
                {(() => {
                  const change = getFieldChange('brand', brand);
                  if (!change.isModified) return null;
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Modified • Archive: "{change.original}"
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevertField('brand')}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Revert
                      </button>
                    </div>
                  );
                })()}
              </div>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. NEXOVIRA Tech"
                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none ${
                  getFieldChange('brand', brand).isModified
                    ? 'border-amber-500/70 ring-2 ring-amber-500/20 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>
          )}
        </div>

        {/* E-BOOK SPECIFIC PUBLICATION FIELDS */}
        {isDigital && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-400">Publisher</label>
                {getFieldChange('publisher', publisher).isModified && (
                  <span className="text-[10px] font-bold text-amber-400">Modified</span>
                )}
              </div>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="NEXOVIRA Press"
                className={`w-full bg-white dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs ${
                  getFieldChange('publisher', publisher).isModified
                    ? 'border-amber-500/70 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-400">Publication Year</label>
                {getFieldChange('publicationYear', publicationYear).isModified && (
                  <span className="text-[10px] font-bold text-amber-400">Modified</span>
                )}
              </div>
              <input
                type="text"
                value={publicationYear}
                onChange={(e) => setPublicationYear(e.target.value)}
                placeholder="2026"
                className={`w-full bg-white dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs ${
                  getFieldChange('publicationYear', publicationYear).isModified
                    ? 'border-amber-500/70 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-400">ISBN (Optional)</label>
                {getFieldChange('isbn', isbn).isModified && (
                  <span className="text-[10px] font-bold text-amber-400">Modified</span>
                )}
              </div>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="978-3-16-148410-0"
                className={`w-full bg-white dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs font-mono ${
                  getFieldChange('isbn', isbn).isModified
                    ? 'border-amber-500/70 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>
          </div>
        )}

        {/* PRICE & DISCOUNT (With Visual Change Indicators) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-400">Price (USD) *</label>
              {(() => {
                const change = getFieldChange('price', price);
                if (!change.isModified) return null;
                return (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Modified • Archive: "${change.original}"
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRevertField('price')}
                      className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Revert
                    </button>
                  </div>
                );
              })()}
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="number"
                required
                min={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold focus:outline-none ${
                  getFieldChange('price', price).isModified
                    ? 'border-amber-500/70 ring-2 ring-amber-500/20 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-400">Original Price (USD)</label>
              {(() => {
                const change = getFieldChange('originalPrice', originalPrice);
                if (!change.isModified) return null;
                return (
                  <span className="text-[10px] font-bold text-amber-400">
                    Modified (Archive: ${change.original})
                  </span>
                );
              })()}
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Number(e.target.value))}
                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold focus:outline-none ${
                  getFieldChange('originalPrice', originalPrice).isModified
                    ? 'border-amber-500/70 ring-2 ring-amber-500/20 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>
          </div>

          {isDigital ? (
            <div>
              <label className="block font-bold text-slate-400 mb-1">Inventory / License</label>
              <input
                type="text"
                disabled
                value="Unlimited Digital Delivery"
                className="w-full bg-slate-200 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-400">Inventory Stock Quantity *</label>
                {(() => {
                  const change = getFieldChange('stock', stock);
                  if (!change.isModified) return null;
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Modified • Archive: {change.original} units
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevertField('stock')}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Revert
                      </button>
                    </div>
                  );
                })()}
              </div>
              <input
                type="number"
                required={!isDigital}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none ${
                  getFieldChange('stock', stock).isModified
                    ? 'border-amber-500/70 ring-2 ring-amber-500/20 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>
          )}
        </div>

        {/* E-BOOK / PRODUCT IMAGE GALLERY */}
        <EbookImageGallery 
          images={galleryImages} 
          onChange={setGalleryImages} 
          isDigital={isDigital} 
          maxImages={15} 
        />

        {/* DESCRIPTION & AI GENERATOR */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-slate-400">Description & Overview</label>
            <div className="flex items-center gap-2">
              {getFieldChange('description', description).isModified && (
                <span className="text-[10px] font-bold text-amber-400">Content Modified</span>
              )}
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGeneratingAI || !title.trim()}
                className="text-cyan-500 hover:text-cyan-400 font-bold flex items-center gap-1 text-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeneratingAI ? 'AI Writing...' : 'Generate with AI'}</span>
              </button>
            </div>
          </div>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isDigital ? 'Describe the e-book contents, chapters, key takeaways...' : 'Describe technical specifications and key features...'}
            className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500 ${
              getFieldChange('description', description).isModified
                ? 'border-amber-500/70 ring-2 ring-amber-500/20 bg-amber-500/5'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          />
        </div>

        {/* TAGS */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-bold text-slate-400">Search Tags (Comma Separated)</label>
            {getFieldChange('tags', tags).isModified && (
              <span className="text-[10px] font-bold text-amber-400">Tags Modified</span>
            )}
          </div>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="ebook, solar energy, guide, manual"
            className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-2 text-xs ${
              getFieldChange('tags', tags).isModified
                ? 'border-amber-500/70 ring-2 ring-amber-500/20 bg-amber-500/5'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          />
        </div>

        {/* PREVIEW & ACTIONS (Rule 2: Explicit Dynamic Action Button Labels) */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Preview Storefront Card</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                {cancelButtonText || (isEditMode ? 'Cancel & Return to Products' : 'Cancel')}
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving || (isDigital && !pdfUrl)}
              className={`w-full sm:w-auto px-6 py-2.5 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                isDigital
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:opacity-90'
              } disabled:opacity-50 cursor-pointer`}
            >
              {isSaving
                ? (isEditMode ? 'Saving Changes to Inventory...' : 'Publishing to Catalog...')
                : (submitButtonText || (isEditMode ? 'Save Changes' : (isDigital ? 'Publish Digital E-book' : 'Publish Product Document')))}
            </button>
          </div>
        </div>

      </form>

      {/* PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative text-left text-white">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-extrabold uppercase tracking-wider text-cyan-400">Storefront Product Card Preview</h4>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="relative aspect-4/3 w-full bg-slate-900">
                <img 
                  src={galleryImages[0]?.url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'} 
                  alt="Cover" 
                  className="w-full h-full object-cover" 
                />
                {isDigital && (
                  <span className="absolute top-3 left-3 bg-purple-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow flex items-center gap-1">
                    <BookOpen className="w-3 h-3 fill-current" /> Digital E-Book
                  </span>
                )}
              </div>

              <div className="p-4 space-y-2">
                <div className="text-[10px] text-purple-400 font-bold uppercase">{author || brand}</div>
                <h3 className="font-extrabold text-sm text-white line-clamp-2">{title || 'Untitled Book'}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2">{description || 'No description provided.'}</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="font-black text-base font-mono text-cyan-400">${price} USD</span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded font-bold">
                    {isDigital ? 'Instant PDF Delivery' : 'In Stock'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPreviewModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
