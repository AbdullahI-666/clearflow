import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Sparkles, Zap, Droplet, Trash2 as TrashIcon, Bug, Leaf, Recycle, Wrench, Shield, Check, X, Loader2 } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { toast } from 'sonner';

interface ServiceCategory {
  _id: string;
  name: string;
  description: string;
  isPaid: boolean;
  isWaste: boolean;
  iconUrl?: string;
  basePrice: number;
}

const ICON_MAP: Record<string, any> = {
  sparkles: Sparkles,
  zap: Zap,
  droplet: Droplet,
  'trash-2': TrashIcon,
  bug: Bug,
  leaf: Leaf,
  recycle: Recycle,
  wrench: Wrench,
  shield: Shield,
};

export const CategoryManagement = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState(80);
  const [isPaid, setIsPaid] = useState(true);
  const [isWaste, setIsWaste] = useState(false);
  const [iconUrl, setIconUrl] = useState('sparkles');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories');
      if (res.data?.success && res.data?.data) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setBasePrice(80);
    setIsPaid(true);
    setIsWaste(false);
    setIconUrl('sparkles');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: ServiceCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description);
    setBasePrice(cat.basePrice || 0);
    setIsPaid(cat.isPaid);
    setIsWaste(cat.isWaste);
    setIconUrl(cat.iconUrl || 'sparkles');
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
        basePrice: Number(basePrice),
        isPaid,
        isWaste,
        iconUrl,
      };

      if (editingCategory) {
        const res = await apiClient.patch(`/categories/${editingCategory._id}`, payload);
        if (res.data?.success) {
          toast.success(`Category "${name}" updated successfully`);
        }
      } else {
        const res = await apiClient.post('/categories', payload);
        if (res.data?.success) {
          toast.success(`Category "${name}" created successfully`);
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

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;

    try {
      const res = await apiClient.delete(`/categories/${id}`);
      if (res.data?.success) {
        toast.success(`Category "${catName}" deleted`);
        fetchCategories();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Service Categories</h1>
          <p className="text-gray-500 mt-1">Configure facility operational services, base pricing, and waste classification rules.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-teal-600 hover:bg-teal-700 shadow-md cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Add New Category
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
          <p className="text-sm">Loading service categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center text-gray-500 bg-white rounded-2xl p-8 border border-gray-100">
          <p className="font-semibold text-gray-700">No service categories found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const IconComponent = ICON_MAP[cat.iconUrl || 'sparkles'] || Sparkles;
            return (
              <Card key={cat._id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 mb-3">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {cat.isWaste && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          Waste Stream
                        </Badge>
                      )}
                      {cat.isPaid ? (
                        <Badge className="bg-teal-600 text-white text-xs">Paid Service</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Standard Facility</Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">{cat.name}</CardTitle>
                  <CardDescription className="text-sm text-gray-500 line-clamp-2 mt-1">
                    {cat.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center py-3 border-t border-gray-100 mt-2">
                    <div>
                      <span className="text-xs text-gray-400 font-medium">Standard Base Rate</span>
                      <p className="text-lg font-bold text-gray-900">${cat.basePrice || 0}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(cat)} className="h-8 px-2 text-gray-600 hover:text-teal-700 hover:border-teal-300 cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cat._id, cat.name)} className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">
                {editingCategory ? 'Edit Service Category' : 'Create Service Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
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
                  placeholder="e.g. Air conditioning, heating and ventilation systems"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base Rate ($ USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Category Icon</Label>
                  <select
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="sparkles">✨ Sparkles (Cleaning)</option>
                    <option value="zap">⚡ Zap (Electrical)</option>
                    <option value="droplet">💧 Droplet (Plumbing)</option>
                    <option value="trash-2">🗑️ Trash (Waste)</option>
                    <option value="recycle">♻️ Recycle (E-Waste)</option>
                    <option value="bug">🪲 Bug (Pest Control)</option>
                    <option value="leaf">🍃 Leaf (Gardening)</option>
                    <option value="wrench">🔧 Wrench (Mechanical)</option>
                    <option value="shield">🛡️ Shield (Security/Access)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Commercial / Paid Service (Generates Invoice on completion)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWaste}
                    onChange={(e) => setIsWaste(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Waste & Recycling Stream (Enables weight kg & device condition fields)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
