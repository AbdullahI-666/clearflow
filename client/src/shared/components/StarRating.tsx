import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  readOnly?: boolean;
  onChange?: (rating: number) => void;
}

export const StarRating = ({ rating, maxStars = 5, readOnly = false, onChange }: StarRatingProps) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        const filled = starValue <= rating;
        return (
          <button
            key={index}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(starValue)}
            className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          >
            <Star
              className={`w-5 h-5 ${
                filled ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
