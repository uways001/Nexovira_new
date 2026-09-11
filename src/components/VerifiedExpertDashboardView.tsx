import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Briefcase, 
  FileText, 
  DollarSign, 
  Star, 
  Users, 
  ExternalLink,
  ChevronRight,
  Shield,
  RefreshCw,
  Award,
  Terminal,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CurrencyCode } from '../types';
import { formatCurrency } from '../lib/currency';

interface VerifiedExpertDashboardViewProps {
  currentCurrency: CurrencyCode;
  onNavigate: (path: string) => void;
}

export const VerifiedExpertDashboardView: React.FC<VerifiedExpertDashboardViewProps> = ({
  currentCurrency,
  onNavigate
}) => {
  const { user, userProfile, isAdmin, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'credentials' | 'earnings'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);

  // Status computation
  const role = userProfile?.role || 'verified_expert_pending';
  const isApproved = role === 'verified_expert_approved' || role === 'expert' || isAdmin;
  const isPending = role === 'verified_expert_pending' || (!isApproved && role !== 'verified_expert_rejected');
  const isRejected = role === 'verified_expert_rejected';

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Administrator quick toggle to approve/reject for testing or administration
  const handleAdminToggleStatus = async (targetRole: 'verified_expert_approved' | 'verified_expert_pending' | 'verified_expert_rejected') => {
    if (!userProfile?.uid) return;
    setAdminActionLoading(true);
    setAdminActionMessage(null);
    try {
      const token = await user?.getIdToken().catch(() => '');
      const res = await fetch(`/api/v1/admin/users/${userProfile.uid}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || (isAdmin ? 'admin@nexovira.com' : ''),
          'x-user-role': isAdmin ? 'admin' : 'customer'
        },
        body: JSON.stringify({
          newRole: targetRole,
          newStatus: targetRole === 'verified_expert_approved' ? 'active' : targetRole === 'verified_expert_rejected' ? 'rejected' : 'pending',
          reason: `Admin status update to ${targetRole}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdminActionMessage(`Role updated to ${targetRole}. Refreshing profile...`);
        await refreshProfile();
      } else {
        setAdminActionMessage(data.message || 'Failed to update status.');
      }
    } catch (err: any) {
      setAdminActionMessage(err?.message || 'Error executing status change.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Card with Exact Required Title */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  Engineering & Technical Network
                </span>
                {isPending && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                    Pending Review
                  </span>
                )}
                {isApproved && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Verified & Active
                  </span>
                )}
                {isRejected && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    Application Rejected
                  </span>
                )}
              </div>

              {/* Exact Required Title */}
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Verified Expert Dashboard
              </h1>
              
              <p className="text-sm text-slate-400 max-w-2xl">
                {isPending && "Your application is currently under review by NEXOVIRA administration. Live project execution and client matching are disabled until verification is granted."}
                {isApproved && "Welcome to the approved engineering network. Manage client briefs, submit proposals, dispatch field services, and track verified disbursements."}
                {isRejected && "Your application was not approved during the technical screening. You may review the requirements and re-apply or contact technical support."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Sync Verification</span>
              </button>

              <button
                onClick={() => onNavigate('/services')}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20"
              >
                <span>Browse Client Hub</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PENDING REVIEW DASHBOARD VIEW (State: verified_expert_pending) */}
        {/* ========================================================================= */}
        {isPending && (
          <div className="space-y-6">
            {/* Warning Banner */}
            <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                  <Clock className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-amber-300">Pending Review Dashboard</h2>
                  <p className="text-xs text-amber-200/90 leading-relaxed max-w-3xl">
                    Thank you for applying as a Verified Technical Expert on NEXOVIRA Nigeria. Your profile and submitted credentials are currently undergoing technical credentialing and background review. During this review phase, approved expert capabilities are locked to maintain marketplace trust.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-amber-500/20 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Account Status</div>
                  <div className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    Under Admin Evaluation
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-amber-500/20 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Registered Email</div>
                  <div className="text-sm font-bold text-white truncate">{userProfile?.email || user?.email}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-amber-500/20 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Expected Review Time</div>
                  <div className="text-sm font-bold text-slate-200">Within 24-48 Business Hours</div>
                </div>
              </div>
            </div>

            {/* Locked Features Grid (Explicitly demonstrates that approved features cannot be accessed) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                Locked Features Pending Official Approval
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-800 text-slate-500">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Client Brief Matching</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Direct access to incoming customer service requests and hardware deployment jobs across Nigeria.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-800 text-slate-500">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Direct Client Messaging</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Private communication channels, project scope negotiations, and live diagnostics with clients.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-800 text-slate-500">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Escrow Payout Wallet</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Automated milestone releases, Paystack Nigerian bank account settlements, and tax invoices.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-800 text-slate-500">
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Verified Expert Badge</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Official blue verification checkmark displayed on your public provider profile across the marketplace.
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Credentials Review Summary */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Submitted Technical Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 font-semibold mb-1">Full Name</div>
                  <div className="text-white font-bold">{userProfile?.displayName || 'Technical Specialist'}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 font-semibold mb-1">Specialization</div>
                  <div className="text-white font-bold">Hardware & Software Engineering</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 font-semibold mb-1">Operating Region</div>
                  <div className="text-white font-bold">Lagos / Abuja / Remote Nigeria</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 font-semibold mb-1">Identity Status</div>
                  <div className="text-cyan-400 font-bold">Phone & Email Logged</div>
                </div>
              </div>
            </div>

            {/* Administrator Role Control Box (For authorized admins to approve or reject) */}
            {isAdmin && (
              <div className="p-6 rounded-3xl bg-slate-900 border border-purple-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Admin Evaluation Actions (Only Authorized Administrators)
                    </h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                    Admin Authenticated
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  As an authorized administrator, you can approve or reject this expert account. Approving grants immediate access to client matching and escrow payouts.
                </p>

                {adminActionMessage && (
                  <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/40 text-xs text-purple-200">
                    {adminActionMessage}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAdminToggleStatus('verified_expert_approved')}
                    disabled={adminActionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Verified Expert</span>
                  </button>

                  <button
                    onClick={() => handleAdminToggleStatus('verified_expert_rejected')}
                    disabled={adminActionLoading}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Application</span>
                  </button>

                  <button
                    onClick={() => handleAdminToggleStatus('verified_expert_pending')}
                    disabled={adminActionLoading}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <span>Reset to Pending</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* APPROVED EXPERT DASHBOARD VIEW (State: verified_expert_approved) */}
        {/* ========================================================================= */}
        {isApproved && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                  <span>Assigned Projects</span>
                  <Briefcase className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white">4 Active</div>
                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 2 Completed this month
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                  <span>Escrow Earnings</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {formatCurrency(1850, currentCurrency)}
                </div>
                <div className="text-xs text-slate-400">Ready for Paystack settlement</div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                  <span>Quality Score</span>
                  <Star className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white flex items-center gap-1">
                  <span>4.95</span>
                  <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                </div>
                <div className="text-xs text-amber-300">Top 5% Verified Provider</div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                  <span>Verification Status</span>
                  <Award className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6" /> Approved
                </div>
                <div className="text-xs text-slate-400">Tier 1 Master Engineer</div>
              </div>
            </div>

            {/* Active Client Briefs & Service Requests */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Available Client Briefs & Projects</h3>
                  <p className="text-xs text-slate-400">High-priority engineering projects matched to your skill profile</p>
                </div>
                <button
                  onClick={() => onNavigate('/book-service')}
                  className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/30 transition-colors"
                >
                  View All Briefs
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-cyan-500/20 text-cyan-300">
                        Smart Home / IoT
                      </span>
                      <span className="text-xs text-slate-500">Lekki Phase 1, Lagos</span>
                    </div>
                    <h4 className="text-base font-bold text-white">Automated Solar Inverter & Smart Energy Monitoring Setup</h4>
                    <p className="text-xs text-slate-400">Client requires installation of remote power telemetry and failover backup battery monitoring.</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-black text-white">{formatCurrency(450, currentCurrency)}</div>
                      <div className="text-[10px] text-emerald-400 font-medium">Escrow Protected</div>
                    </div>
                    <button
                      onClick={() => alert('Proposal initiated for Client Project.')}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Accept Project
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-purple-500/20 text-purple-300">
                        Cloud & DevOps
                      </span>
                      <span className="text-xs text-slate-500">Abuja / Remote</span>
                    </div>
                    <h4 className="text-base font-bold text-white">Full-Stack Production Migration & High Availability Setup</h4>
                    <p className="text-xs text-slate-400">Migrating legacy monolithic inventory system to containerized microservices with SSL/TLS.</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-black text-white">{formatCurrency(1200, currentCurrency)}</div>
                      <div className="text-[10px] text-emerald-400 font-medium">Escrow Protected</div>
                    </div>
                    <button
                      onClick={() => alert('Proposal initiated for Client Project.')}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Accept Project
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* REJECTED DASHBOARD VIEW (State: verified_expert_rejected) */}
        {/* ========================================================================= */}
        {isRejected && (
          <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-rose-300">Application Not Approved</h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                  We appreciate your interest in becoming a Verified Technical Expert on NEXOVIRA. At this time, your application did not meet the required technical verification threshold or regional licensing criteria.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => onNavigate('/contact')}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                  >
                    Contact Support / Appeal
                  </button>
                  <button
                    onClick={() => onNavigate('/')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                  >
                    Return to Marketplace
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
