import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 py-6 text-sm">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <nav className="flex justify-center gap-6 mb-3">
          <Link to="/terms" className="hover:underline">Terms</Link>
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          <Link to="/cookies" className="hover:underline">Cookies</Link>
        </nav>
        <div className="opacity-70">
          © {new Date().getFullYear()} PneumEvolve
        </div>
      </div>
    </footer>
  );
}