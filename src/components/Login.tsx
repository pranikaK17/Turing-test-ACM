import React from 'react';
import { ArrowRight, User, Lock, ShieldAlert, Zap } from "lucide-react";

interface LoginPageProps {
  onSubmit: (username: string, password: string) => void;
  onCancel?: () => void;
  error?: string;
}

export default function LoginPage({
  onSubmit,
  onCancel,
  error
}: LoginPageProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#0A0A0B] font-mono">
      
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%232A2440' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #00FF9D 1px, transparent 1px),
            linear-gradient(to bottom, #00FF9D 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)',
        }}
      />

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF00E6] rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-pulse" />
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00FF9D] rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <main className="flex-1 flex items-center justify-center z-10 px-6 relative">
        <div className="w-full max-w-md bg-black/60 backdrop-blur-md border border-[#00FF9D]/40 p-8 shadow-[0_0_40px_rgba(0,255,157,0.15)] animate-in fade-in zoom-in duration-500">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-block mb-4 transform -rotate-2">
              <span className="bg-black text-[#00FF9D] border-2 border-[#00FF9D] px-4 py-2 text-xs uppercase tracking-[0.3em] shadow-[4px_4px_0px_#00FF9D]">
                Access_Control
              </span>
            </div>

            <h1 className="text-4xl font-heading text-white leading-none tracking-tighter uppercase">
              Identity<br />
              <span className="text-[#FF00E6]">Auth</span>
            </h1>

            <p className="mt-4 text-gray-400 text-[10px] uppercase tracking-widest">
              Enter credentials to establish uplink
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const username = (form.elements.namedItem("username") as HTMLInputElement).value;
              const password = (form.elements.namedItem("password") as HTMLInputElement).value;
              onSubmit(username, password);
            }}
            className="flex flex-col gap-5"
          >
            {/* User ID Input */}
            <div>
              <label className="block mb-2 text-[10px] uppercase tracking-widest text-gray-500">
                User_ID
              </label>
              <div className="flex items-center gap-3 border border-[#00FF9D]/40 bg-black/80 px-4 py-3 focus-within:border-[#00FF9D] transition-colors">
                <User className="w-4 h-4 text-[#00FF9D]" />
                <input
                  name="username"
                  type="text"
                  required
                  className="w-full bg-transparent outline-none text-white text-sm placeholder-gray-800"
                  placeholder="ID_REQUIRED"
                />
              </div>
            </div>

            {/* Encryption Key Input */}
            <div>
              <label className="block mb-2 text-[10px] uppercase tracking-widest text-gray-500">
                Encryption_Key
              </label>
              <div className="flex items-center gap-3 border border-[#FF00E6]/40 bg-black/80 px-4 py-3 focus-within:border-[#FF00E6] transition-colors">
                <Lock className="w-4 h-4 text-[#FF00E6]" />
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full bg-transparent outline-none text-white text-sm placeholder-gray-800"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-[10px] uppercase animate-pulse">
                <ShieldAlert size={12} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex flex-col gap-4 mt-4">
              <button
                type="submit"
                className="group inline-flex items-center justify-center gap-4 px-10 py-5 bg-[#FF00E6] text-white font-heading text-xl uppercase tracking-widest hover:bg-[#d900c4] active:scale-95 transition-all shadow-[0_10px_20px_-10px_rgba(255,0,230,0.5)]"
              >
                <Zap className="w-5 h-5 fill-current" />
                Initialize Session
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </button>
              
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-gray-600 text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors"
                >
                  [ Abort_Initialization ]
                </button>
              )}
            </div>
          </form>

          {/* Footer Metadata */}
          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <div className="text-[9px] text-gray-600 font-mono uppercase flex justify-center items-center gap-2">
              <span className="w-1 h-1 bg-[#00FF9D] rounded-full animate-ping" />
              ACM_SIGAI_SECURE_LINK_ESTABLISHED
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
