import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Droplets, Zap, Wrench, Bug, Leaf, Trash2, MonitorSmartphone, CheckCircle2, Loader2, Scale, Recycle, TreePine, Sparkles } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import type { ServiceCategory } from '@/entities/workOrder/types';
import { LocationPicker } from '@/shared/components/maps/LocationPicker';
import { toast } from 'sonner';

const CATEGORY_ICONS: Record<string, any> = {
  Cleaning: { icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
  'Electrical Repair': { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
  Plumbing: { icon: Wrench, color: 'text-cyan-500', bg: 'bg-cyan-50' },
  'Pest Control': { icon: Bug, color: 'text-rose-500', bg: 'bg-rose-50' },
  Gardening: { icon: Leaf, color: 'text-green-500', bg: 'bg-green-50' },
  'General Waste Collection': { icon: Trash2, color: 'text-gray-500', bg: 'bg-gray-50' },
  'E-Waste Recycling': { icon: MonitorSmartphone, color: 'text-purple-500', bg: 'bg-purple-50' },
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
  { _id: '65f000000000000000000101', name: 'Cleaning', description: 'Janitorial & deep cleaning', isWaste: false, isPaid: false },
  { _id: '65f000000000000000000102', name: 'Electrical Repair', description: 'Wiring, fixtures & power systems', isWaste: false, isPaid: false },
  { _id: '65f000000000000000000103', name: 'Plumbing', description: 'Pipes, leaks & drainage', isWaste: false, isPaid: false },
  { _id: '65f000000000000000000104', name: 'General Waste Collection', description: 'Trash collection & disposal', isWaste: true, isPaid: false },
  { _id: '65f000000000000000000105', name: 'Pest Control', description: 'Fumigation & pest management', isWaste: false, isPaid: false },
  { _id: '65f000000000000000000106', name: 'Gardening', description: 'Lawn mowing & landscape care', isWaste: false, isPaid: false },
  { _id: '65f000000000000000000107', name: 'E-Waste Recycling', description: 'Electronics disposal & recycling', isWaste: true, isPaid: false },
];

export const ServiceRequestForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [selectedCategoryId, setSelectedCategoryId] = useState('65f000000000000000000101');
  const [address, setAddress] = useState('');
  const [locationLat, setLocationLat] = useState(40.7128);
  const [locationLng, setLocationLng] = useState(-74.0060);
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // F-08: Waste / E-Waste specific fields
  const [wasteType, setWasteType] = useState('');
  const [wasteQuantityKg, setWasteQuantityKg] = useState<number | ''>('');
  const [ewasteDeviceDescription, setEwasteDeviceDescription] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        let res = await apiClient.get(ENDPOINTS.WORK_ORDERS.CATEGORIES).catch(() => null);
        if (!res || !res.data?.success) {
          res = await apiClient.get('/categories').catch(() => null);
        }
        if (res?.data?.success && res.data?.data && res.data.data.length > 0) {
          setCategories(res.data.data);
          setSelectedCategoryId((prev) => {
            const match = res.data.data.find((c: any) => c._id === prev);
            return match ? prev : res.data.data[0]._id;
          });
        }
      } catch (err) {
        console.error('Categories loaded from default set');
      }
    };

    loadCategories();
  }, []);

  const selectedCategoryObj = categories.find(c => c._id === selectedCategoryId);
  const isWasteCategory = selectedCategoryObj?.isWaste || false;
  const isEwasteCategory = selectedCategoryObj?.name === 'E-Waste Recycling';
  const isGeneralWaste = selectedCategoryObj?.name === 'General Waste Collection';

  const handleSubmit = async () => {
    if (!selectedCategoryId || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isWasteCategory && !wasteType) {
      toast.error('Please select a waste type for this category');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        categoryId: selectedCategoryId,
        locationAddress: address,
        locationLat,
        locationLng,
        description: description.trim(),
        urgency,
      };

      // Include waste-specific fields if applicable (F-08)
      if (isWasteCategory) {
        payload.wasteType = wasteType;
        if (wasteQuantityKg !== '') {
          payload.wasteQuantityKg = Number(wasteQuantityKg);
        }
      }
      if (isEwasteCategory && ewasteDeviceDescription.trim()) {
        payload.ewasteDeviceDescription = ewasteDeviceDescription.trim();
        // Append e-waste device info to description for full context
        payload.description += `\n\n[E-Waste Device Details]\n${ewasteDeviceDescription.trim()}`;
      }

      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.BASE, payload);

      if (res.data?.success && res.data?.data) {
        setCreatedOrder(res.data.data);
        toast.success(`Work order ${res.data.data.workOrderCode || ''} created and auto-assigned!`);
      } else {
        toast.error('Failed to create request');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit service request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdOrder) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <Card className="text-center py-10 border-none shadow-lg bg-white">
          <CardContent className="space-y-4">
            <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto animate-bounce" />
            <h2 className="text-2xl font-bold text-gray-900">Request Submitted Successfully!</h2>
            <p className="text-gray-600">
              Your service request <span className="font-bold text-teal-700">{createdOrder.workOrderCode}</span> has been created.
              The automated Haversine dispatch algorithm has assigned it to the nearest field team.
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

            <div className="flex justify-center gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/work-orders')}
                className="border-gray-300 cursor-pointer"
              >
                All Work Orders
              </Button>
              <Button 
                className="bg-teal-600 hover:bg-teal-700 shadow-md cursor-pointer"
                onClick={() => navigate(`/work-orders/${createdOrder._id || createdOrder.id}`)}
              >
                Track Request Details &rarr;
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">New Service Request</h1>
        <p className="text-gray-500">Submit a facility maintenance or waste management request.</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full -z-10"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-teal-600 rounded-full -z-10 transition-all duration-300" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
        
        <div className="flex justify-between w-full">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors ${step >= s ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle>{step === 1 ? 'Step 1: Select Service Category' : step === 2 ? 'Step 2: Location & Issue Details' : 'Step 3: Review & Dispatch'}</CardTitle>
          <CardDescription>
            {step === 1 ? 'Choose the category of facility service required.' : step === 2 ? 'Provide specific location and description.' : 'Verify all details before intelligent dispatch.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {step === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const iconInfo = CATEGORY_ICONS[cat.name] || { icon: Wrench, color: 'text-teal-600', bg: 'bg-teal-50' };
                const Icon = iconInfo.icon;
                const isSelected = selectedCategoryId === cat._id;

                return (
                  <div 
                    key={cat._id} 
                    onClick={() => {
                      setSelectedCategoryId(cat._id);
                      // Reset waste fields when switching categories
                      if (!cat.isWaste) {
                        setWasteType('');
                        setWasteQuantityKg('');
                        setEwasteDeviceDescription('');
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${isSelected ? 'border-teal-600 bg-teal-50 shadow-sm scale-[1.02]' : 'border-gray-100 hover:border-teal-200 hover:bg-gray-50'}`}
                  >
                    <div className={`p-3 rounded-full mb-3 ${isSelected ? 'bg-teal-600 text-white' : iconInfo.bg + ' ' + iconInfo.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`font-semibold text-sm text-center ${isSelected ? 'text-teal-900' : 'text-gray-800'}`}>
                      {cat.name}
                    </span>
                    {cat.isWaste && (
                      <span className="text-[10px] text-teal-600 bg-teal-100/60 px-1.5 py-0.5 rounded mt-1 font-medium">Waste/Recycling</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-800">1. Interactive GPS Location Pin</Label>
                <p className="text-xs text-gray-500 mb-2">Drag the pin on the map or click a facility preset below to set exact dispatch coordinates:</p>
                <LocationPicker 
                  lat={locationLat} 
                  lng={locationLng} 
                  address={address} 
                  onChange={(newLat, newLng, newAddr) => {
                    setLocationLat(newLat);
                    setLocationLng(newLng);
                    setAddress(newAddr);
                  }} 
                />
              </div>

              <div className="space-y-3">
                <Label>2. Service Location / Specific Room</Label>
                <Input 
                  placeholder="e.g. 100 Broadway, 14th Floor, Tech Hub or Building C, Room 204" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-gray-50 focus-visible:ring-teal-500"
                />
              </div>

              <div className="space-y-3">
                <Label>3. Problem Description *</Label>
                <Textarea 
                  placeholder="Describe the issue in detail (e.g. Water leakage from sink pipe, circuit breaker trip, deep cleaning required)..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-28 resize-none bg-gray-50 focus-visible:ring-teal-500" 
                  required
                />
              </div>

              {/* F-08: Waste & E-Waste Dynamic Fields */}
              {isWasteCategory && (
                <div className="space-y-4 p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/30">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Recycle className="w-5 h-5" />
                    <h3 className="font-bold text-sm">
                      {isEwasteCategory ? 'E-Waste Recycling Details' : 'Waste Collection Details'}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Waste Type *</Label>
                    <select
                      value={wasteType}
                      onChange={(e) => setWasteType(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      required
                    >
                      <option value="">-- Select waste type --</option>
                      {(isEwasteCategory ? EWASTE_DEVICE_OPTIONS : WASTE_TYPE_OPTIONS).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5" /> Estimated Weight (kg)
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 25"
                      min={0}
                      step={0.5}
                      value={wasteQuantityKg}
                      onChange={(e) => setWasteQuantityKg(e.target.value === '' ? '' : Number(e.target.value))}
                      className="bg-white focus-visible:ring-teal-500"
                    />
                  </div>

                  {isEwasteCategory && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Device Description & Condition</Label>
                      <Textarea
                        placeholder="Describe each e-waste item (e.g., 3x HP LaserJet printers — non-functional, 2x Dell monitors — cracked screens, 5x Cisco routers — end-of-life)"
                        value={ewasteDeviceDescription}
                        onChange={(e) => setEwasteDeviceDescription(e.target.value)}
                        className="h-24 resize-none bg-white focus-visible:ring-teal-500"
                      />
                    </div>
                  )}
                  {Number(wasteQuantityKg) > 0 && (
                    <div className="mt-3 p-3 bg-emerald-100/60 border border-emerald-300 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-teal-700" /> AI Environmental Impact Forecast
                        </span>
                        <span className="text-xs font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                          {isEwasteCategory ? '88% Recoverable' : '82% Recyclable'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="bg-white/90 p-2 rounded-lg border border-emerald-200">
                          <p className="text-[10px] uppercase font-bold text-gray-500">Landfill Diversion</p>
                          <p className="text-sm font-extrabold text-emerald-700">
                            {Math.round(Number(wasteQuantityKg) * (isEwasteCategory ? 0.88 : 0.82) * 10) / 10} kg
                          </p>
                        </div>
                        <div className="bg-white/90 p-2 rounded-lg border border-emerald-200">
                          <p className="text-[10px] uppercase font-bold text-gray-500">CO₂e Offset</p>
                          <p className="text-sm font-extrabold text-teal-700">
                            {Math.round(Number(wasteQuantityKg) * (isEwasteCategory ? 1.85 : 1.25) * 10) / 10} kg
                          </p>
                        </div>
                        <div className="bg-white/90 p-2 rounded-lg border border-emerald-200">
                          <p className="text-[10px] uppercase font-bold text-gray-500">Trees Equiv.</p>
                          <p className="text-sm font-extrabold text-emerald-800 flex items-center justify-center gap-0.5">
                            <TreePine className="w-3 h-3 text-emerald-600" />
                            {Math.max(0.1, Math.round(((Number(wasteQuantityKg) * (isEwasteCategory ? 1.85 : 1.25)) / 21.7) * 10) / 10)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Label>Urgency Level</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Low', 'Medium', 'High'] as const).map((level) => (
                    <div 
                      key={level}
                      onClick={() => setUrgency(level)}
                      className={`text-center py-2.5 px-3 rounded-lg border cursor-pointer font-semibold text-sm transition-colors ${
                        urgency === level 
                          ? level === 'High' ? 'bg-red-50 border-red-500 text-red-700' : level === 'Medium' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {level}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Selected Category</p>
                  <p className="font-semibold text-gray-900">{selectedCategoryObj?.name || 'Selected Service'}</p>
                  {isWasteCategory && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">♻️ Waste/Recycling</span>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Urgency</p>
                  <p className={`font-semibold ${urgency === 'High' ? 'text-red-600' : urgency === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {urgency} Priority
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 mb-1">Location Address</p>
                  <p className="font-medium text-gray-900">{address}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 mb-1">Description</p>
                  <p className="text-gray-800 bg-white p-3 rounded-md border border-gray-200 whitespace-pre-wrap">
                    {description || 'No description provided.'}
                  </p>
                </div>

                {/* F-08: Waste summary in review step */}
                {isWasteCategory && wasteType && (
                  <div className="col-span-2 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <p className="text-emerald-800 font-semibold text-sm flex items-center gap-1.5 mb-2">
                      <Recycle className="w-4 h-4" /> Waste / Recycling Details
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-emerald-900">
                      <div>
                        <span className="text-emerald-600">Type:</span>{' '}
                        <strong>{wasteType}</strong>
                      </div>
                      {wasteQuantityKg !== '' && (
                        <div>
                          <span className="text-emerald-600">Est. Weight:</span>{' '}
                          <strong>{wasteQuantityKg} kg</strong>
                        </div>
                      )}
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
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between pt-6 border-t border-gray-50">
          <Button 
            variant="outline" 
            onClick={() => setStep(step - 1)} 
            disabled={step === 1 || isSubmitting}
            className="cursor-pointer"
          >
            Back
          </Button>
          
          {step < 3 ? (
            <Button 
              className="bg-teal-600 hover:bg-teal-700 cursor-pointer" 
              onClick={() => {
                if (step === 2 && !address.trim()) {
                  toast.error('Please specify a facility address or select one on the map');
                  return;
                }
                if (step === 2 && !description.trim()) {
                  toast.error('Please enter a description of the issue');
                  return;
                }
                if (step === 2 && isWasteCategory && !wasteType) {
                  toast.error('Please select a waste type for this waste/recycling category');
                  return;
                }
                setStep(step + 1);
              }}
              disabled={step === 1 && !selectedCategoryId}
            >
              Next Step &rarr;
            </Button>
          ) : (
            <Button 
              className="bg-teal-600 hover:bg-teal-700 shadow-md cursor-pointer" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Dispatching...
                </>
              ) : (
                'Confirm & Auto-Assign'
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
