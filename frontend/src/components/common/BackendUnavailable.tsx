import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BackendUnavailableProps {
  moduleName: string;
  endpoint?: string;
  status?: number;
  errorMessage?: string;
  onRetry?: () => void;
}

export const BackendUnavailable: React.FC<BackendUnavailableProps> = ({
  moduleName,
  endpoint,
  status,
  errorMessage,
  onRetry,
}) => {
  const navigate = useNavigate();

  const isNotImplemented = status === 404 || status === 501;
  const isConnectionRefused = status === 0;

  let title = `Backend Service Not Available`;
  if (isNotImplemented) {
    title = `Backend Endpoint Not Implemented`;
  } else if (isConnectionRefused) {
    title = `Backend Connection Failed (Port 3000)`;
  }

  return (
    <div className="p-8 sm:p-12 my-6 bg-[#fffdf9] rounded-2xl border border-amber-300/80 shadow-sm max-w-3xl mx-auto text-center flex flex-col items-center gap-4 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shadow-xs">
        <span className="material-symbols-outlined text-[32px]">
          {isNotImplemented ? 'code_off' : 'cloud_off'}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 max-w-xl">
        <span className="text-[11px] font-mono uppercase font-bold tracking-widest text-amber-900/80">
          Module: {moduleName}
        </span>
        <h2 className="text-xl font-bold text-[#1a2b27] tracking-tight">{title}</h2>
        <p className="text-xs sm:text-sm text-[#4e5c56] leading-relaxed">
          {isNotImplemented
            ? `No backend route or handler has been created on the Rust (Axum) server for the ${moduleName} feature yet.`
            : isConnectionRefused
            ? `Could not establish a connection to the Rust (Axum) API server at http://127.0.0.1:3000. Please ensure the backend is compiled and running on port 3000.`
            : `The backend returned an error while processing the request for ${moduleName}.`}
        </p>
      </div>

      {(endpoint || errorMessage || status !== undefined) && (
        <div className="w-full max-w-lg bg-[#f6eed6]/80 p-3.5 rounded-xl border border-[#d1dbcb] text-left text-xs font-mono space-y-1.5">
          {endpoint && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-[#4e5c56] text-[11px]">Endpoint:</span>
              <span className="font-bold text-[#1a2b27] break-all text-right">{endpoint}</span>
            </div>
          )}
          {status !== undefined && status > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#4e5c56] text-[11px]">HTTP Status:</span>
              <span className="font-bold text-amber-900">
                {status} {status === 404 ? 'Not Found' : status === 501 ? 'Not Implemented' : ''}
              </span>
            </div>
          )}
          {errorMessage && (
            <div className="pt-1.5 border-t border-[#d1dbcb]/60 text-[11px] text-[#4e5c56] break-words">
              Detail: {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-[#2e5d4b] hover:bg-[#243b35] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry Connection</span>
          </button>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-white hover:bg-[#f6eed6] text-[#1a2b27] border border-[#d1dbcb] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">dashboard</span>
          <span>Back to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
