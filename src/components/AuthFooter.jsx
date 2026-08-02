import { useState } from 'react';

export default function AuthFooter() {
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <>
      <footer className="auth-page-footer">
        <div className="auth-footer-socials">
          <a
            href="https://www.instagram.com/ben_tetteh_ae"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="auth-footer-icon"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
              <circle cx="12" cy="12" r="4.3" />
              <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
            </svg>
          </a>

          <a
            href="https://github.com/DHEBIT"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="auth-footer-icon"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.49 2.87 8.3 6.84 9.65.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.57 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.15-4.56-5.11 0-1.13.39-2.05 1.03-2.77-.1-.26-.45-1.32.1-2.75 0 0 .84-.28 2.75 1.06a9.24 9.24 0 0 1 5 0c1.91-1.34 2.75-1.06 2.75-1.06.55 1.43.2 2.49.1 2.75.64.72 1.03 1.64 1.03 2.77 0 3.97-2.34 4.85-4.57 5.1.36.32.68.95.68 1.92 0 1.39-.01 2.51-.01 2.85 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.2C22 6.58 17.52 2 12 2Z" />
            </svg>
          </a>

          <a
            href="mailto:drahbernard5@gmail.com"
            aria-label="Email"
            className="auth-footer-icon"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
              <path d="M3.5 6.5 12 13l8.5-6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        <button type="button" className="auth-footer-terms-btn" onClick={() => setIsTermsOpen(true)}>
          Terms & Conditions
        </button>

        <p className="auth-footer-signature">
          Made by BernardDrah 💜 2026
        </p>
      </footer>

      {isTermsOpen && (
        <div className="auth-terms-modal-backdrop" onClick={() => setIsTermsOpen(false)}>
          <div className="auth-terms-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="auth-terms-close" onClick={() => setIsTermsOpen(false)} aria-label="Close terms">
              ×
            </button>
            <h3>Terms & Conditions</h3>
            <p>By continuing, you agree to this app's internal use terms.</p>
            <p>Company data entered here is confidential and intended for authorized personnel only.</p>
            <p>Do not share login details or submit sensitive information outside approved company workflows.</p>
          </div>
        </div>
      )}
    </>
  );
}