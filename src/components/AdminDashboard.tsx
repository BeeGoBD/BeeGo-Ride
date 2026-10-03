import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Bike,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  LogOut,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  FileText,
  Lock,
  ExternalLink,
  ChevronRight,
  Shield,
  Smartphone,
  Flag,
  Trash2,
  CheckSquare,
  RotateCcw,
  Plus,
} from 'lucide-react';
import {
  AdminDriverRecord,
  AdminPassengerRecord,
  AdminRestrictionRecord,
  AdminStats,
  IncidentReport,
  fetchAdminStats,
  fetchAdminDrivers,
  updateDriverVerification,
  createAdminDriver,
  fetchAdminPassengers,
  fetchRestrictedAccounts,
  addRestriction,
  removeRestriction,
  fetchAdminReports,
  updateReportAction,
  logoutAdmin,
} from '../services/adminService';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';

interface AdminDashboardProps {
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'drivers' | 'passengers' | 'restricted' | 'reports'>('pending');

  // Data states
  const [stats, setStats] = useState<AdminStats>({
    pendingDrivers: 0,
    approvedDrivers: 0,
    rejectedDrivers: 0,
    totalDrivers: 0,
    totalPassengers: 0,
    totalRestricted: 0,
    totalReports: 0,
    pendingReports: 0,
  });
  const [drivers, setDrivers] = useState<AdminDriverRecord[]>([]);
  const [passengers, setPassengers] = useState<AdminPassengerRecord[]>([]);
  const [restrictions, setRestrictions] = useState<AdminRestrictionRecord[]>([]);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'released' | 'bin'>('all');
  const [isActingOnReport, setIsActingOnReport] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Selected driver for full dossier modal (inspection 1000 times)
  const [selectedDriver, setSelectedDriver] = useState<AdminDriverRecord | null>(null);

  // Full-size image preview lightbox modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Restriction modal state
  const [restrictTarget, setRestrictTarget] = useState<{
    type: 'driver' | 'passenger';
    id: string;
    name: string;
    phone: string;
    email?: string;
  } | null>(null);
  const [restrictionReason, setRestrictionReason] = useState('');

  // Manual driver onboarding state
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverAltPhone, setNewDriverAltPhone] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('driver123');
  const [newDriverVehicle, setNewDriverVehicle] = useState('Voltx Eco Speed Bike (Electric)');
  const [newDriverPlate, setNewDriverPlate] = useState('Dhaka Metro-Ha 45-8921');
  const [newDriverNid, setNewDriverNid] = useState('');
  const [newDriverStatus, setNewDriverStatus] = useState<'approved' | 'pending'>('approved');
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);
  const [addDriverError, setAddDriverError] = useState<string | null>(null);

  const handleManualCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim() || !newDriverPhone.trim()) {
      setAddDriverError('Name and primary phone number are required.');
      return;
    }
    setIsCreatingDriver(true);
    setAddDriverError(null);
    try {
      const created = await createAdminDriver({
        name: newDriverName.trim(),
        phone: newDriverPhone.trim(),
        secondaryPhone: newDriverAltPhone.trim() || undefined,
        email: newDriverEmail.trim().toLowerCase() || undefined,
        password: newDriverPassword || 'driver123',
        vehicleModel: newDriverVehicle,
        plateNumber: newDriverPlate,
        nidNumber: newDriverNid.trim(),
        status: newDriverStatus,
        notes: `Manually registered by admin (${newDriverStatus}).`,
      });
      setIsCreatingDriver(false);
      setIsAddDriverModalOpen(false);
      setNewDriverName('');
      setNewDriverPhone('');
      setNewDriverAltPhone('');
      setNewDriverEmail('');
      silentSync();
      alert(`Driver ${created.name} registered successfully as ${newDriverStatus}! ${newDriverStatus === 'approved' ? 'They can now log in immediately with phone ' + newDriverPhone + ' and password ' + (newDriverPassword || 'driver123') : 'Awaiting review.'}`);
    } catch (err: any) {
      setIsCreatingDriver(false);
      setAddDriverError(err.message || 'Failed to manually register driver.');
    }
  };

  // Silent background auto-refresh ref
  const isFetchingRef = useRef(false);

  // Silent sync helper: runs quietly every second without UI blinking
  const silentSync = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [sData, dData, pData, rData, repData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminDrivers(),
        fetchAdminPassengers(),
        fetchRestrictedAccounts(),
        fetchAdminReports(),
      ]);

      setStats(sData);
      setDrivers(dData);
      setPassengers(pData);
      setRestrictions(rData);
      setReports(repData);

      // Keep selected driver in sync if opened
      if (selectedDriver) {
        const found = dData.find((d) => d.id === selectedDriver.id);
        if (found) setSelectedDriver(found);
      }
    } catch (e) {
      // Silent catch
    } finally {
      isFetchingRef.current = false;
    }
  };

  // 1-second silent auto-refresh interval (no blinking)
  useEffect(() => {
    silentSync();
    const interval = setInterval(() => {
      silentSync();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Approve Driver
  const handleApproveDriver = async (driverId: string) => {
    try {
      const updated = await updateDriverVerification(driverId, 'approved');
      setDrivers((prev) => prev.map((d) => (d.id === driverId ? updated : d)));
      silentSync();
    } catch (err: any) {
      alert(err.message || 'Failed to approve driver.');
    }
  };

  // Handle Reject Driver
  const handleRejectDriver = async (driverId: string) => {
    const reason = window.prompt('Enter reason for driver rejection (optional):', 'Documents could not be verified.');
    if (reason === null) return; // user cancelled prompt
    try {
      const updated = await updateDriverVerification(driverId, 'rejected', reason);
      setDrivers((prev) => prev.map((d) => (d.id === driverId ? updated : d)));
      silentSync();
    } catch (err: any) {
      alert(err.message || 'Failed to reject driver.');
    }
  };

  // Confirm restriction
  const handleConfirmRestriction = async () => {
    if (!restrictTarget) return;
    try {
      await addRestriction({
        targetType: restrictTarget.type,
        targetId: restrictTarget.id,
        name: restrictTarget.name,
        phone: restrictTarget.phone,
        email: restrictTarget.email,
        reason: restrictionReason || 'Restricted by Admin for policy violation.',
      });
      setRestrictTarget(null);
      setRestrictionReason('');
      silentSync();
    } catch (err: any) {
      alert(err.message || 'Failed to restrict account.');
    }
  };

  // Handle Unrestrict
  const handleUnrestrict = async (r: AdminRestrictionRecord) => {
    if (!window.confirm(`Are you sure you want to unrestrict ${r.name}?`)) return;
    try {
      await removeRestriction({
        id: r.id,
        targetId: r.targetId,
        phone: r.phone,
        email: r.email,
      });
      silentSync();
    } catch (err: any) {
      alert(err.message || 'Failed to unrestrict account.');
    }
  };

  // Handle Incident Report Action (resolve, release, bin, restore, or delete)
  const handleReportAction = async (
    reportId: string,
    action: 'resolve' | 'release' | 'bin' | 'restore' | 'delete'
  ) => {
    let confirmMsg = '';
    if (action === 'delete') confirmMsg = 'Are you sure you want to permanently delete this report?';
    else if (action === 'bin') confirmMsg = 'Move this report to Bin (dismiss/delete without issue)?';
    else if (action === 'restore') confirmMsg = 'Restore this report to pending review?';
    else if (action === 'release') confirmMsg = 'Release this report without penalty (checked and found nothing guilty)?';
    else confirmMsg = 'Mark this report as approved / completed?';

    if (!window.confirm(confirmMsg)) return;

    setIsActingOnReport(reportId);
    try {
      await updateReportAction(reportId, action);
      if (action === 'delete') {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
      } else {
        const nextStatus =
          action === 'bin'
            ? 'bin'
            : action === 'restore'
            ? 'pending'
            : action === 'resolve'
            ? 'resolved'
            : 'released';
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, status: nextStatus, updatedAt: Date.now() } : r
          )
        );
      }
      silentSync();
    } catch (err: any) {
      alert(err.message || 'Failed to update report.');
    } finally {
      setIsActingOnReport(null);
    }
  };

  // Filtered drivers & passengers & restrictions
  const cleanSearch = searchQuery.trim().toLowerCase();

  const filteredReports = reports.filter((r) => {
    if (reportFilter !== 'all' && r.status !== reportFilter) return false;
    if (!cleanSearch) return true;
    return (
      r.reporterName.toLowerCase().includes(cleanSearch) ||
      r.reportedName.toLowerCase().includes(cleanSearch) ||
      (r.reportedPhone && r.reportedPhone.includes(cleanSearch)) ||
      r.category.toLowerCase().includes(cleanSearch) ||
      r.description.toLowerCase().includes(cleanSearch) ||
      (r.rideId && r.rideId.toLowerCase().includes(cleanSearch))
    );
  });

  const pendingDrivers = drivers.filter(
    (d) => d.verificationStatus === 'pending' || d.verificationStatus === ('under_review' as any)
  ).filter((d) => {
    if (!cleanSearch) return true;
    return (
      d.name.toLowerCase().includes(cleanSearch) ||
      d.phone.includes(cleanSearch) ||
      (d.secondaryPhone && d.secondaryPhone.includes(cleanSearch)) ||
      d.email.toLowerCase().includes(cleanSearch)
    );
  });

  const approvedDrivers = drivers.filter((d) => d.verificationStatus === 'approved').filter((d) => {
    if (!cleanSearch) return true;
    return (
      d.name.toLowerCase().includes(cleanSearch) ||
      d.phone.includes(cleanSearch) ||
      d.email.toLowerCase().includes(cleanSearch) ||
      d.plateNumber.toLowerCase().includes(cleanSearch)
    );
  });

  const filteredPassengers = passengers.filter((p) => {
    if (!cleanSearch) return true;
    return (
      p.name.toLowerCase().includes(cleanSearch) ||
      (p.phone && p.phone.includes(cleanSearch)) ||
      p.email.toLowerCase().includes(cleanSearch)
    );
  });

  const filteredRestrictions = restrictions.filter((r) => {
    if (!cleanSearch) return true;
    return (
      r.name.toLowerCase().includes(cleanSearch) ||
      r.phone.includes(cleanSearch) ||
      (r.email && r.email.toLowerCase().includes(cleanSearch)) ||
      r.reason.toLowerCase().includes(cleanSearch)
    );
  });

  return (
    <div className="w-full h-full min-h-[100dvh] bg-[#0E1015] text-zinc-100 flex flex-col overflow-y-auto no-scrollbar select-none font-sans">
      {/* 1. TOP SECURE BAR */}
      <header className="sticky top-0 z-40 w-full bg-[#141720]/95 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BeeGoVoltxLogo size="sm" />
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#F5C518] bg-[#F5C518]/10 border border-[#F5C518]/30 px-2 py-0.5 rounded-md">
              Operations Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Silent Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Sync</span>
          </div>

          {/* Exit Admin */}
          <button
            type="button"
            onClick={() => {
              logoutAdmin();
              onExit();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Admin</span>
          </button>
        </div>
      </header>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="p-4 sm:p-5 max-w-4xl mx-auto w-full space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Tile 1: Pending Drivers */}
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-500/10 border-[#F5C518] shadow-md shadow-amber-500/10'
                : 'bg-[#181C26] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-amber-400 tracking-wider">
                Pending Requests
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.pendingDrivers}
            </div>
          </button>

          {/* Tile 2: Approved Drivers */}
          <button
            type="button"
            onClick={() => setActiveTab('drivers')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'drivers'
                ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                : 'bg-[#181C26] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-emerald-400 tracking-wider">
                Active Drivers
              </span>
              <Bike className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.approvedDrivers}
            </div>
          </button>

          {/* Tile 3: Passenger Directory */}
          <button
            type="button"
            onClick={() => setActiveTab('passengers')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'passengers'
                ? 'bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/10'
                : 'bg-[#181C26] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-blue-400 tracking-wider">
                Passengers
              </span>
              <Users className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.totalPassengers}
            </div>
          </button>

          {/* Tile 4: Incident Reports */}
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-purple-500/10 border-purple-500 shadow-md shadow-purple-500/10'
                : 'bg-[#181C26] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-purple-400 tracking-wider">
                Reports ({reports.filter((r) => r.status === 'pending').length} new)
              </span>
              <Flag className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {reports.length}
            </div>
          </button>

          {/* Tile 5: Restricted Accounts */}
          <button
            type="button"
            onClick={() => setActiveTab('restricted')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'restricted'
                ? 'bg-rose-500/10 border-rose-500 shadow-md shadow-rose-500/10'
                : 'bg-[#181C26] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-rose-400 tracking-wider">
                Restricted Users
              </span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.totalRestricted}
            </div>
          </button>
        </div>

        {/* 3. SEARCH BAR & NAVIGATION TABS */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-1">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#141720] border border-zinc-800 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'pending'
                  ? 'bg-[#F5C518] text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Driver Requests ({stats.pendingDrivers})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('drivers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'drivers'
                  ? 'bg-[#F5C518] text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Driver List ({stats.approvedDrivers})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('passengers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'passengers'
                  ? 'bg-[#F5C518] text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Passenger List ({stats.totalPassengers})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'reports'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Flag className="w-3 h-3" />
              <span>Reports ({reports.filter((r) => r.status === 'pending').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('restricted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'restricted'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Restricted ({stats.totalRestricted})
            </button>
          </div>

          {/* Search Box & Quick Action */}
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by phone or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#141720] border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:border-[#F5C518] focus:outline-hidden transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsAddDriverModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Onboard Driver</span>
            </button>
          </div>
        </div>

        {/* 4. TAB CONTENTS */}

        {/* TAB 1: PENDING DRIVER REQUESTS */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {/* Explanatory Manual Verification Queue Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F5C518] text-black flex items-center justify-center shrink-0 font-black">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-black text-[#F5C518]">Manual Driver Verification & Approval Queue</div>
                <div className="text-zinc-300 mt-0.5 leading-relaxed">
                  Driver onboarding is strictly manual. When drivers submit a registration request, they appear below. Review their NID & photos, then click <span className="text-emerald-400 font-bold">Approve Driver</span>. Once approved, the driver can log in immediately.
                </div>
              </div>
            </div>
            {pendingDrivers.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#141720] border border-zinc-800/80 text-center flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">All Clear</h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  There are no pending driver applications awaiting review right now.
                </p>
              </div>
            ) : (
              pendingDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="p-4 sm:p-5 rounded-3xl bg-[#141720] border border-zinc-800 hover:border-zinc-700 shadow-md flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-3">
                      {/* Driver Avatar / Selfie */}
                      {driver.selfieUrl ? (
                        <img
                          src={driver.selfieUrl}
                          alt={driver.name}
                          onClick={() => setPreviewImage({ url: driver.selfieUrl!, title: `${driver.name} - Selfie` })}
                          className="w-12 h-12 rounded-2xl object-cover border border-amber-400/40 cursor-pointer hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-[#F5C518] font-black text-sm">
                          {driver.name.charAt(0)}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white">{driver.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Awaiting Review
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-400">
                          <span className="flex items-center gap-1 font-mono text-zinc-300">
                            <Phone className="w-3 h-3 text-[#F5C518]" />
                            {driver.phone}
                          </span>
                          {driver.secondaryPhone && (
                            <span className="flex items-center gap-1 font-mono text-zinc-400 text-[11px]">
                              <span>Alt:</span>
                              {driver.secondaryPhone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-zinc-500" />
                            {driver.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] font-mono text-zinc-500">
                      <span>Submitted: {driver.submittedAtFormatted || 'Recent'}</span>
                    </div>
                  </div>

                  {/* Document previews: NID Front, NID Back, Selfie */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-[#0E1015] border border-zinc-800/80">
                    <div
                      onClick={() =>
                        driver.nidFrontUrl &&
                        setPreviewImage({ url: driver.nidFrontUrl, title: `${driver.name} - NID Front` })
                      }
                      className="cursor-pointer group flex flex-col items-center gap-1 text-center"
                    >
                      <span className="text-[10px] font-bold text-zinc-400 group-hover:text-[#F5C518] transition-colors">
                        NID Front
                      </span>
                      {driver.nidFrontUrl ? (
                        <img
                          src={driver.nidFrontUrl}
                          alt="NID Front"
                          className="w-full h-20 rounded-xl object-cover border border-zinc-700 group-hover:border-[#F5C518] transition-all"
                        />
                      ) : (
                        <div className="w-full h-20 rounded-xl bg-zinc-900 border border-dashed border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
                          No Photo
                        </div>
                      )}
                    </div>

                    <div
                      onClick={() =>
                        driver.nidBackUrl &&
                        setPreviewImage({ url: driver.nidBackUrl, title: `${driver.name} - NID Back` })
                      }
                      className="cursor-pointer group flex flex-col items-center gap-1 text-center"
                    >
                      <span className="text-[10px] font-bold text-zinc-400 group-hover:text-[#F5C518] transition-colors">
                        NID Back
                      </span>
                      {driver.nidBackUrl ? (
                        <img
                          src={driver.nidBackUrl}
                          alt="NID Back"
                          className="w-full h-20 rounded-xl object-cover border border-zinc-700 group-hover:border-[#F5C518] transition-all"
                        />
                      ) : (
                        <div className="w-full h-20 rounded-xl bg-zinc-900 border border-dashed border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
                          No Photo
                        </div>
                      )}
                    </div>

                    <div
                      onClick={() =>
                        driver.selfieUrl &&
                        setPreviewImage({ url: driver.selfieUrl, title: `${driver.name} - Driver Selfie` })
                      }
                      className="cursor-pointer group flex flex-col items-center gap-1 text-center"
                    >
                      <span className="text-[10px] font-bold text-zinc-400 group-hover:text-[#F5C518] transition-colors">
                        Driver Selfie
                      </span>
                      {driver.selfieUrl ? (
                        <img
                          src={driver.selfieUrl}
                          alt="Selfie"
                          className="w-full h-20 rounded-xl object-cover border border-zinc-700 group-hover:border-[#F5C518] transition-all"
                        />
                      ) : (
                        <div className="w-full h-20 rounded-xl bg-zinc-900 border border-dashed border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
                          No Photo
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setSelectedDriver(driver)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#F5C518]" />
                      <span>Full Dossier</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRejectDriver(driver.id)}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveDriver(driver.id)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-600/30"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Driver</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE DRIVER DIRECTORY */}
        {activeTab === 'drivers' && (
          <div className="space-y-3">
            {approvedDrivers.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#141720] border border-zinc-800/80 text-center flex flex-col items-center justify-center gap-2">
                <Bike className="w-10 h-10 text-zinc-500" />
                <h3 className="text-sm font-bold text-white">No Approved Drivers</h3>
                <p className="text-xs text-zinc-400">
                  Approved drivers will be displayed here for continuous verification.
                </p>
              </div>
            ) : (
              approvedDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="p-4 rounded-3xl bg-[#141720] border border-zinc-800 hover:border-zinc-700 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    {driver.selfieUrl ? (
                      <img
                        src={driver.selfieUrl}
                        alt={driver.name}
                        onClick={() => setSelectedDriver(driver)}
                        className="w-11 h-11 rounded-2xl object-cover border border-emerald-500/40 cursor-pointer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400 font-black text-sm">
                        {driver.name.charAt(0)}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{driver.name}</span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.2 rounded-full">
                          Verified
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400 mt-0.5">
                        <span className="font-mono text-zinc-300">{driver.phone}</span>
                        <span>•</span>
                        <span className="text-zinc-500">{driver.vehicleModel}</span>
                        <span className="font-mono text-zinc-400">({driver.plateNumber})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDriver(driver)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#F5C518]" />
                      <span>Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setRestrictTarget({
                          type: 'driver',
                          id: driver.id,
                          name: driver.name,
                          phone: driver.phone,
                          email: driver.email,
                        })
                      }
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Restrict</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: PASSENGER DIRECTORY (Name & Number Only as requested) */}
        {activeTab === 'passengers' && (
          <div className="space-y-3">
            {filteredPassengers.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#141720] border border-zinc-800/80 text-center flex flex-col items-center justify-center gap-2">
                <Users className="w-10 h-10 text-zinc-500" />
                <h3 className="text-sm font-bold text-white">No Passengers Found</h3>
                <p className="text-xs text-zinc-400">
                  Registered passengers will appear in this list.
                </p>
              </div>
            ) : (
              filteredPassengers.map((passenger) => (
                <div
                  key={passenger.id}
                  className="p-3.5 px-4 rounded-2xl bg-[#141720] border border-zinc-800 hover:border-zinc-700 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs">
                      {passenger.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{passenger.name}</span>
                        {passenger.isRestricted && (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/40">
                            Restricted
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                        <span>{passenger.phone || passenger.email}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {!passenger.isRestricted ? (
                      <button
                        type="button"
                        onClick={() =>
                          setRestrictTarget({
                            type: 'passenger',
                            id: passenger.id,
                            name: passenger.name,
                            phone: passenger.phone || '',
                            email: passenger.email,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
                      >
                        Restrict
                      </button>
                    ) : (
                      <span className="text-xs text-rose-400 font-bold px-2">Blocked</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: RESTRICTED ACCOUNTS DIRECTORY */}
        {activeTab === 'restricted' && (
          <div className="space-y-3">
            {filteredRestrictions.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#141720] border border-zinc-800/80 text-center flex flex-col items-center justify-center gap-2">
                <ShieldCheck className="w-10 h-10 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">No Restricted Accounts</h3>
                <p className="text-xs text-zinc-400">
                  There are currently no restricted passengers or drivers on file.
                </p>
              </div>
            ) : (
              filteredRestrictions.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-3xl bg-[#141720] border border-rose-900/30 hover:border-rose-900/60 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-400 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{item.name}</span>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-800/60">
                          {item.targetType}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">
                        {item.phone || item.email}
                      </div>
                      <p className="text-xs text-rose-300/80 mt-1 italic">
                        Reason: "{item.reason}"
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUnrestrict(item)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 text-emerald-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Unrestrict</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 5: INCIDENT REPORTS & SAFETY AUDITS */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {/* Filter pills: All, Pending, Completed/Approved, Released, Bin/Deleted */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-[#141720] border border-zinc-800/80 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setReportFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  reportFilter === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Reports ({reports.length})
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  reportFilter === 'pending'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Pending Review ({reports.filter((r) => r.status === 'pending').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('resolved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  reportFilter === 'resolved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Completed / Approved ({reports.filter((r) => r.status === 'resolved').length})
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('released')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  reportFilter === 'released'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Released / No Fault ({reports.filter((r) => r.status === 'released').length})
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('bin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  reportFilter === 'bin'
                    ? 'bg-zinc-700 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bin / Deleted ({reports.filter((r) => r.status === 'bin').length})</span>
              </button>
            </div>

            {/* List of Reports */}
            {filteredReports.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#141720] border border-zinc-800/80 text-center flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-purple-400" />
                <h3 className="text-sm font-bold text-white">No Reports Found</h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  {reportFilter === 'all'
                    ? 'There are no incident reports logged in the system.'
                    : `No reports currently in the "${reportFilter}" status.`}
                </p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="p-5 rounded-3xl bg-[#141720] border border-zinc-800 hover:border-zinc-700 shadow-lg flex flex-col gap-4 transition-all"
                >
                  {/* Top Bar: Status, Category, Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800/70">
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      {report.status === 'pending' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Pending Review
                        </span>
                      )}
                      {report.status === 'resolved' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Completed / Approved
                        </span>
                      )}
                      {report.status === 'released' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                          Released (No Fault Found)
                        </span>
                      )}
                      {report.status === 'bin' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                          Bin / Dismissed Without Issue
                        </span>
                      )}

                      {/* Category Badge */}
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800/50">
                        {report.category}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-500">
                      {new Date(report.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {report.rideId && ` • Ride: ${report.rideId}`}
                    </div>
                  </div>

                  {/* Parties Info: Reporter vs Reported */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Reported Target Box */}
                    <div className="p-3.5 rounded-2xl bg-[#0E1015] border border-rose-900/30 space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-rose-400 flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        Accused / Reported Person ({report.reportedRole})
                      </span>
                      <div className="text-sm font-black text-white mt-0.5">
                        {report.reportedName}
                      </div>
                      <div className="flex items-center gap-2 pt-1 font-mono text-zinc-300">
                        <Phone className="w-3.5 h-3.5 text-[#F5C518]" />
                        <span>{report.reportedPhone || 'No phone recorded'}</span>
                        {report.reportedPhone && (
                          <a
                            href={`tel:${report.reportedPhone}`}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[#F5C518]"
                          >
                            Call
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Reporter Box */}
                    <div className="p-3.5 rounded-2xl bg-[#0E1015] border border-zinc-800/80 space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400">
                        Filed by ({report.reporterRole})
                      </span>
                      <div className="text-sm font-black text-white mt-0.5">
                        {report.reporterName}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 pt-1">
                        ID: {report.reporterId}
                      </div>
                    </div>
                  </div>

                  {/* Incident Description */}
                  <div className="p-3.5 rounded-2xl bg-[#0E1015] border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400">
                      Report Details / What Happened:
                    </span>
                    <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      "{report.description}"
                    </p>
                  </div>

                  {/* Admin Audit & Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-zinc-800/80">
                    {/* Left: Quick Restrict */}
                    {report.status !== 'bin' ? (
                      <button
                        type="button"
                        onClick={() =>
                          setRestrictTarget({
                            type: report.reportedRole,
                            id: report.reportedId,
                            name: report.reportedName,
                            phone: report.reportedPhone || '',
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Restrict {report.reportedName}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-zinc-500 italic">
                        Report moved to bin / dismissed
                      </span>
                    )}

                    {/* Right: Release / Complete / Bin / Delete */}
                    <div className="flex items-center gap-2">
                      {report.status === 'bin' ? (
                        <>
                          {/* Restore from bin */}
                          <button
                            type="button"
                            disabled={isActingOnReport === report.id}
                            onClick={() => handleReportAction(report.id, 'restore')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/50 text-amber-300 text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Restore report back to pending review"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                            <span>Restore to Pending</span>
                          </button>

                          {/* Delete permanently */}
                          <button
                            type="button"
                            disabled={isActingOnReport === report.id}
                            onClick={() => handleReportAction(report.id, 'delete')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Permanently remove report from database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Permanent Delete</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Release without penalty */}
                          {report.status !== 'released' && (
                            <button
                              type="button"
                              disabled={isActingOnReport === report.id}
                              onClick={() => handleReportAction(report.id, 'release')}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/50 text-sky-300 text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                              title="Release without penalty: Checked and found nothing guilty"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                              <span>Release (No Fault)</span>
                            </button>
                          )}

                          {/* Complete / Resolve */}
                          {report.status !== 'resolved' && (
                            <button
                              type="button"
                              disabled={isActingOnReport === report.id}
                              onClick={() => handleReportAction(report.id, 'resolve')}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 text-emerald-300 text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Mark Completed</span>
                            </button>
                          )}

                          {/* Move to Bin */}
                          <button
                            type="button"
                            disabled={isActingOnReport === report.id}
                            onClick={() => handleReportAction(report.id, 'bin')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Move to bin / delete without penalty or issue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Bin Report</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 5. FULL DOSSIER INSPECTION MODAL (Inspect 1000 Times) */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141720] border border-zinc-800 rounded-3xl p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto no-scrollbar space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[#F5C518] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Driver Dossier</h3>
                  <p className="text-xs text-zinc-400 font-mono">ID: {selectedDriver.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Core Info Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#0E1015] border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Full Name</span>
                <div className="font-bold text-white mt-0.5">{selectedDriver.name}</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#0E1015] border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Verification Status</span>
                <div className="font-bold text-amber-400 mt-0.5 uppercase tracking-wider text-[11px]">
                  {selectedDriver.verificationStatus}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#0E1015] border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Primary Contact (Client Calls)</span>
                <div className="font-bold font-mono text-[#F5C518] mt-0.5">{selectedDriver.phone}</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#0E1015] border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Secondary / Emergency Phone</span>
                <div className="font-bold font-mono text-zinc-300 mt-0.5">
                  {selectedDriver.secondaryPhone || 'Not provided'}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#0E1015] border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Email Address</span>
                <div className="font-bold text-zinc-300 mt-0.5 truncate">{selectedDriver.email}</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#0E1015] border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Vehicle & Plate</span>
                <div className="font-bold text-zinc-300 mt-0.5">
                  {selectedDriver.vehicleModel} • {selectedDriver.plateNumber}
                </div>
              </div>
            </div>

            {/* Photos & Document inspection */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 pl-1">
                Submitted Documentation (Click to enlarge)
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <div
                  onClick={() =>
                    selectedDriver.nidFrontUrl &&
                    setPreviewImage({ url: selectedDriver.nidFrontUrl, title: `${selectedDriver.name} - NID Front` })
                  }
                  className="cursor-pointer group flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] font-bold text-zinc-400">NID Front</span>
                  {selectedDriver.nidFrontUrl ? (
                    <img
                      src={selectedDriver.nidFrontUrl}
                      alt="NID Front"
                      className="w-full h-24 rounded-2xl object-cover border border-zinc-700 group-hover:border-[#F5C518] transition-all"
                    />
                  ) : (
                    <div className="w-full h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-600">
                      N/A
                    </div>
                  )}
                </div>

                <div
                  onClick={() =>
                    selectedDriver.nidBackUrl &&
                    setPreviewImage({ url: selectedDriver.nidBackUrl, title: `${selectedDriver.name} - NID Back` })
                  }
                  className="cursor-pointer group flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] font-bold text-zinc-400">NID Back</span>
                  {selectedDriver.nidBackUrl ? (
                    <img
                      src={selectedDriver.nidBackUrl}
                      alt="NID Back"
                      className="w-full h-24 rounded-2xl object-cover border border-zinc-700 group-hover:border-[#F5C518] transition-all"
                    />
                  ) : (
                    <div className="w-full h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-600">
                      N/A
                    </div>
                  )}
                </div>

                <div
                  onClick={() =>
                    selectedDriver.selfieUrl &&
                    setPreviewImage({ url: selectedDriver.selfieUrl, title: `${selectedDriver.name} - Driver Selfie` })
                  }
                  className="cursor-pointer group flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] font-bold text-zinc-400">Driver Selfie</span>
                  {selectedDriver.selfieUrl ? (
                    <img
                      src={selectedDriver.selfieUrl}
                      alt="Selfie"
                      className="w-full h-24 rounded-2xl object-cover border border-zinc-700 group-hover:border-[#F5C518] transition-all"
                    />
                  ) : (
                    <div className="w-full h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-600">
                      N/A
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action in Dossier Modal */}
            <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
              >
                Close Dossier
              </button>

              <div className="flex items-center gap-2">
                {selectedDriver.verificationStatus !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApproveDriver(selectedDriver.id);
                      setSelectedDriver(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer"
                  >
                    Approve Driver
                  </button>
                )}
                {selectedDriver.verificationStatus !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRejectDriver(selectedDriver.id);
                      setSelectedDriver(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. FULL-SCREEN LIGHTBOX IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="max-w-2xl w-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-zinc-300">
              <span className="text-sm font-bold">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain border border-zinc-800"
            />
          </div>
        </div>
      )}

      {/* 7. RESTRICTION REASON CONFIRMATION MODAL */}
      {restrictTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#141720] border border-rose-900/50 rounded-3xl p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-white">Restrict Account</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Restricting <span className="text-white font-bold">{restrictTarget.name}</span> will instantly block them from accessing or logging in to the application.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400">Restriction Reason</label>
              <textarea
                rows={2}
                value={restrictionReason}
                onChange={(e) => setRestrictionReason(e.target.value)}
                placeholder="Spam behavior, violation of platform terms..."
                className="w-full p-2.5 rounded-xl bg-[#0E1015] border border-zinc-800 text-xs text-white focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setRestrictTarget(null)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestriction}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer shadow-md shadow-rose-600/30"
              >
                Confirm Restriction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MANUAL DRIVER ONBOARDING MODAL */}
      {isAddDriverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#141720] border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5 text-[#F5C518]">
                <Bike className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="text-base font-black text-white">Manual Driver Onboarding</h3>
                  <p className="text-[11px] text-zinc-400">Directly register & activate driver from Admin Panel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDriverModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {addDriverError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold">
                {addDriverError}
              </div>
            )}

            <form onSubmit={handleManualCreateDriver} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Driver Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Md. Rafiqul Islam"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0E1015] border border-zinc-800 text-xs text-white focus:border-[#F5C518] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Primary Mobile Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 01712345678"
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0E1015] border border-zinc-800 text-xs text-white font-mono focus:border-[#F5C518] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    Emergency Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 01812345678"
                    value={newDriverAltPhone}
                    onChange={(e) => setNewDriverAltPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0E1015] border border-zinc-800 text-xs text-white font-mono focus:border-[#F5C518] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="driver@gmail.com"
                    value={newDriverEmail}
                    onChange={(e) => setNewDriverEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0E1015] border border-zinc-800 text-xs text-white focus:border-[#F5C518] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    Account Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="driver123"
                    value={newDriverPassword}
                    onChange={(e) => setNewDriverPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0E1015] border border-zinc-800 text-xs text-white font-mono focus:border-[#F5C518] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    NID Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5918239012"
                    value={newDriverNid}
                    onChange={(e) => setNewDriverNid(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0E1015] border border-zinc-800 text-xs text-white font-mono focus:border-[#F5C518] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    value={newDriverVehicle}
                    onChange={(e) => setNewDriverVehicle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0E1015] border border-zinc-800 text-xs text-white focus:border-[#F5C518] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    value={newDriverPlate}
                    onChange={(e) => setNewDriverPlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0E1015] border border-zinc-800 text-xs text-white focus:border-[#F5C518] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Initial Account Status
                </label>
                <select
                  value={newDriverStatus}
                  onChange={(e) => setNewDriverStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0E1015] border border-zinc-800 text-xs text-white focus:border-[#F5C518] focus:outline-hidden"
                >
                  <option value="approved">Approved Immediately (Can Log In Right Now)</option>
                  <option value="pending">Pending Verification (Appears in Queue)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddDriverModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDriver}
                  className="px-4 py-2 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black text-xs font-black cursor-pointer shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingDriver ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Register Driver</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
