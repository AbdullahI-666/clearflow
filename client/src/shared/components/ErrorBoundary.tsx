import React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export const ErrorBoundary = () => {
  const error = useRouteError();

  let errorMessage = 'An unexpected error occurred.';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText || error.data?.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-md bg-[#0e121b]/90 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5 shadow-lg shadow-rose-500/5">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <span className="text-xs font-mono uppercase tracking-widest text-white/40 mb-1">
          Error {errorStatus}
        </span>
        <h2 className="text-xl font-bold tracking-tight text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-xs text-white/60 mb-6 font-mono bg-white/5 p-3 rounded-lg w-full break-all border border-white/5">
          {errorMessage}
        </p>

        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors border border-white/10"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
          <Link
            to="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
