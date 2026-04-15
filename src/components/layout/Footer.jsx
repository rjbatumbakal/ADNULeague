import { Facebook, Mail } from "lucide-react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="bg-theme-contrast text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
        <div className="flex-1">
          <h3 className="text-base font-semibold">Connect with Us</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/90">
            <a
              href="https://www.facebook.com/AdNULideratos"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition hover:text-brand-neon"
            >
              <Facebook className="h-4 w-4" />
              Liderato kan Nueva Atenista of Ateneo de Naga University
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61572174497443"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition hover:text-brand-neon"
            >
              <Facebook className="h-4 w-4" />
              Ateneo de Naga League
            </a>
            <a
              href="mailto:adnuleague@gmail.com"
              className="inline-flex items-center gap-2 transition hover:text-brand-neon"
            >
              <Mail className="h-4 w-4" />
              ADNULeague
            </a>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-base font-semibold">Quick Links</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/90">
            <Link to="/" className="transition hover:text-brand-neon">
              Home
            </Link>
            <Link to="/schedule" className="transition hover:text-brand-neon">
              Schedule
            </Link>
            <Link to="/ranking" className="transition hover:text-brand-neon">
              Ranking
            </Link>
            <Link to="/bracketing" className="transition hover:text-brand-neon">
              Bracketing
            </Link>
            <Link
              to="/more/about#anonymous-concern-form"
              className="transition hover:text-brand-neon"
            >
              Anonymous Concern Form
            </Link>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-base font-semibold">Event Info</h3>
          <div className="mt-4 space-y-2 text-sm text-white/90">
            <p>Ateneo de Naga University</p>
            <p>March 18, 19, 21–23, 2026</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="mb-4 text-center text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Disclaimer:</span>{" "}
            Developed by request for the Ateneo de Naga community. The website&apos;s
            custom codebase, design assets, and intellectual property rights are
            fully retained by the independent student development team.
          </p>
          <div className="text-center text-xs text-white/80">
            © 2026 ADNU League. One Ateneo, One League.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
