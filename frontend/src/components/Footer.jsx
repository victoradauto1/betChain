export default function Footer() {
  
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-black text-gray-400">

      {/* Upper section */}
      <div className="w-full py-6 flex flex-col items-center">
        <div className="flex items-center gap-8">

          <p className="text-sm">&copy; {currentYear} BetChain</p>

          <nav className="flex gap-6">
            <a href="/" className="hover:text-white transition">
              Home
            </a>
            <a href="/about" className="hover:text-white transition">
              About
            </a>
          </nav>

        </div>
      </div>

      {/* Divider line */}
      <div className="w-full h-px bg-white/10"></div>

      {/* Lower section */}
      <div className="w-full py-10 px-6 bg-black/90 border-t border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">

          {/* Social icons */}
          <div className="flex items-center gap-6">

            <a href="javascript:void(0)" className="hover:text-white transition">
              <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12a10 10 0 1 0-11.5 9.9v-7h-2v-3h2v-2.3c0-2 1.2-3.1 3-3.1.9 0 1.8.1 2 .1v2.3h-1.1c-1 0-1.3.6-1.3 1.2V12h2.5l-.4 3h-2.1v7A10 10 0 0 0 22 12z" />
              </svg>
            </a>

            <a href="javascript:void(0)" className="hover:text-white transition">
              <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 0 1-3.1 1.5A4.48 4.48 0 0 0 16.5 3c-2.5 0-4.5 2-4.5 4.4 0 .3 0 .7.1 1A12.9 12.9 0 0 1 3 4s-4 9 5 13a13.4 13.4 0 0 1-8 2c9 5 20 0 20-11.5v-.5A7.7 7.7 0 0 0 23 3z" />
              </svg>
            </a>

            <a href="javascript:void(0)" className="hover:text-white transition">
              <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 2C4.2 2 2 4.2 2 7v10c0 2.8 2.2 5 5 5h10c2.8 0 5-2.2 5-5V7c0-2.8-2.2-5-5-5H7zm10 2c1.7 0 3 1.3 3 3v10c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3V7c0-1.7 1.3-3 3-3h10zm-5 3.5A4.5 4.5 0 1 0 16.5 12 4.49 4.49 0 0 0 12 7.5zm0 7.3A2.8 2.8 0 1 1 14.8 12 2.8 2.8 0 0 1 12 14.8zm4.8-8.9a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1z" />
              </svg>
            </a>

            <a href="javascript:void(0)" className="hover:text-white transition">
              <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.6 3.2H4.4A4.4 4.4 0 0 0 0 7.6v8.8A4.4 4.4 0 0 0 4.4 20.8h15.2a4.4 4.4 0 0 0 4.4-4.4V7.6a4.4 4.4 0 0 0-4.4-4.4zM9.8 15.6V8.4l6.4 3.6-6.4 3.6z" />
              </svg>
            </a>

            <a href="javascript:void(0)" className="hover:text-white transition">
              <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.45 20.45h-3.6v-5.4c0-1.3 0-3-1.9-3s-2.1 1.5-2.1 2.9v5.4h-3.6V9h3.4v1.6h.1a3.7 3.7 0 0 1 3.3-1.8c3.5 0 4.1 2.3 4.1 5.2v6.4zM5.34 7.43A2.07 2.07 0 1 1 7.4 5.36a2.06 2.06 0 0 1-2.06 2.07zM7.14 20.45H3.54V9h3.6v11.45z" />
              </svg>
            </a>

          </div>

          <p className="text-center text-sm leading-relaxed max-w-2xl text-gray-500">
            <strong className="text-gray-300">Play responsibly!</strong><br />
            Gambling can be harmful if not kept under control.
          </p>

        </div>
      </div>

    </footer>
  );
}
