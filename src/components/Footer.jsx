import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg)] py-6 text-sm text-[var(--text)]">
      <div className="max-w-5xl mx-auto px-5 text-center">
        <nav className="flex justify-center gap-6 mb-3">
          <Link
            to="/terms"
            className="text-[var(--muted)] hover:text-[var(--text)] hover:underline transition"
          >
            Terms
          </Link>
          <Link
            to="/privacy"
            className="text-[var(--muted)] hover:text-[var(--text)] hover:underline transition"
          >
            Privacy
          </Link>
          <Link
            to="/cookies"
            className="text-[var(--muted)] hover:text-[var(--text)] hover:underline transition"
          >
            Cookies
          </Link>
        </nav>

        <div className="text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} PneumEvolve
        </div>
      </div>
    </footer>
  );
}