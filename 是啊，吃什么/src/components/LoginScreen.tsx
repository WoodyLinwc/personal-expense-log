interface LoginScreenProps {
  onSignIn: () => void;
  error: string | null;
}

export function LoginScreen({ onSignIn, error }: LoginScreenProps) {
  return (
    <div className="w-full h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans flex items-center justify-center relative overflow-hidden">
      <div className="absolute -bottom-16 -left-16 w-64 h-64 border border-black rounded-full opacity-5 pointer-events-none"></div>
      <div className="absolute top-1/2 -right-32 w-80 h-80 border border-black rounded-full opacity-5 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tighter">
          是啊，吃什么。
        </h1>
        <p className="text-sm opacity-60 max-w-xs">
          Sign in with your Google account to keep your records synced and
          accessible from anywhere.
        </p>

        <button
          onClick={onSignIn}
          className="flex items-center gap-3 bg-white border border-black/10 shadow-sm px-6 py-3 rounded-full font-bold text-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#FFC107"
              d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
              fill="#FF3D00"
              d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
          </svg>
          Sign in with Google
        </button>

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
