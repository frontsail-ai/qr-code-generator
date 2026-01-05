export function Header({ onToggleSidebar, sidebarOpen }) {
  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
      <div className="flex items-center px-4 py-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden lg:flex items-center justify-center w-8 h-8 mr-3 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {sidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">QR Code Generator</h1>
      </div>
    </header>
  );
}
