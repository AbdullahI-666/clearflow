"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VisaMastercardLogo, EasypaisaLogo, JazzCashLogo } from "@/components/ui/payment-icons";
import { PakistaniBankSelector } from "@/components/ui/pakistani-bank-selector";
import { Check, CheckCircle2, Loader2, Sparkles, ShieldCheck, ArrowLeft, Banknote } from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type PakistaniPaymentMethodType = "card" | "jazzcash" | "easypaisa" | "bank";

export interface RuixenPaymentCardProps {
  planName?: string;
  amount?: number;
  points?: number;
  roleTheme?: "admin" | "fieldteam" | "client";
  onBack?: () => void;
  onSuccess?: (details: any) => void;
  className?: string;
}

export function RuixenPaymentCard({
  planName = "Pro Crew Plan",
  amount = 750,
  points = 300,
  roleTheme = "fieldteam",
  onBack,
  onSuccess,
  className,
}: RuixenPaymentCardProps) {
  const [selectedMethod, setSelectedMethod] = useState<PakistaniPaymentMethodType>("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);

  // Form Fields
  const [bankName, setBankName] = useState("Meezan Bank");
  const [cardholderName, setCardholderName] = useState("Muhammad Ahsan");
  const [cardNumber, setCardNumber] = useState("4214 7892 0182 8237");
  const [expiryDate, setExpiryDate] = useState("08/28");
  const [cvv, setCvv] = useState("782");

  const [mobileNumber, setMobileNumber] = useState("0300-4567890");
  const [accountTitle, setAccountTitle] = useState("Muhammad Ahsan");

  const themeClasses = {
    admin: {
      primaryBtn: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25",
      activeRing: "ring-2 ring-purple-600 border-purple-600 bg-purple-50/50",
      accentText: "text-purple-700",
      accentBadge: "bg-purple-100 text-purple-800",
    },
    fieldteam: {
      primaryBtn: "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-600/25",
      activeRing: "ring-2 ring-amber-600 border-amber-600 bg-amber-50/50",
      accentText: "text-amber-800",
      accentBadge: "bg-amber-100 text-amber-900",
    },
    client: {
      primaryBtn: "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/25",
      activeRing: "ring-2 ring-teal-600 border-teal-600 bg-teal-50/50",
      accentText: "text-teal-800",
      accentBadge: "bg-teal-100 text-teal-900",
    },
  }[roleTheme || "fieldteam"];

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);

      const generatedTicket = {
        ticketId: "PKR-" + Math.floor(100000000000 + Math.random() * 900000000000),
        amount,
        planName,
        points,
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " • " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        method: selectedMethod,
        maskedAccount:
          selectedMethod === "card"
            ? `Visa / Mastercard •••• ${cardNumber.slice(-4) || "8237"}`
            : selectedMethod === "bank"
            ? `${bankName} •••• ${cardNumber.slice(-4) || "561"}`
            : selectedMethod === "jazzcash"
            ? `JazzCash •••• ${mobileNumber.slice(-4) || "7890"}`
            : `EasyPaisa •••• ${mobileNumber.slice(-4) || "7890"}`,
        accountName: selectedMethod === "card" || selectedMethod === "bank" ? cardholderName : accountTitle,
        barcodeNumber: "2893726" + Math.floor(1000000 + Math.random() * 9000000),
      };

      setTicketData(generatedTicket);

      // Trigger Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00A859", "#DC2626", "#ea580c", "#3b82f6", "#f59e0b"],
      });

      if (onSuccess) {
        onSuccess(generatedTicket);
      }
    }, 1200);
  };

  return (
    <div className={cn("w-full flex items-center justify-center p-1 sm:p-2", className)}>
      <Card className="max-w-md w-full rounded-2xl shadow-xl border bg-white overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Header & Back Button */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            {onBack && !isSuccess ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Plans
              </button>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Secure Checkout</span>
            )}

            <div className="text-right">
              <span className="text-xs font-extrabold text-gray-900 block">{planName}</span>
              <span className={cn("text-xs font-bold", themeClasses.accentText)}>PKR {amount.toLocaleString()}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                onSubmit={handlePay}
                className="space-y-4"
              >
                {/* Payment Options (Replaced PayPal, Apple Pay, GPay with Visa/MC, JazzCash, EasyPaisa) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-gray-700">Choose Pakistani Payment Method</Label>
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% Encrypted
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* 1. JazzCash */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("jazzcash")}
                      className={cn(
                        "p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer bg-white shadow-xs hover:border-red-300 min-h-[76px]",
                        selectedMethod === "jazzcash" ? themeClasses.activeRing : "border-gray-200"
                      )}
                    >
                      <JazzCashLogo className="h-7 w-auto object-contain" />
                      <span className="text-[10px] font-bold text-gray-700 mt-1">JazzCash</span>
                    </button>

                    {/* 2. EasyPaisa */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("easypaisa")}
                      className={cn(
                        "p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer bg-white shadow-xs hover:border-emerald-300 min-h-[76px]",
                        selectedMethod === "easypaisa" ? themeClasses.activeRing : "border-gray-200"
                      )}
                    >
                      <EasypaisaLogo className="h-7 w-auto object-contain" />
                      <span className="text-[10px] font-bold text-gray-700 mt-1">EasyPaisa</span>
                    </button>

                    {/* 3. 1-Link Bank */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("bank")}
                      className={cn(
                        "p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer bg-white shadow-xs hover:border-amber-300 min-h-[76px]",
                        selectedMethod === "bank" ? themeClasses.activeRing : "border-gray-200"
                      )}
                    >
                      <Banknote className="h-7 w-7 text-amber-600" />
                      <span className="text-[10px] font-bold text-gray-700 mt-1">1-Link Bank</span>
                    </button>

                    {/* 4. Visa / Mastercard */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("card")}
                      className={cn(
                        "p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer bg-white shadow-xs hover:border-blue-300 min-h-[76px]",
                        selectedMethod === "card" ? themeClasses.activeRing : "border-gray-200"
                      )}
                    >
                      <VisaMastercardLogo className="h-7 w-auto object-contain" />
                      <span className="text-[10px] font-bold text-gray-700 mt-1">Visa / MC</span>
                    </button>
                  </div>
                </div>

                {/* Separator */}
                <div className="flex items-center text-gray-400 py-1">
                  <hr className="flex-grow border-t border-gray-200" />
                  <span className="mx-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {selectedMethod === "card"
                      ? "Enter Card Credentials"
                      : selectedMethod === "bank"
                      ? "1-Link Bank Account"
                      : selectedMethod === "jazzcash"
                      ? "JazzCash Mobile Account"
                      : "EasyPaisa Mobile Account"}
                  </span>
                  <hr className="flex-grow border-t border-gray-200" />
                </div>

                {/* Dynamic Form per Payment Method */}
                {selectedMethod === "card" ? (
                  <div className="space-y-3">
                    {/* 1. Pakistani Bank Name with Real-Time Logos */}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-gray-700">
                        Select Pakistani Bank
                      </Label>
                      <PakistaniBankSelector
                        value={bankName}
                        onChange={setBankName}
                      />
                    </div>

                    {/* 2. 16-Digit Card Number */}
                    <div className="space-y-1">
                      <Label htmlFor="card-number" className="text-xs font-bold text-gray-700">
                        16-Digit Card Number
                      </Label>
                      <Input
                        id="card-number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        inputMode="numeric"
                        className="text-xs sm:text-sm h-9 font-mono tracking-wider bg-gray-50/50"
                        required
                      />
                    </div>

                    {/* 3. Cardholder Full Name */}
                    <div className="space-y-1">
                      <Label htmlFor="cardholder-name" className="text-xs font-bold text-gray-700">
                        Cardholder Full Name
                      </Label>
                      <Input
                        id="cardholder-name"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        placeholder="e.g. Muhammad Ahsan"
                        className="text-xs sm:text-sm h-9 bg-gray-50/50"
                        required
                      />
                    </div>

                    {/* 4. Expiry Date & CVV */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="expiry" className="text-xs font-bold text-gray-700">
                          Expiry Date
                        </Label>
                        <Input
                          id="expiry"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          placeholder="MM/YY"
                          className="text-xs sm:text-sm h-9 text-center bg-gray-50/50 font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cvv" className="text-xs font-bold text-gray-700">
                          CVV Security Code
                        </Label>
                        <Input
                          id="cvv"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          placeholder="123"
                          inputMode="numeric"
                          type="password"
                          maxLength={4}
                          className="text-xs sm:text-sm h-9 text-center bg-gray-50/50 font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-gray-700">
                        {selectedMethod === "jazzcash" ? "JazzCash Mobile Number" : "EasyPaisa Mobile Number"}
                      </Label>
                      <Input
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="0300-1234567"
                        className="text-xs sm:text-sm h-9 font-mono bg-gray-50/50"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-gray-700">Account Title / Full Name</Label>
                      <Input
                        value={accountTitle}
                        onChange={(e) => setAccountTitle(e.target.value)}
                        placeholder="e.g. Muhammad Ahsan"
                        className="text-xs sm:text-sm h-9 bg-gray-50/50"
                        required
                      />
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900">
                      📲 An instant payment authorization prompt will be sent to your phone. Approve it with your MPIN.
                    </div>
                  </div>
                )}

                {/* Submit Checkout Button */}
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className={cn("w-full h-11 text-sm font-bold cursor-pointer shadow-md mt-2", themeClasses.primaryBtn)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing Secure PKR Payment...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Pay PKR {amount.toLocaleString()} & Activate {planName}
                    </>
                  )}
                </Button>
              </motion.form>
            ) : (
              /* Success State - Ticket Receipt Animation (Image 3) */
              <motion.div
                key="ticket"
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
                className="space-y-4 pt-1"
              >
                {/* Receipt Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 text-center relative overflow-hidden">
                  {/* Decorative check circle */}
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-gray-900">Thank you!</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Your subscription ticket has been issued successfully
                    </p>
                  </div>

                  <hr className="border-dashed border-gray-200 my-2" />

                  {/* Ticket Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-left py-1">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Ticket ID</span>
                      <span className="font-mono font-black text-xs sm:text-sm text-gray-900">{ticketData?.ticketId}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Amount</span>
                      <span className="font-mono font-black text-xs sm:text-sm text-gray-900">PKR {ticketData?.amount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Date & Time</span>
                    <span className="text-xs font-semibold text-gray-700">{ticketData?.date}</span>
                  </div>

                  {/* Payment Account Pill */}
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2">
                      {selectedMethod === "card" ? (
                        <VisaMastercardLogo className="h-5 w-auto" />
                      ) : selectedMethod === "jazzcash" ? (
                        <JazzCashLogo className="h-4 w-auto" />
                      ) : selectedMethod === "easypaisa" ? (
                        <EasypaisaLogo className="h-4 w-auto" />
                      ) : (
                        <Banknote className="h-5 w-5 text-amber-600" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-gray-900">{ticketData?.accountName}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{ticketData?.maskedAccount}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Paid
                    </span>
                  </div>

                  {/* SVG Barcode & Number (Matching Image 3) */}
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-center items-center h-10 px-6 opacity-85">
                      <svg viewBox="0 0 200 40" className="w-full h-full" preserveAspectRatio="none">
                        {[
                          2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 1, 3,
                          1, 2, 4, 1, 3, 2, 1, 4,
                        ].map((width, idx) => {
                          const x = idx * 5;
                          return <rect key={idx} x={x} y="0" width={width} height="40" fill="#1E293B" />;
                        })}
                      </svg>
                    </div>
                    <p className="font-mono text-[10px] tracking-widest text-gray-400">{ticketData?.barcodeNumber}</p>
                  </div>
                </div>

                <Button
                  onClick={onBack}
                  className={cn("w-full font-bold text-xs h-10 cursor-pointer shadow-sm", themeClasses.primaryBtn)}
                >
                  <Check className="w-4 h-4 mr-1.5" /> Done & Return to Wallet
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

export default RuixenPaymentCard;
