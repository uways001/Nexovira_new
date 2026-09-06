import React, { useState } from 'react';
import { CartItem, Order, CurrencyCode } from '../types';
import { getLiveExchangeRate } from '../lib/exchangeRateService';
import { X, CheckCircle2, ShieldCheck, CreditCard, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  createOrderInFirestore, 
  createSellerNotificationInFirestore, 
  getAffiliateProfileByCodeFromFirestore,
  getAffiliateConfigFromFirestore,
  recordOrderFinancialSnapshotsInFirestore,
  recordSellerOrderEarningsInFirestore
} from '../lib/firestoreService';
import { calculateOrderFinancials } from '../lib/affiliateEngine';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../lib/safeFetch';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderSuccess: (order: Order) => void;
  currentCurrency?: CurrencyCode;
}

// Dynamically load Paystack inline script if not already present in the window
const loadPaystackScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).PaystackPop) {
      resolve(true);
      return;
    }
    const existing = document.getElementById('paystack-inline-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onOrderSuccess,
  currentCurrency = 'NGN',
}) => {
  const { user, userProfile } = useAuth();
  const currency = (currentCurrency as CurrencyCode) || 'NGN';
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Address State
  const [fullName, setFullName] = useState(userProfile?.displayName || user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Lagos');
  const [country, setCountry] = useState('Nigeria');
  const [phone, setPhone] = useState(userProfile?.phone || '');

  if (!isOpen) return null;

  const isAllDigital = cartItems.length > 0 && cartItems.every(
    (item) => item.product.isDigital || item.product.productType === 'digital_ebook'
  );

  const subtotalUSD = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shippingFeeUSD = isAllDigital ? 0 : 35;
  const totalUSD = subtotalUSD + shippingFeeUSD;

  const liveRate = getLiveExchangeRate();
  const totalNGN = Math.round(totalUSD * liveRate);
  const subtotalNGN = Math.round(subtotalUSD * liveRate);
  const shippingFeeNGN = Math.round(shippingFeeUSD * liveRate);

  const handlePayWithPaystack = async () => {
    if (!email || !fullName || !street || !phone) {
      setPaymentError('Please fill in all recipient and delivery details.');
      setStep(1);
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);
    setProcessingStatus('Initializing secure Paystack payment session...');

    try {
      // Generate unique provisional order reference
      const tempOrderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 1. Call secure backend endpoint to initialize Paystack transaction
      const initResponse = await safeFetchJson<{
        authorization_url: string;
        access_code: string;
        reference: string;
        publicKey: string;
      }>('/api/v1/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount: totalNGN,
          orderId: tempOrderId,
          metadata: {
            customerName: fullName,
            phone,
            deliveryAddress: { street, city, country },
            itemsCount: cartItems.length,
            orderId: tempOrderId
          }
        })
      });

      if (!initResponse.ok || !initResponse.data) {
        throw new Error(initResponse.error || 'Failed to initialize Paystack session.');
      }

      const { reference, publicKey, authorization_url } = initResponse.data;

      // 2. Load Paystack inline SDK
      setProcessingStatus('Connecting to Paystack gateway...');
      const isScriptLoaded = await loadPaystackScript();

      if (isScriptLoaded && (window as any).PaystackPop) {
        // Open Paystack Inline Modal
        const handler = (window as any).PaystackPop.setup({
          key: publicKey,
          email: email,
          amount: Math.round(totalNGN * 100), // In kobo
          ref: reference,
          metadata: {
            custom_fields: [
              { display_name: 'Customer Name', variable_name: 'customer_name', value: fullName },
              { display_name: 'Phone Number', variable_name: 'phone_number', value: phone },
              { display_name: 'Order Reference', variable_name: 'order_reference', value: tempOrderId }
            ]
          },
          callback: async (response: { reference: string; status?: string }) => {
            // Payment reported by client — MANDATORY SERVER-SIDE VERIFICATION
            await verifyAndFinalizeOrder(response.reference || reference, tempOrderId);
          },
          onClose: () => {
            setIsProcessing(false);
            setProcessingStatus('');
            setPaymentError('Payment window was closed. Your order was not charged. You can retry anytime.');
          }
        });

        handler.openIframe();
      } else if (authorization_url) {
        // Fallback: Redirect to Paystack standard checkout page
        window.location.href = authorization_url;
      } else {
        throw new Error('Paystack inline SDK could not be loaded. Please check your internet connection.');
      }
    } catch (err: any) {
      console.error('Paystack initialization error:', err);
      setIsProcessing(false);
      setProcessingStatus('');
      setPaymentError(err.message || 'Payment processing failed. Please try again.');
    }
  };

  const verifyAndFinalizeOrder = async (paystackReference: string, orderId: string) => {
    setIsProcessing(true);
    setProcessingStatus('Verifying transaction securely with Paystack server...');

    try {
      // Call secure backend verification endpoint with secret key check
      const verifyRes = await safeFetchJson<{
        verified: boolean;
        data?: {
          status: string;
          reference: string;
          amount: number;
          currency: string;
          paid_at?: string;
          channel?: string;
        };
      }>('/api/v1/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: paystackReference,
          orderId
        })
      });

      if (!verifyRes.ok || !verifyRes.data?.verified) {
        throw new Error(verifyRes.error || 'Server-side payment verification failed. Payment was not confirmed.');
      }

      const verifiedData = verifyRes.data.data;
      setProcessingStatus('Payment verified! Recording order in Firestore...');

      // 1. Validate Affiliate attribution
      const refCode = sessionStorage.getItem('nexovira_ref_code') || localStorage.getItem('nexovira_ref_code');
      const expiresAtStr = localStorage.getItem('nexovira_ref_expires_at');
      const isExpired = expiresAtStr && Date.now() > Number(expiresAtStr);
      const validRefCode = (refCode && !isExpired) ? refCode.trim().toUpperCase() : undefined;

      let affiliateProfile = null;
      if (validRefCode) {
        affiliateProfile = await getAffiliateProfileByCodeFromFirestore(validRefCode);
      }
      const config = await getAffiliateConfigFromFirestore();

      const financials = calculateOrderFinancials(
        cartItems,
        config,
        affiliateProfile,
        user?.uid || null,
        email || null,
        shippingFeeUSD,
        0
      );

      // Construct verified order payload
      const orderPayload: Partial<Order> = {
        id: orderId,
        customerId: user?.uid || 'guest-shopper',
        customerName: fullName,
        customerEmail: email,
        items: cartItems,
        subtotal: financials.subtotal,
        shippingFee: financials.shippingFee,
        discount: financials.discount,
        total: financials.totalPayable,
        currency: 'USD',
        status: 'Paid',
        paymentStatus: 'successful',
        paymentMethod: 'Paystack',
        paystackReference: paystackReference,
        paidAt: verifiedData?.paid_at || new Date().toISOString(),
        shippingAddress: {
          fullName,
          street,
          city,
          country,
          phone
        },
        affiliateId: financials.affiliateId,
        affiliateCode: financials.affiliateCode,
        selfReferral: financials.selfReferral
      };

      // Save verified order into Firestore
      const newOrder = await createOrderInFirestore(orderPayload);
      setCreatedOrder(newOrder);

      // Record financial snapshots and earnings
      try {
        await recordOrderFinancialSnapshotsInFirestore(newOrder.id, financials);
        await recordSellerOrderEarningsInFirestore(newOrder, currency);
      } catch (err) {
        console.error('Financial logging notice:', err);
      }

      // Notify sellers
      try {
        const sellerItemsMap: Record<string, { sellerName: string; itemTitles: string[] }> = {};
        cartItems.forEach((item) => {
          const sId = item.product.sellerId || 'nexovira-admin';
          if (!sellerItemsMap[sId]) {
            sellerItemsMap[sId] = { sellerName: item.product.sellerName || 'Seller', itemTitles: [] };
          }
          sellerItemsMap[sId].itemTitles.push(`${item.product.title} (x${item.quantity})`);
        });

        for (const [sellerId, data] of Object.entries(sellerItemsMap)) {
          await createSellerNotificationInFirestore({
            userId: sellerId,
            title: 'New Paid Order via Paystack',
            message: `Order #${newOrder.id.slice(0, 8)} paid with Paystack (Ref: ${paystackReference}) by ${fullName}.`,
            type: 'order',
            orderId: newOrder.id
          });
        }
      } catch (notifErr) {
        console.error('Seller notification error:', notifErr);
      }

      onOrderSuccess(newOrder);
      setStep(4);
    } catch (err: any) {
      console.error('Order finalization error:', err);
      setPaymentError(err.message || 'Payment was received but order record failed. Please contact support with reference: ' + paystackReference);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl my-8 relative text-left">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute right-6 top-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>

        {step < 4 && (
          <div className="flex items-center gap-2 mb-6 text-xs font-bold text-slate-400">
            <span className={step >= 1 ? 'text-cyan-400' : ''}>1. Shipping Address</span>
            <span>&gt;</span>
            <span className={step >= 2 ? 'text-cyan-400' : ''}>2. Paystack Gateway</span>
            <span>&gt;</span>
            <span className={step >= 3 ? 'text-cyan-400' : ''}>3. Review & Pay</span>
          </div>
        )}

        {paymentError && (
          <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}

        {/* STEP 1: SHIPPING */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Delivery Information</h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  placeholder="e.g. Amina Bello"
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">Email Address (for Paystack receipt) *</label>
                <input
                  type="email"
                  value={email}
                  placeholder="name@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">Delivery Street Address *</label>
                <input
                  type="text"
                  value={street}
                  placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase">State / City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase">Phone Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    placeholder="08012345678"
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!fullName || !email || !street || !phone) {
                  setPaymentError('Please fill out all required delivery fields.');
                  return;
                }
                setPaymentError(null);
                setStep(2);
              }}
              className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold py-3 rounded-xl text-sm"
            >
              Continue to Payment Method
            </button>
          </div>
        )}

        {/* STEP 2: PAYMENT METHOD (PAYSTACK EXCLUSIVE) */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Payment Method</h2>
            
            <div className="p-4 rounded-2xl border border-cyan-500 bg-cyan-500/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Paystack (Official Gateway)</p>
                  <p className="text-slate-400 text-[11px]">Instant automated NGN checkout with 256-bit SSL encryption</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cyan-500/20 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Debit / Credit Cards</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Direct Bank Transfer</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>USSD & Bank QR</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>OPay & Apple Pay</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Payments are processed exclusively through Paystack with server-side validation.</span>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 bg-slate-800 text-white font-bold py-3 rounded-xl text-sm"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold py-3 rounded-xl text-sm"
              >
                Review Order & Amount
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & INITIATE */}
        {step === 3 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Review & Confirm Payment</h2>
            
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between font-bold text-white">
                <span>Subtotal ({cartItems.length} items):</span>
                <span>₦{subtotalNGN.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-400">
                <span>Priority Lagos Delivery:</span>
                <span>₦{shippingFeeNGN.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-black text-cyan-400 text-base pt-2 border-t border-slate-800">
                <span>Total Amount to Pay:</span>
                <span>₦{totalNGN.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-slate-500 text-right">
                Equivalent to ${totalUSD.toFixed(2)} USD at ₦{liveRate.toLocaleString()}/USD
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-slate-400">
              <p className="font-bold text-white">Delivery To:</p>
              <p>{fullName} • {phone}</p>
              <p>{street}, {city}, {country}</p>
              <p className="text-slate-500 text-[11px]">Confirmation receipt will be sent to: {email}</p>
            </div>

            <button
              onClick={handlePayWithPaystack}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{processingStatus || 'Connecting to Paystack...'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay ₦{totalNGN.toLocaleString()} with Paystack</span>
                </>
              )}
            </button>

            <button
              onClick={() => setStep(2)}
              disabled={isProcessing}
              className="w-full text-slate-400 hover:text-white py-2 font-bold text-xs"
            >
              Back to Payment Options
            </button>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-white">Payment Verified & Confirmed!</h2>
            <p className="text-slate-400 text-sm">
              Your payment has been verified by Paystack and recorded in Firestore.
            </p>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-1 font-mono text-slate-300 max-w-sm mx-auto">
              <p>Order ID: <span className="text-cyan-400 font-bold">{createdOrder?.id}</span></p>
              <p>Paystack Ref: <span className="text-emerald-400 font-bold">{createdOrder?.paystackReference}</span></p>
              <p>Status: <span className="text-emerald-400 font-bold">PAID (VERIFIED)</span></p>
            </div>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-xl text-sm"
            >
              Done & Return to Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
