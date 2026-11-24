import React from "react";
import { PaymentMethodSelector } from "@/components/ui/payment-1";
import { RuixenPaymentCard } from "@/components/ui/modern-payment-form";
import { VisaMastercardLogo, EasypaisaLogo, JazzCashLogo } from "@/components/ui/payment-icons";

export function PaymentMethodSelectorDemo() {
  const [selectedMethod, setSelectedMethod] = React.useState<string | number>(1);

  const paymentMethods = [
    {
      id: 1,
      icon: <VisaMastercardLogo className="h-6 w-auto" />,
      label: "Visa / Mastercard **** 8237",
      description: "Pay directly with Pakistani debit or credit card",
    },
    {
      id: 2,
      icon: <JazzCashLogo className="h-5 w-auto" />,
      label: "JazzCash Mobile Account",
      description: "Approve payment with your JazzCash mobile MPIN",
    },
    {
      id: 3,
      icon: <EasypaisaLogo className="h-5 w-auto" />,
      label: "EasyPaisa Mobile Account",
      description: "Fast 1-tap authorization from EasyPaisa app",
    },
  ];

  return (
    <div className="flex min-h-[450px] w-full items-center justify-center bg-gray-50/50 p-4">
      <PaymentMethodSelector
        title="Choose Pakistani Payment Method"
        actionText="Add New Method"
        methods={paymentMethods}
        defaultSelectedId={selectedMethod}
        onActionClick={() => alert("Add new payment method clicked")}
        onSelectionChange={(id) => setSelectedMethod(id)}
        roleTheme="fieldteam"
      />
    </div>
  );
}

export function ModernPaymentFormDemo() {
  return (
    <div className="flex min-h-[500px] w-full items-center justify-center bg-gray-50/50 p-4">
      <RuixenPaymentCard
        planName="Pro Crew Plan"
        amount={750}
        points={300}
        roleTheme="fieldteam"
      />
    </div>
  );
}

export default ModernPaymentFormDemo;
