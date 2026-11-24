import React from 'react';
import { Outlet, useSearchParams, useLocation } from 'react-router-dom';
import { ShaderBackground } from '@/components/ui/green-shader';
import { cn } from '@/lib/utils';

export const AuthLayout = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const rawRole = (
    searchParams.get('role') || 
    (location.state as any)?.role || 
    (() => {
      try {
        return localStorage.getItem('cf_preferred_role');
      } catch (e) {
        return null;
      }
    })() || 
    ''
  ).toLowerCase();

  const isFieldRole = rawRole === 'fieldteam' || rawRole === 'field' || rawRole === 'crew';
  const isAdmin = rawRole === 'admin';

  const theme = isAdmin ? {
    bgPage: 'bg-[#080312]',
    shaderRole: 'admin' as const,
    vignette: 'from-transparent via-[#080312]/40 to-[#04010a]/85',
    gradient: 'from-[#080312]/30 via-transparent to-[#04010a]/75',
    topGlow: 'bg-purple-500/15',
  } : isFieldRole ? {
    bgPage: 'bg-[#120802]',
    shaderRole: 'fieldteam' as const,
    vignette: 'from-transparent via-[#120802]/40 to-[#090401]/85',
    gradient: 'from-[#120802]/30 via-transparent to-[#090401]/75',
    topGlow: 'bg-amber-500/15',
  } : {
    bgPage: 'bg-[#07130e]',
    shaderRole: 'client' as const,
    vignette: 'from-transparent via-[#07130e]/40 to-[#050e0a]/80',
    gradient: 'from-[#07130e]/30 via-transparent to-[#050e0a]/70',
    topGlow: 'bg-teal-400/10',
  };

  return (
    <div data-auth-page="true" className={cn("auth-layout fixed inset-0 w-full h-full min-h-[100dvh] overflow-y-auto touch-scroll flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 safe-pt safe-pb transition-colors duration-500", theme.bgPage)}>
      {/* Interactive WebGL Aurora Role-Themed Shader Background */}
      <ShaderBackground role={theme.shaderRole} className="fixed inset-0 z-0 pointer-events-auto opacity-90 transition-opacity duration-500" />

      {/* Dark tint overlays */}
      <div className={cn("fixed inset-0 z-0 bg-radial pointer-events-none transition-all duration-500", theme.vignette)} />
      <div className={cn("fixed inset-0 z-0 bg-gradient-to-b pointer-events-none transition-all duration-500", theme.gradient)} />
      <div className={cn("fixed top-0 left-1/2 transform -translate-x-1/2 w-[110vh] h-[50vh] rounded-b-[50%] blur-[90px] pointer-events-none transition-all duration-500", theme.topGlow)} />

      <div className="relative z-10 w-full max-w-[520px] mx-auto my-auto py-4 sm:py-8 flex items-center justify-center">
        <Outlet />
      </div>
    </div>
  );
};
