import * as React from "react";
import { SocialLinks } from "@/components/ui/social-links";

export default function SocialLinksDemo() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
      <SocialLinks
        links={[
          { platform: "linkedin", href: "https://linkedin.com" },
          { platform: "github", href: "https://github.com" },
          { platform: "instagram", href: "https://instagram.com" },
          { platform: "mail", href: "mailto:test@example.com" },
          { platform: "website", href: "https://example.com" },
        ]}
        floatingButtonColor="bg-slate-700"
      />
    </div>
  );
}
