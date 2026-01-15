import { SignIn, SignUp } from '@clerk/clerk-react';
import { useState } from 'react';

export const AuthPage = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <img src="/logo.svg" alt="gil0" className="h-16 w-auto mx-auto mb-4" />
        <p className="text-sm text-muted-foreground mt-1">Track your video game collection</p>
      </div>

      {/* Auth Forms */}
      <div className="w-full max-w-md">
        {mode === 'signin' ? (
          <SignIn 
            appearance={{
              variables: {
                colorPrimary: '#f97316',
                colorBackground: '#1c1c1c',
                colorInputBackground: '#2a2a2a',
                colorInputText: '#ffffff',
                colorText: '#ffffff',
                colorTextSecondary: '#a1a1aa',
              },
              elements: {
                rootBox: 'w-full',
                card: 'bg-[#1c1c1c] border border-zinc-700 shadow-2xl',
                headerTitle: 'text-white',
                headerSubtitle: 'text-zinc-400',
                formButtonPrimary: 'bg-orange-500 hover:bg-orange-600 text-white',
                formFieldInput: 'bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500',
                formFieldLabel: 'text-zinc-300',
                footerActionLink: 'text-orange-500 hover:text-orange-400',
                socialButtonsBlockButton: 'bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700',
                socialButtonsBlockButtonText: 'text-white',
                dividerLine: 'bg-zinc-700',
                dividerText: 'text-zinc-500',
                identityPreviewText: 'text-white',
                identityPreviewEditButton: 'text-orange-500',
                formFieldInputShowPasswordButton: 'text-zinc-400',
                alertText: 'text-zinc-300',
                formResendCodeLink: 'text-orange-500',
              },
            }}
            routing="hash"
          />
        ) : (
          <SignUp 
            appearance={{
              variables: {
                colorPrimary: '#f97316',
                colorBackground: '#1c1c1c',
                colorInputBackground: '#2a2a2a',
                colorInputText: '#ffffff',
                colorText: '#ffffff',
                colorTextSecondary: '#a1a1aa',
              },
              elements: {
                rootBox: 'w-full',
                card: 'bg-[#1c1c1c] border border-zinc-700 shadow-2xl',
                headerTitle: 'text-white',
                headerSubtitle: 'text-zinc-400',
                formButtonPrimary: 'bg-orange-500 hover:bg-orange-600 text-white',
                formFieldInput: 'bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500',
                formFieldLabel: 'text-zinc-300',
                footerActionLink: 'text-orange-500 hover:text-orange-400',
                socialButtonsBlockButton: 'bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700',
                socialButtonsBlockButtonText: 'text-white',
                dividerLine: 'bg-zinc-700',
                dividerText: 'text-zinc-500',
                identityPreviewText: 'text-white',
                identityPreviewEditButton: 'text-orange-500',
                formFieldInputShowPasswordButton: 'text-zinc-400',
                alertText: 'text-zinc-300',
                formResendCodeLink: 'text-orange-500',
              },
            }}
            routing="hash"
          />
        )}

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {mode === 'signin' 
              ? "Don't have an account? Sign up" 
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-3 gap-6 text-center max-w-md">
        <div>
          <div className="text-2xl mb-1">📊</div>
          <p className="text-xs text-muted-foreground">Track Values</p>
        </div>
        <div>
          <div className="text-2xl mb-1">💰</div>
          <p className="text-xs text-muted-foreground">Real Prices</p>
        </div>
        <div>
          <div className="text-2xl mb-1">📱</div>
          <p className="text-xs text-muted-foreground">Mobile Ready</p>
        </div>
      </div>
    </div>
  );
};
