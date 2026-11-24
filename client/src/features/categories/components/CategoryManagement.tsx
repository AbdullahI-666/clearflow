import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Edit2, Trash2, Check, X, Loader2, Search, Sparkles
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { getCategory3DIcon, CATEGORY_ICON_REGISTRY, ICON_OPTIONS, CategorySquircleLogo } from '@/shared/utils/categoryIcons';

interface ServiceCategory {
  _id: string;
  name: string;
  description: string;
  isPaid: boolean;
  isWaste: boolean;
  iconUrl?: string;
  basePrice: number;
}

const DEFAULT_CATEGORIES: ServiceCategory[] = [
  {
    _id: "65f000000000000000000423",
    name: "Cleaning",
    description: "General residential and commercial cleaning, dusting, and sanitization.",
    isPaid: true,
    isWaste: false,
    iconUrl: "sparkles",
    basePrice: 1000,
  },
  {
    _id: "65f000000000000000000578",
    name: "Electrical",
    description: "Repair and installation of wiring, outlets, lighting, and circuit breakers.",
    isPaid: true,
    isWaste: false,
    iconUrl: "zap",
    basePrice: 2000,
  },
  {
    _id: "65f000000000000000000654",
    name: "Plumbing",
    description: "Inspection and repair of pipes, drains, faucets, and water leaks.",
    isPaid: true,
    isWaste: false,
    iconUrl: "droplet",
    basePrice: 3000,
  }
];

export const CategoryManagement = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>(() => {
    try {
      const cached = localStorage.getItem('clearflow_cached_categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_CATEGORIES;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number | ''>('');
  const [isPaid, setIsPaid] = useState(true);
  const [isWaste, setIsWaste] = useState(false);
  const [iconUrl, setIconUrl] = useState('sparkles');
  const [iconSearch, setIconSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories');
      if (res.data?.success && res.data?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        const filtered = list.filter((c: any) => c.name !== 'Machinery' && c.name !== 'Security');
        setCategories(filtered);
        try {
          localStorage.setItem('clearflow_cached_categories', JSON.stringify(filtered));
        } catch (_) {}
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    const handleRefresh = () => fetchCategories();
    window.addEventListener('clearflow:categories-updated', handleRefresh);
    window.addEventListener('clearflow:refresh-data', handleRefresh);
    return () => {
      window.removeEventListener('clearflow:categories-updated', handleRefresh);
      window.removeEventListener('clearflow:refresh-data', handleRefresh);
    };
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setBasePrice('');
    setIsPaid(true);
    setIsWaste(false);
    setIconUrl('sparkles');
    setIconSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: ServiceCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description);
    setBasePrice(cat.basePrice !== undefined && cat.basePrice !== null ? cat.basePrice : '');
    setIsPaid(cat.isPaid);
    setIsWaste(cat.isWaste);
    setIconUrl(cat.iconUrl || 'sparkles');
    setIconSearch('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        basePrice: basePrice === '' ? 0 : Number(basePrice),
        isPaid,
        isWaste,
        iconUrl,
      };

      if (editingCategory) {
        const res = await apiClient.patch(`/categories/${editingCategory._id}`, payload);
        if (res.data?.success) {
          toast.success(`Category "${name}" updated successfully`);
          window.dispatchEvent(new CustomEvent('clearflow:categories-updated'));
        }
      } else {
        const res = await apiClient.post('/categories', payload);
        if (res.data?.success) {
          toast.success(`Category "${name}" created successfully`);
          window.dispatchEvent(new CustomEvent('clearflow:categories-updated'));
        }
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, catName: string) => {
    setDeleteTarget({ id, name: catName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await apiClient.delete(`/categories/${deleteTarget.id}`);
      if (res.data?.success) {
        toast.success(`Category "${deleteTarget.name}" deleted`);
        window.dispatchEvent(new CustomEvent('clearflow:categories-updated'));
        fetchCategories();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4 w-full pb-12">
      <div className="flex justify-center items-center py-3 my-2">
        <Button 
          onClick={openCreateModal} 
          className="bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/25 text-white cursor-pointer h-10 px-6 rounded-xl font-bold transition-all active:scale-95 text-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Category
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-sm">Loading service categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center text-gray-500 bg-white rounded-2xl p-8 border border-gray-100">
          <p className="font-semibold text-gray-700">No service categories found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const iconDetails = getCategory3DIcon(cat.name, cat.iconUrl);
            const IconComponent = iconDetails.Icon;
            return (
              <Card 
                key={cat._id} 
                className="border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 bg-white flex flex-col justify-between items-center text-center p-6 rounded-2xl group"
              >
                <div className="flex flex-col items-center text-center w-full">
                  {/* Pastel Squircle Category Logo */}
                  <CategorySquircleLogo
                    name={cat.name}
                    iconKey={cat.iconUrl}
                    size="lg"
                    className="mb-3.5 group-hover:scale-110 group-hover:-translate-y-0.5"
                  />

                  <CardTitle className="text-lg font-bold text-gray-900 text-center">
                    {cat.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500 text-center line-clamp-2 mt-1.5 max-w-[260px] mx-auto">
                    {cat.description}
                  </CardDescription>
                </div>

                <div className="w-full pt-4 mt-4 border-t border-gray-100 flex items-center justify-center gap-2.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openEditModal(cat)} 
                    className="h-8 px-3 text-gray-600 hover:text-purple-700 hover:border-purple-300 hover:bg-purple-50/60 cursor-pointer text-xs font-semibold rounded-lg shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(cat._id, cat.name)} 
                    className="h-8 px-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer rounded-lg"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">
                {editingCategory ? 'Edit Service Category' : 'Create Service Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label>Category Title *</Label>
                <Input
                  placeholder="e.g. HVAC & Climate Control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  placeholder="e.g. Air conditioning, heating, ventilation & duct cleaning"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Base Rate (PKR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={basePrice === '' ? '' : basePrice}
                    placeholder="Enter base rate (e.g. 3000)"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      if (raw === '' || raw === null || raw === undefined) {
                        setBasePrice('');
                      } else {
                        const num = Number(raw);
                        setBasePrice(isNaN(num) ? '' : num);
                      }
                    }}
                    className="mt-1"
                  />
                </div>

                <div className="flex flex-col justify-end space-y-2 pt-1 sm:pt-0">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                    <span>Commercial / Paid Service</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={isWaste}
                      onChange={(e) => setIsWaste(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                    <span>Waste & Recycling Stream</span>
                  </label>
                </div>
              </div>

              {/* ─── Category Icon Selector ─── */}
              <div className="space-y-2.5 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-800">
                    Category Icon
                  </Label>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    Selected: {CATEGORY_ICON_REGISTRY[iconUrl]?.label || 'Cleaning & Janitorial'}
                  </span>
                </div>

                {/* Filter / Search Bar for Icons */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Search icons (e.g. hvac, solar, cctv, clean, paint, pipes...)"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    className="h-8 pl-8 text-xs bg-white border-gray-200 rounded-lg placeholder:text-gray-400"
                  />
                  {iconSearch && (
                    <button
                      type="button"
                      onClick={() => setIconSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Visual Icon Grid Palette (Top 10 Essential Icons) */}
                <div className="border border-purple-100/90 rounded-xl p-2.5 bg-purple-50/20">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {ICON_OPTIONS.filter((opt) => {
                      if (!iconSearch.trim()) return true;
                      const q = iconSearch.toLowerCase();
                      return (
                        opt.id.toLowerCase().includes(q) ||
                        opt.label.toLowerCase().includes(q) ||
                        opt.hint.toLowerCase().includes(q)
                      );
                    }).map((opt) => {
                      const isSelected = iconUrl === opt.id;
                      const config = CATEGORY_ICON_REGISTRY[opt.id];
                      const IconComp = config?.Icon || Sparkles;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setIconUrl(opt.id)}
                          className={cn(
                            'flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer border group text-center',
                            isSelected
                              ? 'bg-purple-100/90 border-purple-500 ring-2 ring-purple-500/40 shadow-xs scale-102 font-bold'
                              : 'bg-white hover:bg-purple-50/70 border-gray-200/80 hover:border-purple-300 shadow-2xs'
                          )}
                          title={`${opt.label} — ${opt.hint}`}
                        >
                          <CategorySquircleLogo
                            iconKey={opt.id}
                            size="sm"
                            className="mb-1 group-hover:scale-110"
                          />
                          <span className={cn(
                            'text-[10px] leading-tight line-clamp-1 w-full text-center',
                            isSelected ? 'text-purple-950 font-bold' : 'text-gray-600'
                          )}>
                            {opt.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 font-bold w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Service Category"
        message={deleteTarget ? `Are you sure you want to delete category "${deleteTarget.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete Category"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
