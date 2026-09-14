import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TeamCard } from './TeamCard';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import type { FieldTeam } from '@/entities/team/types';
import type { ServiceCategory } from '@/entities/workOrder/types';
import { toast } from 'sonner';

const COLOR_PALETTE = ['bg-blue-500', 'bg-emerald-500', 'bg-teal-600', 'bg-green-600', 'bg-purple-500', 'bg-amber-500'];

export const TeamList = () => {
  const [teams, setTeams] = useState<FieldTeam[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Team Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [zoneRadius, setZoneRadius] = useState(10);
  const [isCreating, setIsCreating] = useState(false);

  const fetchTeamsData = async () => {
    try {
      const [teamsRes, catRes] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.TEAMS.BASE),
        apiClient.get(ENDPOINTS.WORK_ORDERS.CATEGORIES),
      ]);

      if (teamsRes.status === 'fulfilled' && teamsRes.value.data?.data) {
        setTeams(teamsRes.value.data.data);
      }
      if (catRes.status === 'fulfilled' && catRes.value.data?.data) {
        setCategories(catRes.value.data.data);
        if (catRes.value.data.data.length > 0) {
          setSelectedCatId(catRes.value.data.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsData();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !selectedCatId) {
      toast.error('Please enter team name and select a category');
      return;
    }

    setIsCreating(true);
    try {
      const res = await apiClient.post(ENDPOINTS.TEAMS.BASE, {
        name: newTeamName.trim(),
        categoryId: selectedCatId,
        zoneLat: 31.5204 + (Math.random() - 0.5) * 0.05,
        zoneLng: 74.3587 + (Math.random() - 0.5) * 0.05,
        zoneRadiusKm: zoneRadius,
      });

      if (res.data?.success) {
        toast.success(`Team "${newTeamName}" created successfully!`);
        setIsDialogOpen(false);
        setNewTeamName('');
        fetchTeamsData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTeams = teams.filter(t => {
    const q = searchQuery.toLowerCase();
    const name = (t.name || '').toLowerCase();
    const catName = typeof t.categoryId === 'object' && t.categoryId ? (t.categoryId as any).name?.toLowerCase() : '';
    return name.includes(q) || catName.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Field Teams</h1>
          <p className="text-gray-500 mt-1">Manage personnel, operational zones, and workload capacities.</p>
        </div>
        
        <Button onClick={() => setIsDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700 shadow-md cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Add New Team
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search teams by name or category..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-none shadow-sm focus-visible:ring-teal-500" 
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
          <p className="text-sm">Loading field teams from database...</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="py-16 text-center text-gray-500 bg-white rounded-xl shadow-sm p-8">
          <p className="font-semibold text-gray-700">No teams found matching search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team, idx) => {
            const catName = typeof team.categoryId === 'object' && team.categoryId ? (team.categoryId as any).name : 'Facility Ops';
            const initials = team.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
            const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
            const status = team.activeOrderCount > 0 ? ('On Job' as const) : team.isActive ? ('Available' as const) : ('Offline' as const);

            return (
              <TeamCard 
                key={team._id} 
                team={{
                  id: team._id,
                  name: team.name,
                  lead: 'Lead Dispatcher',
                  status,
                  rating: team.averageRating || 4.8,
                  zone: `Zone ${team.zoneLat?.toFixed(2)}, ${team.zoneLng?.toFixed(2)}`,
                  activeOrders: team.activeOrderCount || 0,
                  categories: [catName],
                  initials,
                  color,
                }} 
              />
            );
          })}
        </div>
      )}

      {/* Add New Team Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900">Add New Field Team</h3>
              <button onClick={() => setIsDialogOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <Label>Team Name *</Label>
                <Input 
                  placeholder="e.g. Delta Rapid Response" 
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label>Specialty Category *</Label>
                <select 
                  value={selectedCatId} 
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Zone Operating Radius (km)</Label>
                <Input 
                  type="number" 
                  min={1} 
                  max={50}
                  value={zoneRadius}
                  onChange={(e) => setZoneRadius(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isCreating}>
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Team
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

