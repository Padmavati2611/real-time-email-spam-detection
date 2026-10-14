import React from 'react';
import { ShieldAlert, Database, RefreshCw, Mail, CheckCircle2, LogIn, LogOut } from 'lucide-react';
import { DbStatus } from '../services/api';

export type ActiveTab = 'overview' | 'monitoring' | 'history' | 'evaluation' | 'project';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  dbStatus: DbStatus | null;
  userEmail: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isAuthenticating: boolean;
  onOpenDbModal: () => void;
  isSyncing: boolean;
  onSyncMailbox: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  dbStatus,
  userEmail,
  onSignIn,
  onSignOut,
  isAuthenticating,
  onOpenDbModal,
  isSyncing,
  onSyncMailbox,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Single Brand Element */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                SpamGuard Email
              </span>
              <span className="text-[11px] text-slate-500 font-medium leading-none">
                Real-Time Gmail API · MongoDB Atlas
              </span>
            </div>
          </div>

          {/* Zone 2: 5 Clean Single-Line Nav Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('overview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard Overview
            </button>
            <button
              onClick={() => onSelectTab('monitoring')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'monitoring'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Email Monitoring
            </button>
            <button
              onClick={() => onSelectTab('history')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Detection History
            </button>
            <button
              onClick={() => onSelectTab('evaluation')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'evaluation'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Model Evaluation
            </button>
            <button
              onClick={() => onSelectTab('project')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'project'
                  ? 'bg-slate-100 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Python Repository & Guide
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Lockup */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* MongoDB status */}
            <button
              onClick={onOpenDbModal}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                dbStatus?.connected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="View MongoDB Atlas connection status"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{dbStatus?.connected ? 'MongoDB Live' : 'Database Config'}</span>
            </button>

            {/* Google Gmail Sign-In / Account status */}
            {userEmail ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onSyncMailbox}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-xs disabled:opacity-50"
                  title="Query Gmail inbox for new incoming messages"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Inbox'}</span>
                </button>

                <button
                  onClick={onSignOut}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  title={`Disconnect Gmail (${userEmail})`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                disabled={isAuthenticating}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs whitespace-nowrap disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isAuthenticating ? 'Connecting...' : 'Authorize Gmail'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center border-t border-slate-100 py-2 overflow-x-auto gap-1">
          <button
            onClick={() => onSelectTab('overview')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onSelectTab('monitoring')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'monitoring' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Monitoring
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'history' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            History
          </button>
          <button
            onClick={() => onSelectTab('evaluation')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'evaluation' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Evaluation
          </button>
          <button
            onClick={() => onSelectTab('project')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'project' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Python Repo
          </button>
        </div>
      </div>
    </header>
  );
};
