import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Droplets, Zap, Wrench, Bug, Leaf, Trash2, MonitorSmartphone,
  CheckCircle2, Loader2, Scale, Recycle, TreePine, Sparkles,
  MapPin, ClipboardList, ShieldCheck, ShieldAlert, Flame, AlertTriangle, Info, Banknote,
  Camera, Upload, Plus, X, Image as ImageIcon, RefreshCw,
  Clock, MessageSquare,
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import type { ServiceCategory } from '@/entities/workOrder/types';
import { LocationPicker } from '@/shared/components/maps/LocationPicker';
import { getSavedUserProfileLocation, resolveAddressCoordinates } from '@/shared/utils/locationHelper';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { IdentityVerificationModal } from '@/shared/components/IdentityVerificationModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getCategory3DIcon, CategorySquircleLogo } from '@/shared/utils/categoryIcons';

export function validateServiceDescription(desc: string): { isValid: boolean; message?: string } {
  const trimmed = (desc || '').trim();
  if (!trimmed || trimmed.length < 20) {
    return {
      isValid: false,
      message: 'Description must be at least 20 characters long. Please describe the facility problem in detail.'
    };
  }

  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 3) {
    return {
      isValid: false,
      message: 'Please provide a meaningful description with at least 3 descriptive words.'
    };
  }

  const uniqueChars = new Set(trimmed.toLowerCase().replace(/[^a-z0-9]/g, ''));
  if (uniqueChars.size < 4) {
    return {
      isValid: false,
      message: 'Meaningless repetitive text rejected. Please describe the actual problem.'
    };
  }

  const letters = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length >= 8) {
    const vowels = letters.match(/[aeiou]/g) || [];
    const vowelRatio = vowels.length / letters.length;
    if (vowelRatio < 0.12 && letters.length > 10) {
      return {
        isValid: false,
        message: 'The description appears to be random text. Please describe the actual issue.'
      };
    }
  }

  return { isValid: true };
}

const PHOTO_SLOTS = [
  {
    title: 'Photo 1',
    label: 'Initial Problem State',
    desc: 'Clear view of damage or defect',
  },
  {
    title: 'Photo 2',
    label: 'Area Context / Wide Angle',
    desc: 'Surrounding environment & workspace',
  },
  {
    title: 'Photo 3',
    label: 'Close-up / Tag Detail',
    desc: 'Equipment tag, model or specific leak',
  },
];

const CATEGORY_ICONS: Record<string, any> = {
  Cleaning: { 
    icon: Droplets, 
    color: 'text-blue-600', 
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/70',
    border: 'border-blue-200/80',
    shadow: 'shadow-[0_4px_12px_rgba(59,130,246,0.18),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_2px_rgba(59,130,246,0.08)]',
  },
  Electrical: { 
    icon: Zap, 
    color: 'text-amber-600', 
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/70',
    border: 'border-amber-200/80',
    shadow: 'shadow-[0_4px_12px_rgba(245,158,11,0.18),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_2px_rgba(245,158,11,0.08)]',
  },
  'Electrical Repair': { 
    icon: Zap, 
    color: 'text-amber-600', 
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/70',
    border: 'border-amber-200/80',
    shadow: 'shadow-[0_4px_12px_rgba(245,158,11,0.18),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_2px_rgba(245,158,11,0.08)]',
  },
  Plumbing: { 
    icon: Wrench, 
    color: 'text-cyan-600', 
    bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/70',
    border: 'border-cyan-200/80',
    shadow: 'shadow-[0_4px_12px_rgba(6,182,212,0.18),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_2px_rgba(6,182,212,0.08)]',
  },
  'Pest Control': { 
    icon: Bug, 
    color: 'text-pink-600', 
    bg: 'bg-gradient-to-br from-pink-50 to-pink-100/70',
    border: 'border-pink-200/80',
    shadow: 'shadow-[0_4px_12px_rgba(236,72,153,0.18),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_2px_rgba(236,72,153,0.08)]',
  },
  Gardening: { 
    icon: Leaf, 
    color: 'text-emerald-600', 
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/70',
    border: 'border-emerald-200/80',
    shadow: 'shadow-[0_4px_12px_rgba(16,185,129,0.18),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_2px_rgba(16,185,129,0.08)]',
  },
  'General Waste Collection': { 
    icon: Trash2, 
    color: 'text-red-600', 
    bg: 'bg-gradient-to-br from-red-50 to-rose-100/70',
    border: 'border-red-200/80',
    shadow: 'shadow-[0_4px_12px_rgba(239,68,68,0.22),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_2px_rgba(239,68,68,0.08)]',
  },
  'E-Waste Recycling': { 
    icon: MonitorSmartphone, 
    color: 'text-purple-600', 
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100/70',
    border: 'border-purple-200/80',
    shadow: 'shadow-[0_4px_12px_rgba(168,85,247,0.18),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_2px_rgba(168,85,247,0.08)]',
  },
};

const WASTE_TYPE_OPTIONS = [
  'Organic / Food Waste',
  'Paper & Cardboard',
  'Plastic & Packaging',
  'Glass & Metal',
  'Construction & Demolition Debris',
  'Hazardous Materials',
  'Mixed General Waste',
];

const EWASTE_DEVICE_OPTIONS = [
  'Desktop Computer / Monitor',
  'Laptop / Tablet',
  'Printer / Scanner / Copier',
  'Networking Equipment (Routers, Switches)',
  'Mobile Phones / Accessories',
  'UPS / Battery Backup',
  'Server / Rack Equipment',
  'Cables & Peripherals',
  'Other Electronic Equipment',
];

const DEFAULT_CATEGORIES: ServiceCategory[] = [
  {
    _id: '65f000000000000000000423',
    name: 'Cleaning',
    description: 'General residential and commercial cleaning, dusting, and sanitization.',
    isPaid: true,
    isWaste: false,
    iconUrl: 'sparkles',
    basePrice: 1000,
  },
  {
    _id: '65f000000000000000000578',
    name: 'Electrical',
    description: 'Repair and installation of wiring, outlets, lighting, and circuit breakers.',
    isPaid: true,
    isWaste: false,
    iconUrl: 'zap',
    basePrice: 2000,
  },
  {
    _id: '65f000000000000000000654',
    name: 'Plumbing',
    description: 'Inspection and repair of pipes, drains, faucets, and water leaks.',
    isPaid: true,
    isWaste: false,
    iconUrl: 'droplet',
    basePrice: 3000,
  },
];

const getInitialCategories = (): ServiceCategory[] => {
  try {
    const raw = localStorage.getItem('clearflow_cached_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}
  return DEFAULT_CATEGORIES;
};

const STEP_LABELS = ['Service Type', 'Location & Details', 'Review & Assign'];

// Helper for responsive high-quality client-side image compression
const compressImage = (file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const ServiceRequestForm = () => {
  const navigate = useNavigate();
  const theme = useRoleTheme();
  const { user } = useAuth();
  const initialLoc = useMemo(() => getSavedUserProfileLocation(user), [user]);
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<ServiceCategory[]>(() => getInitialCategories());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    const init = getInitialCategories();
    return init[0]?._id || '65f000000000000000000423';
  });
  const [address, setAddress] = useState<string>(() => initialLoc.address);
  const [locationLat, setLocationLat] = useState<number>(() => initialLoc.lat);
  const [locationLng, setLocationLng] = useState<number>(() => initialLoc.lng);
  const [description, setDescription] = useState('');

  // Synchronize location with user profile on load / change (for both clients and workers)
  useEffect(() => {
    if (!user) return;
    const profileAddr = (user.address || localStorage.getItem('clearflow_user_profile_address') || '').trim();
    if (!profileAddr) return;

    // Immediately resolve profile location coordinates synchronously if preset or stored
    const resolvedLoc = getSavedUserProfileLocation(user);
    if (resolvedLoc.address) {
      setAddress((prev) => (!prev || prev === 'Registered Service Site, Lahore' || prev === 'Canal View Field Base, Lahore' ? resolvedLoc.address : prev));
      if (resolvedLoc.lat && resolvedLoc.lng) {
        setLocationLat(resolvedLoc.lat);
        setLocationLng(resolvedLoc.lng);
      }
    }

    const isDefaultJohar = (
      Math.abs(resolvedLoc.lat - 31.4697) < 0.002 &&
      Math.abs(resolvedLoc.lng - 74.2728) < 0.002
    );
    const addressIsNotJohar = profileAddr && !profileAddr.toLowerCase().includes('johar town');

    if (isDefaultJohar && addressIsNotJohar) {
      resolveAddressCoordinates(profileAddr, (user as any).city).then((res) => {
        if (res && res.lat && res.lng) {
          setLocationLat(res.lat);
          setLocationLng(res.lng);
          try {
            localStorage.setItem('clearflow_user_profile_lat', String(res.lat));
            localStorage.setItem('clearflow_user_profile_lng', String(res.lng));
          } catch {}
        }
      });
    }
  }, [user]);

  // Listen to profile updates dispatched from ProfilePage
  useEffect(() => {
    const handleUserUpdated = (e: any) => {
      const updatedUser = e?.detail;
      if (updatedUser?.address) {
        const newAddr = updatedUser.address.trim();
        setAddress(newAddr);
        const newLat = Number(updatedUser.locationLat ?? updatedUser.lat);
        const newLng = Number(updatedUser.locationLng ?? updatedUser.lng);

        const isDefaultJohar = (
          !isNaN(newLat) && !isNaN(newLng) &&
          Math.abs(newLat - 31.4697) < 0.001 &&
          Math.abs(newLng - 74.2728) < 0.001
        );
        const addressIsNotJohar = newAddr && !newAddr.toLowerCase().includes('johar town');

        if (!isNaN(newLat) && !isNaN(newLng) && newLat !== 0 && newLng !== 0 && !(isDefaultJohar && addressIsNotJohar)) {
          setLocationLat(newLat);
          setLocationLng(newLng);
        } else {
          resolveAddressCoordinates(newAddr, updatedUser.city).then((res) => {
            if (res && res.lat && res.lng) {
              setLocationLat(res.lat);
              setLocationLng(res.lng);
              try {
                localStorage.setItem('clearflow_user_profile_lat', String(res.lat));
                localStorage.setItem('clearflow_user_profile_lng', String(res.lng));
              } catch {}
            }
          });
        }
      }
    };
    window.addEventListener('clearflow:user-updated', handleUserUpdated);
    return () => window.removeEventListener('clearflow:user-updated', handleUserUpdated);
  }, []);

  const handleLocationChange = React.useCallback((newLat: number, newLng: number, newAddr: string) => {
    setLocationLat(newLat);
    setLocationLng(newLng);
    setAddress(newAddr);
  }, []);
  const [urgency] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [beforePhotos, setBeforePhotos] = useState<string[]>(['', '', '']);
  const fileInputRef0 = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef1 = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef2 = React.useRef<HTMLInputElement | null>(null);
  const fileInputRefs = [fileInputRef0, fileInputRef1, fileInputRef2];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  const isClientVerified = Boolean(
    (user?.cnicVerified === true || user?.verificationStatus === 'Verified') &&
    (user?.cnic && user.cnic.replace(/\D/g, '').length === 13)
  );

  useEffect(() => {
    if (user && !isClientVerified) {
      setIsVerificationModalOpen(true);
    }
  }, [user, isClientVerified]);

  // Waste / E-Waste specific fields
  const [wasteType, setWasteType] = useState('');
  const [wasteQuantityKg, setWasteQuantityKg] = useState<number | ''>('');
  const [ewasteDeviceDescription, setEwasteDeviceDescription] = useState('');

  // Marketplace Budget & Schedule
  const [budget, setBudget] = useState<number | ''>(500);
  const [preferredTime, setPreferredTime] = useState('Immediate / Next Available');

  const handlePhotoSelect = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP)');
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      if (dataUrl) {
        setBeforePhotos((prev) => {
          const copy = [...prev];
          copy[index] = dataUrl;
          return copy;
        });
        toast.success(`Photo ${index + 1} (${PHOTO_SLOTS[index].label}) attached`);
      }
    } catch {
      toast.error('Failed to process image');
    }
    e.target.value = '';
  };

  const handlePhotoDrop = async (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please drop an image file (JPG, PNG, WebP)');
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      if (dataUrl) {
        setBeforePhotos((prev) => {
          const copy = [...prev];
          copy[index] = dataUrl;
          return copy;
        });
        toast.success(`Photo ${index + 1} attached`);
      }
    } catch {
      toast.error('Failed to process image');
    }
  };

  const handleRemovePhoto = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBeforePhotos((prev) => {
      const copy = [...prev];
      copy[index] = '';
      return copy;
    });
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        let res = await apiClient.get('/categories').catch(() => null);
        if (!res || !res.data?.success) {
          res = await apiClient.get(ENDPOINTS.WORK_ORDERS.CATEGORIES).catch(() => null);
        }
        if (res?.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
          const fetchedCats = res.data.data;
          setCategories(fetchedCats);
          try {
            localStorage.setItem('clearflow_cached_categories', JSON.stringify(fetchedCats));
          } catch (_) {}
          setSelectedCategoryId((prev) => {
            const match = fetchedCats.find((c: any) => c._id === prev);
            return match ? prev : fetchedCats[0]._id;
          });
        }
      } catch (err) {
        console.error('Categories loaded from default set');
      }
    };
    loadCategories();
    window.addEventListener('clearflow:categories-updated', loadCategories);
    window.addEventListener('clearflow:refresh-data', loadCategories);
    return () => {
      window.removeEventListener('clearflow:categories-updated', loadCategories);
      window.removeEventListener('clearflow:refresh-data', loadCategories);
    };
  }, []);

  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/teams')
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setTeams(Array.isArray(res.data.data) ? res.data.data : []);
        }
      })
      .catch(() => {});
  }, []);

  const selectedCategoryObj = categories.find(c => c._id === selectedCategoryId);
  const isWasteCategory = selectedCategoryObj?.isWaste || false;
  const isEwasteCategory = selectedCategoryObj?.name === 'E-Waste Recycling';

  const isWorkersBusyForCategory = useMemo(() => {
    if (!selectedCategoryId || teams.length === 0) return false;
    const catTeams = teams.filter((t: any) => {
      const tCatId = typeof t.categoryId === 'object' && t.categoryId ? (t.categoryId._id || t.categoryId.id) : t.categoryId;
      const tCatName = typeof t.categoryId === 'object' && t.categoryId ? t.categoryId.name : '';
      return tCatId === selectedCategoryId || (selectedCategoryObj && tCatName === selectedCategoryObj.name);
    });
    if (catTeams.length === 0) return true;
    return catTeams.every((t: any) => (t.activeOrderCount || 0) >= 2 || t.isBusy === true);
  }, [selectedCategoryId, selectedCategoryObj, teams]);

  const handleSubmit = async () => {
    if (!isClientVerified) {
      setIsVerificationModalOpen(true);
      return;
    }

    if (!selectedCategoryId || !description.trim()) {
      toast.error('Please select a category and describe the issue');
      return;
    }

    const descCheck = validateServiceDescription(description);
    if (!descCheck.isValid) {
      toast.error(descCheck.message || 'Please provide a valid, descriptive problem description');
      return;
    }

    if (isWasteCategory && !wasteType) {
      toast.error('Please select a waste type for this category');
      return;
    }
    setIsSubmitting(true);
    try {
      const finalBeforeImages = beforePhotos.filter((p) => typeof p === 'string' && p.trim().length > 0);

      const payload: any = {
        categoryId: selectedCategoryId,
        clientName: user?.name || '',
        clientEmail: user?.email || '',
        locationAddress: address,
        locationLat,
        locationLng,
        description: description.trim(),
        urgency: 'Medium',
        budget: budget !== '' ? Number(budget) : 500,
        preferredTime,
        isMarketplace: true,
        isWorkersBusy: isWorkersBusyForCategory,
        workerQueueReason: isWorkersBusyForCategory ? 'all_busy' : undefined,
        beforeImages: finalBeforeImages,
        beforeImageUrl: finalBeforeImages.length > 0 ? finalBeforeImages[0] : undefined,
      };
      if (isWasteCategory) {
        payload.wasteType = wasteType;
        if (wasteQuantityKg !== '') payload.wasteQuantityKg = Number(wasteQuantityKg);
      }
      if (isEwasteCategory && ewasteDeviceDescription.trim()) {
        payload.ewasteDeviceDescription = ewasteDeviceDescription.trim();
        payload.description += `\n\n[E-Waste Device Details]\n${ewasteDeviceDescription.trim()}`;
      }
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.BASE, payload);
      if (res.data?.success && res.data?.data) {
        const orderData = res.data.data;
        // Make sure beforeImages is on the created order
        if (!orderData.beforeImages || orderData.beforeImages.length === 0) {
          orderData.beforeImages = finalBeforeImages;
          orderData.beforeImageUrl = finalBeforeImages[0];
        }
        setCreatedOrder(orderData);
        try {
          const ordId = orderData._id || orderData.id;
          const ordCode = orderData.workOrderCode;
          if (finalBeforeImages.length > 0) {
            if (ordId) localStorage.setItem(`cf_wo_before_${ordId}`, JSON.stringify(finalBeforeImages));
            if (ordCode) localStorage.setItem(`cf_wo_before_${ordCode}`, JSON.stringify(finalBeforeImages));
          }
        } catch {}
        if (isWorkersBusyForCategory || res.data.data.isWorkersBusy) {
          toast.info('Request submitted. All suitable technicians are busy; request queued.');
        } else {
          toast.success('Service request created successfully! Awaiting technician offers or acceptance.');
        }
      } else {
        toast.error('Failed to create request');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit service request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role theme shorthands
  const accent = theme.role === 'admin' ? 'purple' : theme.role === 'fieldteam' ? 'amber' : 'teal';
  const accentBorder = `border-${accent}-500`;
  const accentBg = `bg-${accent}-50`;
  const accentText = `text-${accent}-700`;
  const accentIcon = `text-${accent}-600`;

  const selectedBorderBg = theme.role === 'admin'
    ? 'border-purple-500 bg-purple-50 shadow-sm ring-1 ring-purple-200'
    : theme.role === 'fieldteam'
    ? 'border-amber-500 bg-amber-50 shadow-sm ring-1 ring-amber-200'
    : 'border-teal-500 bg-teal-50 shadow-sm ring-1 ring-teal-200';

  const selectedIconBg = theme.role === 'admin'
    ? 'bg-purple-600 text-white'
    : theme.role === 'fieldteam'
    ? 'bg-amber-600 text-white'
    : 'bg-teal-600 text-white';

  const selectedText = theme.role === 'admin' ? 'text-purple-900' : theme.role === 'fieldteam' ? 'text-amber-900' : 'text-teal-900';

  // ─── Success Screen ───────────────────────────────────────────────────────
  if (createdOrder) {
    const isBusy = Boolean(
      createdOrder.isWorkersBusy === true || 
      createdOrder.workerQueueReason === 'all_busy' || 
      (createdOrder.status === 'Open' && (!createdOrder.teamId || createdOrder.teamId?.name === 'Unassigned')) ||
      isWorkersBusyForCategory
    );

    return (
      <div className="w-full flex items-start justify-center pt-10 pb-16">
        <div className="w-full max-w-lg">
          <Card className="text-center py-12 border border-gray-100 shadow-xl bg-white rounded-2xl">
            <CardContent className="space-y-5 px-10">
              <div className="flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-bounce" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Request Submitted!</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Your service request has been created and broadcast to nearby verified technicians.
              </p>

              {isWasteCategory && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-left text-sm">
                  <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                    <Recycle className="w-4 h-4" /> Waste Management Details Attached
                  </p>
                  <p className="text-emerald-700 text-xs mt-1">
                    Type: <strong>{wasteType}</strong>
                    {wasteQuantityKg !== '' && <> · Est. Weight: <strong>{wasteQuantityKg} kg</strong></>}
                  </p>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <Button className={cn(theme.primaryBtn, "px-6")} onClick={() => navigate(`/work-orders/${createdOrder.workOrderCode || createdOrder._id || createdOrder.id}`)}>
                  Track Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Main Form ────────────────────────────────────────────────────────────
  return (
    <div className="w-full pb-12">
      {/* ── Page Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Service Request</h1>
        <p className="text-sm text-gray-500 mt-1">Submit a facility maintenance or waste management request.</p>
      </div>

      {/* CNIC Verification Alert Banner for Unverified Clients */}
      {!isClientVerified && (
        <div className="mb-6 bg-gradient-to-r from-teal-50 via-emerald-50 to-white rounded-2xl p-4 border border-teal-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100/80 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                13-Digit Pakistani CNIC Verification Required
              </h4>
              <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5">
                You must verify your Pakistani CNIC and facility profile details before creating a service request.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsVerificationModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify CNIC Now</span>
          </button>
        </div>
      )}

      {/* ── Two-Column Layout ── */}
      <div className="flex gap-6 items-start">

        {/* ════ LEFT PANEL: Stepper + Form ════ */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Step Progress Bar */}
          <div className="flex items-center gap-0">
            {STEP_LABELS.map((label, i) => {
              const s = i + 1;
              const isActive = step === s;
              const isDone = step > s;
              const isClickable = isDone;
              return (
                <React.Fragment key={s}>
                  <button
                    type="button"
                    onClick={() => isClickable && setStep(s)}
                    disabled={!isClickable}
                    className={cn(
                      'flex items-center gap-2 px-1 py-2 transition-all',
                      isClickable ? 'cursor-pointer' : 'cursor-default'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold transition-all shrink-0',
                      isActive
                        ? theme.activeBadge
                        : isDone
                        ? theme.activeBadge + ' opacity-70'
                        : 'bg-gray-100 text-gray-400'
                    )}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : s}
                    </span>
                    <span className={cn(
                      'text-xs font-semibold hidden sm:block',
                      isActive ? (theme.role === 'admin' ? 'text-purple-700' : theme.role === 'fieldteam' ? 'text-amber-700' : 'text-teal-700') : isDone ? 'text-gray-500' : 'text-gray-400'
                    )}>
                      {label}
                    </span>
                  </button>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={cn(
                      'flex-1 h-0.5 mx-2 rounded-full transition-all',
                      step > s
                        ? theme.role === 'admin' ? 'bg-purple-500' : theme.role === 'fieldteam' ? 'bg-amber-500' : 'bg-teal-500'
                        : 'bg-gray-200'
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Form Card */}
          <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className={cn(
              'px-4 py-3 sm:px-6 sm:py-4 border-b',
              theme.role === 'admin' ? 'bg-purple-50/60 border-purple-100' : theme.role === 'fieldteam' ? 'bg-amber-50/60 border-amber-100' : 'bg-teal-50/60 border-teal-100'
            )}>
              <CardTitle className="text-base font-bold text-gray-900">
                {step === 1 ? 'Step 1: Select Service Category' : step === 2 ? 'Step 2: Location & Issue Details' : 'Step 3: Review & Submit'}
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                {step === 1 ? 'Choose the category of facility service required.' : step === 2 ? 'Provide the exact location and a detailed description.' : 'Verify all details before intelligent auto-assignment.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {/* ── STEP 1: Categories ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {categories.map((cat) => {
                      const iconInfo = getCategory3DIcon(cat.name, (cat as any).iconUrl);
                      const Icon = iconInfo.Icon;
                      const isSelected = selectedCategoryId === cat._id;
                      return (
                        <div
                          key={cat._id}
                          onClick={() => {
                            setSelectedCategoryId(cat._id);
                            if (!cat.isWaste) {
                              setWasteType('');
                              setWasteQuantityKg('');
                              setEwasteDeviceDescription('');
                            }
                          }}
                          className={cn(
                            'flex flex-col items-center justify-center text-center p-4.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 group relative',
                            'shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]',
                            isSelected 
                              ? cn(selectedBorderBg, 'shadow-md ring-2 ring-teal-500/20') 
                              : 'border-gray-100/90 bg-white hover:border-gray-200'
                          )}
                        >
                          <CategorySquircleLogo
                            name={cat.name}
                            iconKey={(cat as any).iconUrl}
                            size="lg"
                            className="mb-3 group-hover:scale-110 group-hover:-translate-y-0.5"
                          />
                          <span className={cn('font-semibold text-xs text-center leading-tight', isSelected ? selectedText : 'text-gray-800')}>
                            {cat.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── STEP 2: Location & Details ── */}
              {step === 2 && (
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Left: Form fields */}
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-800">Problem Description <span className="text-red-500">*</span></Label>
                      <Textarea
                        placeholder="Describe the issue in detail (e.g. Water leakage from sink pipe, circuit breaker trip, deep cleaning required)..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={cn('h-32 resize-none bg-gray-50', theme.focusRing)}
                        required
                      />
                    </div>

                    {/* ── Client Initial Condition Photos (Upload 3 Photos) ── */}
                    <div className="space-y-2.5 p-4 rounded-xl border border-teal-200/80 bg-teal-50/30">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <Label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-teal-600" />
                            <span>Initial Condition Photos (Upload 3 Photos)</span>
                          </Label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Upload 3 photos showing problem state, area context, and close-up detail for technician inspection.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-bold px-2.5 py-0.5 rounded-full border transition-colors",
                            beforePhotos.filter(Boolean).length === 3
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-teal-100/70 text-teal-800 border-teal-200"
                          )}>
                            {beforePhotos.filter(Boolean).length} / 3 Uploaded
                          </span>
                        </div>
                      </div>

                      {/* 3 Upload Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {PHOTO_SLOTS.map((slot, idx) => {
                          const photo = beforePhotos[idx];
                          return (
                            <div key={idx} className="flex flex-col">
                              {photo ? (
                                /* Uploaded State */
                                <div className="relative h-36 w-full rounded-xl overflow-hidden border border-teal-300 shadow-xs group bg-gray-900">
                                  <img
                                    src={photo}
                                    alt={slot.label}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/40 pointer-events-none" />

                                  {/* Top Tag & Delete */}
                                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                                    <span className="text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                      <Camera className="w-2.5 h-2.5" />
                                      Photo {idx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleRemovePhoto(idx, e)}
                                      title="Remove photo"
                                      className="w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {/* Bottom Info & Change */}
                                  <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-1">
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-bold text-white truncate drop-shadow-xs">{slot.label}</p>
                                      <p className="text-[9.5px] text-teal-200 truncate drop-shadow-xs">{slot.desc}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => fileInputRefs[idx].current?.click()}
                                      className="shrink-0 text-[10px] font-semibold bg-white/95 hover:bg-white text-gray-800 px-2 py-1 rounded-md shadow-xs transition-all cursor-pointer"
                                    >
                                      Change
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Empty Upload Dropzone */
                                <div
                                  onClick={() => fileInputRefs[idx].current?.click()}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => handlePhotoDrop(idx, e)}
                                  className="h-36 w-full rounded-xl border-2 border-dashed border-teal-200 hover:border-teal-500 bg-white hover:bg-teal-50/50 p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group shadow-xs"
                                >
                                  <div className="w-9 h-9 rounded-full bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center text-teal-600 mb-2 transition-colors">
                                    <Camera className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-bold text-gray-800 group-hover:text-teal-700 leading-tight">
                                    Photo {idx + 1}
                                  </span>
                                  <span className="text-[11px] font-medium text-teal-700 mt-0.5">
                                    {slot.label}
                                  </span>
                                  <span className="text-[9.5px] text-gray-400 mt-1">
                                    Click or drag & drop (JPG, PNG)
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Hidden File Inputs for 3 Photo Slots */}
                      {fileInputRefs.map((ref, idx) => (
                        <input
                          key={`service-photo-input-${idx}`}
                          type="file"
                          ref={ref}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoSelect(idx, e)}
                        />
                      ))}
                    </div>

                    {/* Proposed Budget */}
                    <div className="space-y-2 p-3.5 bg-teal-50/50 border border-teal-200/80 rounded-xl">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-teal-600" />
                          <span>Proposed Budget / Your Price (PKR)</span>
                        </Label>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-full">
                          Marketplace Bidding
                        </span>
                      </div>
                      <p className="text-[11px] text-teal-800/80">
                        Suggest a fair budget. Nearby field members will either accept immediately or submit custom offers.
                      </p>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">PKR</span>
                        <Input
                          type="number"
                          min={500}
                          placeholder="e.g. 2500"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                          className="pl-12 h-9 text-sm border-teal-300 focus:ring-teal-500 bg-white"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        {[1500, 2500, 5000, 8000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setBudget(amt)}
                            className={cn(
                              'text-xs px-2.5 py-1 rounded-md border font-semibold transition-all cursor-pointer',
                              budget === amt
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white text-teal-900 border-teal-200 hover:bg-teal-50'
                            )}
                          >
                            PKR {amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preferred Arrival Time */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-800">Preferred Arrival Time</Label>
                      <select
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="Immediate / Next Available">Immediate / Next Available</option>
                        <option value="Within 1 - 2 Hours">Within 1 - 2 Hours</option>
                        <option value="Today Afternoon (2 PM - 5 PM)">Today Afternoon (2 PM - 5 PM)</option>
                        <option value="Scheduled Tomorrow Morning">Scheduled Tomorrow Morning</option>
                      </select>
                    </div>
                    {isWasteCategory && (
                      <div className="space-y-3 p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40">
                        <div className="flex items-center gap-2 text-emerald-800">
                          <Recycle className="w-4 h-4" />
                          <h3 className="font-bold text-sm">{isEwasteCategory ? 'E-Waste Recycling Details' : 'Waste Collection Details'}</h3>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-700">Waste Type <span className="text-red-500">*</span></Label>
                          <select
                            value={wasteType}
                            onChange={(e) => setWasteType(e.target.value)}
                            className={cn('w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2', theme.focusRing)}
                            required
                          >
                            <option value="">-- Select waste type --</option>
                            {(isEwasteCategory ? EWASTE_DEVICE_OPTIONS : WASTE_TYPE_OPTIONS).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                            <Scale className="w-3 h-3" /> Estimated Weight (kg)
                          </Label>
                          <Input
                            type="number" placeholder="e.g. 25" min={0} step={0.5}
                            value={wasteQuantityKg}
                            onChange={(e) => setWasteQuantityKg(e.target.value === '' ? '' : Number(e.target.value))}
                            className={cn('bg-white h-9 text-sm', theme.focusRing)}
                          />
                        </div>
                        {isEwasteCategory && (
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700">Device Description & Condition</Label>
                            <Textarea
                              placeholder="e.g. 3x HP LaserJet printers — non-functional, 2x Dell monitors — cracked screens"
                              value={ewasteDeviceDescription}
                              onChange={(e) => setEwasteDeviceDescription(e.target.value)}
                              className={cn('h-20 resize-none bg-white text-sm', theme.focusRing)}
                            />
                          </div>
                        )}
                        {Number(wasteQuantityKg) > 0 && (
                          <div className="p-3 bg-emerald-100/60 border border-emerald-300 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Environmental Impact
                              </span>
                              <span className="text-xs font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                                {isEwasteCategory ? '88% Recoverable' : '82% Recyclable'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 text-center">
                              {[
                                { label: 'Landfill Diversion', value: `${Math.round(Number(wasteQuantityKg) * (isEwasteCategory ? 0.88 : 0.82) * 10) / 10} kg` },
                                { label: 'CO₂e Offset', value: `${Math.round(Number(wasteQuantityKg) * (isEwasteCategory ? 1.85 : 1.25) * 10) / 10} kg` },
                                { label: 'Trees Equiv.', value: `${Math.max(0.1, Math.round(((Number(wasteQuantityKg) * (isEwasteCategory ? 1.85 : 1.25)) / 21.7) * 10) / 10)}` },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-white/90 p-2 rounded-lg border border-emerald-200">
                                  <p className="text-[9px] uppercase font-bold text-gray-500">{label}</p>
                                  <p className="text-sm font-extrabold text-emerald-700">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Unified Service Location & GPS Map Pin */}
                  <div className="space-y-2">
                    <LocationPicker
                      lat={locationLat}
                      lng={locationLng}
                      address={address}
                      onChange={handleLocationChange}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 3: Review ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1.5 flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> Service Category</p>
                        <p className="font-bold text-gray-900">{selectedCategoryObj?.name || 'Selected Service'}</p>
                      </div>
                      {selectedCategoryObj?.name && (
                        <CategorySquircleLogo name={selectedCategoryObj.name} iconKey={(selectedCategoryObj as any).iconUrl} size="md" />
                      )}
                    </div>
                    {/* Condition Photos Count */}
                    <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200/80">
                      <p className="text-xs text-teal-800 uppercase tracking-wide font-semibold mb-1.5 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-teal-600" /> Initial Condition Evidence
                      </p>
                      <p className="font-bold text-teal-900 text-sm">
                        {beforePhotos.filter(Boolean).length} of 3 Photos Attached
                      </p>
                    </div>

                    {/* Initial Condition 3 Photos Review Grid */}
                    <div className="sm:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5" /> Client Initial Condition (3 Photos)
                        </p>
                        <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          {beforePhotos.filter(Boolean).length} / 3 Uploaded
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {PHOTO_SLOTS.map((slot, idx) => {
                          const img = beforePhotos[idx];
                          return img ? (
                            <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 bg-black/10 group">
                              <img src={img} alt={slot.label} className="w-full h-full object-cover" />
                              <div className="absolute top-1 left-1 text-[8.5px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded shadow">
                                Photo {idx + 1}
                              </div>
                              <div className="absolute bottom-1 left-1 right-1 text-[8px] font-medium bg-black/60 text-white px-1 py-0.5 rounded truncate">
                                {slot.label}
                              </div>
                            </div>
                          ) : (
                            <div key={idx} className="relative aspect-video rounded-lg border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center p-2 text-center">
                              <Camera className="w-4 h-4 text-gray-400 mb-1" />
                              <span className="text-[9.5px] font-bold text-gray-500">Photo {idx + 1}</span>
                              <span className="text-[8px] text-gray-400">Not provided</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Budget & Preferred Schedule */}
                    <div className="p-4 bg-teal-50/70 rounded-xl border border-teal-200 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-teal-800 uppercase tracking-wide font-semibold mb-1 flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5" /> Proposed Price & Schedule
                          </p>
                          <p className="text-lg font-black text-teal-950">PKR {Number(budget || 500).toFixed(2)} Target Budget</p>
                          <p className="text-xs text-teal-700 mt-0.5">Preferred Time: <strong>{preferredTime}</strong></p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-600 text-white shadow-xs">
                          Smart Worker Matching
                        </span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 sm:col-span-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Location</p>
                      <p className="font-medium text-gray-900 text-sm">{address || <span className="text-gray-400 italic">No address provided</span>}</p>
                    </div>
                    {/* Description */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 sm:col-span-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1.5 flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> Description</p>
                      <p className="text-gray-800 text-sm bg-white p-3 rounded-lg border border-gray-200 whitespace-pre-wrap leading-relaxed">
                        {description || 'No description provided.'}
                      </p>
                    </div>
                    {/* Waste summary */}
                    {isWasteCategory && wasteType && (
                      <div className="sm:col-span-2 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                        <p className="text-emerald-800 font-semibold text-sm flex items-center gap-1.5 mb-2">
                          <Recycle className="w-4 h-4" /> Waste / Recycling Details
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-emerald-900">
                          <div><span className="text-emerald-600">Type:</span> <strong>{wasteType}</strong></div>
                          {wasteQuantityKg !== '' && <div><span className="text-emerald-600">Est. Weight:</span> <strong>{wasteQuantityKg} kg</strong></div>}
                        </div>
                        {isEwasteCategory && ewasteDeviceDescription && (
                          <div className="mt-2 text-xs">
                            <span className="text-emerald-600">Device Details:</span>
                            <p className="mt-1 bg-white/70 p-2 rounded border border-emerald-100 text-emerald-900">{ewasteDeviceDescription}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Assignment notice */}
                  <div className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border',
                    theme.role === 'admin' ? 'bg-purple-50 border-purple-200' : theme.role === 'fieldteam' ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200'
                  )}>
                      <ShieldCheck className={cn('w-5 h-5 mt-0.5 shrink-0', theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600')} />
                      <div>
                        <p className="text-sm font-bold text-gray-900">Intelligent Auto-Assignment Ready</p>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                          Upon confirmation, the Haversine algorithm will calculate distances and assign the nearest available worker in real-time.
                        </p>
                      </div>
                    </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-50 bg-gray-50/50">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1 || isSubmitting}
                className="cursor-pointer"
              >
                ← Back
              </Button>
              {step < 3 ? (
                <Button
                  className={cn(theme.primaryBtn, 'cursor-pointer px-6')}
                  onClick={() => {
                    if (step === 2 && !address.trim()) { toast.error('Please specify a facility address or select one on the map'); return; }
                    if (step === 2 && !description.trim()) { toast.error('Please enter a description of the issue'); return; }
                    if (step === 2 && isWasteCategory && !wasteType) { toast.error('Please select a waste type for this waste/recycling category'); return; }
                    setStep(step + 1);
                  }}
                  disabled={step === 1 && !selectedCategoryId}
                >
                  Next Step →
                </Button>
              ) : (
                <Button
                  className={cn(theme.primaryBtn, 'shadow-md cursor-pointer px-6')}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    'Confirm & Auto-Assign'
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* ════ RIGHT PANEL: Summary sidebar ════ */}
        <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
          {/* Request Summary Card */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <ClipboardList className={cn('w-4 h-4', theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600')} />
              Request Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-500 text-xs">Category</span>
                <span className="font-semibold text-gray-800 text-xs text-right">{selectedCategoryObj?.name || '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-500 text-xs">Condition Photos</span>
                <span className="font-semibold text-xs text-teal-700">
                  {beforePhotos.filter(Boolean).length} / 3 Uploaded
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-500 text-xs">Location</span>
                <span className="font-medium text-gray-700 text-xs text-right max-w-[140px] line-clamp-2">
                  {address || <span className="text-gray-400 italic">Not set</span>}
                </span>
              </div>
              {description && (
                <div>
                  <span className="text-gray-500 text-xs">Description</span>
                  <p className="text-gray-700 text-xs mt-1 line-clamp-3 bg-gray-50 p-2 rounded-lg border border-gray-100">{description}</p>
                </div>
              )}
            </div>

            {/* Step progress dots */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-xs font-bold text-gray-700">Step {step} of 3</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-all duration-300',
                      step >= s
                        ? theme.role === 'admin' ? 'bg-purple-500' : theme.role === 'fieldteam' ? 'bg-amber-500' : 'bg-teal-500'
                        : 'bg-gray-100'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Tips card */}
          <div className={cn(
            'rounded-2xl border p-5 space-y-3',
            theme.role === 'admin' ? 'bg-purple-50 border-purple-100' : theme.role === 'fieldteam' ? 'bg-amber-50 border-amber-100' : 'bg-teal-50 border-teal-100'
          )}>
            <h4 className={cn('font-bold text-xs uppercase tracking-wide', theme.role === 'admin' ? 'text-purple-800' : theme.role === 'fieldteam' ? 'text-amber-800' : 'text-teal-800')}>
              💡 Tips
            </h4>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" /> Be specific about the issue location for faster assignment</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" /> Drag the map pin to the exact spot for precision</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" /> Upload 3 clear photos so field technicians arrive with the right tools</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" /> You can track the worker live after submission</li>
            </ul>
          </div>

          {/* Assignment algorithm info */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-2">
            <h4 className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
              <ShieldCheck className={cn('w-4 h-4', theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600')} />
              Smart Assignment
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Our Haversine algorithm automatically calculates the nearest available worker and assigns the job in real-time upon submission.
            </p>
          </div>
        </div>
      </div>

      {/* Identity Verification Modal */}
      {isVerificationModalOpen && (
        <IdentityVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          onVerified={() => {
            setIsVerificationModalOpen(false);
            handleSubmit();
          }}
          role="Client"
          sourceActionTitle="submitting your service request"
        />
      )}
    </div>
  );
};
