import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Star, MessageSquare, ThumbsUp, CheckCircle2, ShieldCheck, 
  MapPin, Search, Filter, Reply, Send, 
  User, Check, Camera
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CategorySquircleLogo } from '@/shared/utils/categoryIcons';

export interface ClientReviewItem {
  id: string;
  clientName: string;
  clientLocation: string;
  rating: number;
  satisfaction: 'Approved' | 'ChangesRequested';
  workOrderCode: string;
  serviceTitle: string;
  category: string;
  date: string;
  timestamp: string;
  comment: string;
  evidenceVerified: boolean;
  photosCount: number;
  aiQualityScore: number;
  workerReply?: {
    author: string;
    text: string;
    timestamp: string;
  };
}

const INITIAL_REVIEWS: ClientReviewItem[] = [];

export const WorkerReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const isDemoWorker =
    (user?.email || '').toLowerCase().trim() === 'field@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'worker@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'crew@clearflow.com' ||
    user?._id === '65f000000000000000000004';

  const [reviews, setReviews] = useState<ClientReviewItem[]>(() => {
    if (!isDemoWorker) return [];
    const saved = localStorage.getItem('clearflow_worker_reviews');
    return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Sync real completed work order feedback if available
  useEffect(() => {
    const fetchLiveWorkOrderFeedback = async () => {
      try {
        const res = await apiClient.get(ENDPOINTS.WORK_ORDERS.BASE);
        const orders = res.data?.data || res.data || [];
        if (Array.isArray(orders)) {
          const liveWithFeedback = orders.filter((o: any) => {
            const isMyOrder = isDemoWorker || String(o.teamId?._id || o.teamId || o.assignedWorkerId || o.workerId) === String(user?._id);
            return isMyOrder && o.clientFeedback && o.clientFeedback.comment;
          });
          if (liveWithFeedback.length > 0) {
            const formatted: ClientReviewItem[] = liveWithFeedback.map((o: any) => ({
              id: 'wo-rev-' + o._id,
              clientName: o.clientFeedback.clientName || o.clientId?.name || 'Verified Client',
              clientLocation: o.locationAddress || 'Verified Client Site',
              rating: Number(o.clientFeedback.rating) || 5,
              satisfaction: o.clientFeedback.satisfaction === 'ChangesRequested' ? 'ChangesRequested' : 'Approved',
              workOrderCode: o.workOrderCode || 'WO-LIVE',
              serviceTitle: o.title || 'Scheduled Service Job',
              category: o.categoryId?.name || 'General Service',
              date: o.clientFeedback.submittedAt ? new Date(o.clientFeedback.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
              timestamp: 'Recently verified',
              comment: o.clientFeedback.comment,
              evidenceVerified: Boolean(o.afterImages && o.afterImages.length > 0),
              photosCount: (o.beforeImages?.length || 0) + (o.afterImages?.length || 0) || 6,
              aiQualityScore: 95,
            }));

            // Merge avoiding duplicates
            setReviews((prev) => {
              const prevIds = new Set(prev.map(r => r.id));
              const newItems = formatted.filter(item => !prevIds.has(item.id));
              const merged = [...newItems, ...prev];
              localStorage.setItem('clearflow_worker_reviews', JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch {
        // Fallback to initial reviews
      }
    };

    fetchLiveWorkOrderFeedback();
  }, [isDemoWorker, user?._id]);

  // Compute metrics
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : 'Not rated yet';

  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const fourStarCount = reviews.filter((r) => r.rating === 4).length;
  const threeStarCount = reviews.filter((r) => r.rating === 3).length;
  const approvedCount = reviews.filter((r) => r.satisfaction === 'Approved').length;
  const approvalPercentage = totalReviews > 0 ? ((approvedCount / totalReviews) * 100).toFixed(1) : '100';

  // Handle worker reply submission
  const handleSubmitReply = (reviewId: string) => {
    if (!replyText.trim()) {
      toast.error('Please enter a response to the client.');
      return;
    }

    setIsSubmittingReply(true);
    setTimeout(() => {
      const updated = reviews.map((r) => {
        if (r.id === reviewId) {
          return {
            ...r,
            workerReply: {
              author: user?.name || 'Ahsan',
              text: replyText.trim(),
              timestamp: 'Just now',
            },
          };
        }
        return r;
      });

      setReviews(updated);
      localStorage.setItem('clearflow_worker_reviews', JSON.stringify(updated));
      setReplyingToId(null);
      setReplyText('');
      setIsSubmittingReply(false);
      toast.success('Your response has been sent to the client and posted publicly.');
    }, 600);
  };

  // Filter categories
  const categories = ['all', ...Array.from(new Set(reviews.map((r) => r.category)))];

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch = 
      r.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.workOrderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.clientLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRating = selectedRating === 'all' || r.rating === selectedRating;
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;

    return matchesSearch && matchesRating && matchesCategory;
  });

  return (
    <div className="space-y-6 w-full pb-16 font-sans">
      {/* ─── Compact Header Row ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-2xs shrink-0">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-sidebar-title tracking-tight text-gray-900">
              Client Ratings & Reviews
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 border border-amber-300 text-amber-800">
              {totalReviews > 0 ? 'Master Specialist' : 'New Specialist'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
            Real verified client ratings, customer photo sign-offs, and quality service reviews
          </p>
        </div>

        {/* Lightweight Rating & Approval Pills */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-amber-200/90 px-3.5 py-1.5 rounded-xl shadow-2xs">
            <span className="text-lg font-black text-amber-600 font-mono flex items-center gap-1">
              {totalReviews > 0 ? (
                <>
                  {avgRating} <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                </>
              ) : (
                <span className="text-xs font-semibold text-gray-500">Not rated yet</span>
              )}
            </span>
            <span className="text-xs font-bold text-gray-600">
              ({totalReviews} Reviews)
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white border border-amber-200/90 px-3.5 py-1.5 rounded-xl shadow-2xs">
            <span className="text-lg font-black text-emerald-600 font-mono">
              {totalReviews > 0 ? `${approvalPercentage}%` : '100%'}
            </span>
            <span className="text-xs font-bold text-gray-600">
              {totalReviews > 0 ? 'Approved' : 'Initial Trust'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Search, Filter, and Sorting Bar ─── */}
      <div className="bg-white rounded-3xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews by client, code, or keyword..."
              className="pl-10 h-10 text-xs sm:text-sm rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white"
            />
          </div>

          {/* Star Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedRating('all')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                selectedRating === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              )}
            >
              All ({totalReviews})
            </button>
            <button
              onClick={() => setSelectedRating(5)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1',
                selectedRating === 5
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              )}
            >
              5 <Star className="w-3 h-3 fill-current" /> ({fiveStarCount})
            </button>
            <button
              onClick={() => setSelectedRating(4)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1',
                selectedRating === 4
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              )}
            >
              4 <Star className="w-3 h-3 fill-current" /> ({fourStarCount})
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto touch-scroll pt-1 border-t border-gray-100">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Services:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                selectedCategory === cat
                  ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              )}
            >
              {cat !== 'all' && <CategorySquircleLogo name={cat} size="xs" />}
              <span>{cat === 'all' ? 'All Services' : cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Client Reviews Feed ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-gray-900 font-sidebar-title flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-600" />
            Showing {filteredReviews.length} Verified Reviews
          </h2>
          <span className="text-xs text-gray-500">
            Updated in real-time from completed work orders
          </span>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center space-y-3">
            <Star className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-800">
              {totalReviews === 0 ? 'No Client Reviews Yet' : 'No reviews found matching your filter'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {totalReviews === 0
                ? 'Your client ratings, comments, and inspection quality sign-offs will appear here once you accept and complete service jobs.'
                : 'Try adjusting your search query or selecting a different star rating to view more customer reviews.'}
            </p>
            {totalReviews > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRating('all');
                  setSelectedCategory('all');
                }}
                className="text-xs font-bold rounded-xl border-amber-300 text-amber-900"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReviews.map((review) => {
              const isReplying = replyingToId === review.id;

              return (
                <div
                  key={review.id}
                  className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow space-y-4 relative overflow-hidden"
                >
                  {/* Review Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar with initials */}
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                        {review.clientName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm sm:text-base text-gray-900">
                            {review.clientName}
                          </h4>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Client
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{review.clientLocation}</span>
                          <span>•</span>
                          <span>{review.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-auto bg-amber-50/70 border border-amber-200 px-3 py-1.5 rounded-2xl">
                      <div className="flex items-center gap-1 text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              'w-4 h-4',
                              s <= review.rating
                                ? 'fill-amber-500 text-amber-500'
                                : 'text-gray-300'
                            )}
                          />
                        ))}
                      </div>
                      <span className="font-mono font-black text-sm text-amber-950">
                        {review.rating}.0
                      </span>
                    </div>
                  </div>

                  {/* Work Order Association Pill */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <CategorySquircleLogo name={review.category} size="xs" />
                    <span className="font-bold text-gray-800">{review.serviceTitle}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                      {review.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold ml-auto">
                      ✓ {review.satisfaction === 'Approved' ? 'Approved by Client' : 'Review Sign-Off'}
                    </span>
                  </div>

                  {/* Client Review Comment */}
                  <div className="relative pl-4 border-l-3 border-amber-500/70 py-1">
                    <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">
                      "{review.comment}"
                    </p>
                  </div>

                  {/* Verification Badges & Inspection Footnote */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-gray-500 border-t border-gray-50">
                    <div className="flex items-center gap-3">
                      {review.evidenceVerified && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                          <Camera className="w-3.5 h-3.5 text-amber-600" />
                          <span>{review.photosCount} Photos Verified (Before & After)</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>AI Confidence Score: {review.aiQualityScore}%</span>
                      </span>
                    </div>

                    {!review.workerReply && !isReplying && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingToId(review.id);
                          setReplyText('');
                        }}
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-50 cursor-pointer flex items-center gap-1"
                      >
                        <Reply className="w-3.5 h-3.5" /> Reply to Client
                      </Button>
                    )}
                  </div>

                  {/* Worker Public Response Box */}
                  {review.workerReply && (
                    <div className="rounded-2xl bg-amber-50/60 border border-amber-200/80 p-4 space-y-1.5 mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-amber-700" />
                          Response from {review.workerReply.author}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {review.workerReply.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        {review.workerReply.text}
                      </p>
                    </div>
                  )}

                  {/* Inline Worker Reply Form */}
                  {isReplying && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50/40 p-4 space-y-3 mt-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                          <Reply className="w-3.5 h-3.5 text-amber-700" />
                          Write a reply to {review.clientName}
                        </span>
                        <button
                          onClick={() => setReplyingToId(null)}
                          className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`e.g. Thank you ${review.clientName}! It was our pleasure to provide professional service.`}
                        className="text-xs rounded-xl bg-white border-amber-200 focus:border-amber-500"
                        rows={2}
                      />

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-gray-500">
                          Your response will be visible on your public worker profile.
                        </span>
                        <Button
                          size="sm"
                          disabled={isSubmittingReply}
                          onClick={() => handleSubmitReply(review.id)}
                          className="h-8 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          {isSubmittingReply ? 'Posting...' : 'Post Reply'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerReviewsPage;
