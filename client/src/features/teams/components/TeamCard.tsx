import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Briefcase, Phone, MessageSquare } from 'lucide-react';

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    lead: string;
    status: 'Available' | 'On Job' | 'Offline';
    rating: number;
    zone: string;
    activeOrders: number;
    categories: string[];
    initials: string;
    color: string;
  };
}

export const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const statusColor = 
    team.status === 'Available' ? 'bg-emerald-500' : 
    team.status === 'On Job' ? 'bg-amber-500' : 'bg-gray-400';

  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${team.color} shadow-inner`}>
                {team.initials}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors">{team.name}</h3>
                <p className="text-sm text-gray-500">Lead: {team.lead}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-semibold text-gray-700">{team.rating}</span>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100">
                <div className={`h-2 w-2 rounded-full ${statusColor}`}></div>
              </div>
              <span className="font-medium text-gray-900">{team.status}</span>
              {team.status === 'On Job' && <span className="text-gray-500">({team.activeOrders} active)</span>}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>Zone: <span className="font-medium text-gray-800">{team.zone}</span></span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-5">
            {team.categories.map((cat, i) => (
              <Badge key={i} variant="secondary" className="bg-teal-50 text-teal-700 hover:bg-teal-100 font-medium">
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100 bg-gray-50/50">
          <Button variant="ghost" className="rounded-none h-12 text-gray-600 hover:text-teal-700 hover:bg-teal-50">
            <Phone className="h-4 w-4 mr-2" /> Call
          </Button>
          <Button variant="ghost" className="rounded-none h-12 text-gray-600 hover:text-teal-700 hover:bg-teal-50">
            <MessageSquare className="h-4 w-4 mr-2" /> Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
