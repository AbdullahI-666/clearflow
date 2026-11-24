"use client";

import React, { useState, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";

export interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href?: string;
  isPopular: boolean;
  points?: number;
  effectivePrice?: number;
  isAnnual?: boolean;
  onSelect?: () => void;
}

export interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
  onSelectPlan?: (plan: PricingPlan, isAnnual?: boolean) => void;
  roleTheme?: 'fieldteam' | 'admin' | 'client';
  className?: string;
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you\nAll plans include access to our platform, lead generation tools, and dedicated support.",
  onSelectPlan,
  roleTheme = 'fieldteam',
  className,
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const isField = roleTheme === 'fieldteam';

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 65,
        spread: 60,
        zIndex: 99999, // Render directly in front of dialog modal (not behind in background)
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: isField
          ? ["#d97706", "#f59e0b", "#fbbf24", "#ea580c", "#fed7aa"]
          : [
              "hsl(var(--primary))",
              "hsl(var(--accent))",
              "hsl(var(--secondary))",
              "hsl(var(--muted))",
            ],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  const handlePlanClick = (plan: PricingPlan, e: React.MouseEvent) => {
    const isAnnual = !isMonthly;
    const effectivePrice = isAnnual ? Number(plan.yearlyPrice) : Number(plan.price);
    const enrichedPlan: PricingPlan = {
      ...plan,
      effectivePrice,
      isAnnual,
    };
    if (onSelectPlan) {
      e.preventDefault();
      onSelectPlan(enrichedPlan, isAnnual);
    } else if (plan.onSelect) {
      e.preventDefault();
      plan.onSelect();
    }
  };

  return (
    <div className={cn("w-full py-2 sm:py-3 px-2 sm:px-4 max-w-5xl mx-auto", className)}>
      <div className="text-center space-y-1.5 mb-5">
        <h2 className={cn("text-2xl sm:text-3xl font-black tracking-tight", isField ? "text-amber-950" : "text-foreground")}>
          {title}
        </h2>
        <p className={cn("text-xs sm:text-sm max-w-xl mx-auto whitespace-pre-line leading-relaxed", isField ? "text-amber-900/80 font-medium" : "text-muted-foreground")}>
          {description}
        </p>
      </div>

      <div className="flex justify-center items-center mb-6 gap-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <Label className="cursor-pointer">
            <Switch
              ref={switchRef as any}
              checked={!isMonthly}
              onCheckedChange={handleToggle}
              className={cn("relative cursor-pointer", isField && "data-[state=checked]:bg-amber-600")}
            />
          </Label>
        </label>
        <span className={cn("text-xs sm:text-sm font-semibold ml-2", isField ? "text-amber-950" : "text-foreground")}>
          Annual billing <span className={cn("font-bold", isField ? "text-amber-600" : "text-primary")}>(Save 20%)</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 30, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -12 : 0,
                    opacity: 1,
                    x: index === 2 ? -15 : index === 0 ? 15 : 0,
                    scale: index === 0 || index === 2 ? 0.96 : 1.0,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 0.8,
              type: "spring",
              stiffness: 120,
              damping: 24,
              delay: 0.15 * index,
              opacity: { duration: 0.4 },
            }}
            className={cn(
              "rounded-2xl border p-6 bg-white text-center flex flex-col justify-between relative shadow-sm transition-all duration-300",
              plan.isPopular
                ? isField
                  ? "border-amber-500 border-2 shadow-lg shadow-amber-500/15 ring-2 ring-amber-400/30"
                  : "border-primary border-2 shadow-lg"
                : isField
                ? "border-amber-200/80 hover:border-amber-300"
                : "border-border",
              !plan.isPopular && "mt-2 md:mt-3"
            )}
          >
            {plan.isPopular && (
              <div className={cn(
                "absolute top-0 right-0 py-1 px-3 rounded-bl-xl rounded-tr-xl flex items-center shadow-xs",
                isField ? "bg-amber-600 text-white" : "bg-primary text-primary-foreground"
              )}>
                <Star className="h-3.5 w-3.5 fill-current mr-1" />
                <span className="text-[11px] font-sans font-bold uppercase tracking-wider">
                  Popular
                </span>
              </div>
            )}
            <div className="flex-1 flex flex-col">
              <p className={cn("text-xs font-bold uppercase tracking-wider", isField ? "text-amber-800" : "text-muted-foreground")}>
                {plan.name}
              </p>
              <div className="mt-3 flex items-baseline justify-center gap-1.5 flex-nowrap">
                <span className={cn("text-3xl sm:text-4xl font-black tracking-tight", isField ? "text-amber-950" : "text-foreground")}>
                  {React.createElement(NumberFlow as any, {
                    value: isMonthly ? Number(plan.price) : Number(plan.yearlyPrice),
                    format: {
                      style: "currency",
                      currency: "PKR",
                      currencyDisplay: "code",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    },
                    transformTiming: {
                      duration: 400,
                      easing: "ease-out",
                    },
                    willChange: true,
                    className: "font-variant-numeric: tabular-nums",
                  })}
                </span>
                {plan.period !== "Next 3 months" && (
                  <span className={cn("text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap", isField ? "text-amber-700/80" : "text-muted-foreground")}>
                    / {plan.period}
                  </span>
                )}
              </div>

              <ul className="mt-5 space-y-2.5 flex flex-col text-left">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 font-medium">
                    <Check className={cn("h-4 w-4 mt-0.5 shrink-0", isField ? "text-amber-600 font-bold" : "text-primary")} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <hr className={cn("w-full my-5", isField ? "border-amber-100" : "border-border")} />

              <div className="mt-auto">
                <Link
                  href={plan.href || "#"}
                  onClick={(e) => handlePlanClick(plan, e)}
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                    }),
                    "group relative w-full gap-2 overflow-hidden text-sm font-bold tracking-tight cursor-pointer h-10 transition-all duration-200",
                    plan.isPopular
                      ? isField
                        ? "bg-amber-600 hover:bg-amber-700 text-white border-transparent shadow-md shadow-amber-600/20"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                      : isField
                      ? "border-amber-300 text-amber-900 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-400"
                      : "bg-background text-foreground hover:bg-accent"
                  )}
                >
                  {!isMonthly
                    ? `Get ${plan.name} (PKR ${Number(plan.yearlyPrice).toLocaleString()})`
                    : plan.buttonText}
                </Link>
                <p className={cn("mt-3 text-[11px] leading-4", isField ? "text-amber-800/80" : "text-muted-foreground")}>
                  {plan.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default Pricing;
