import React from 'react';
import { Home, ShoppingBag, ArrowLeft, Search } from 'lucide-react';

interface NotFoundViewProps {
  onNavigate: (path: string) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Search className="w-10 h-10" />
        </div>
        
        <div>
          <span className="text-xs uppercase font-mono font-bold tracking-widest text-cyan-500">HTTP 404</span>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">Page Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 leading-relaxed">
            The resource, product, or page you requested does not exist on the NEXOVIRA platform.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </button>
          <button
            onClick={() => onNavigate('/marketplace')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Marketplace Catalog</span>
          </button>
        </div>
      </div>
    </div>
  );
};
