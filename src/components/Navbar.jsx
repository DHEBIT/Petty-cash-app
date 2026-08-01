import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Navbar({ links = [] }) {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <span className="navbar-mark">PC</span>
          <span className="navbar-title">Petty Cash Ledger</span>
        </div>
        <div className="navbar-links navbar-links-desktop">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="navbar-link">{link.label}</a>
          ))}
        </div>
      </div>

      <div className="navbar-right">
        <NotificationBell />
        <span className="navbar-user-name navbar-user-desktop">
          {profile?.full_name}
          <span className="navbar-user-role">{profile?.role}</span>
        </span>
        <button className="btn btn-ghost btn-sm navbar-signout-desktop" onClick={signOut}>Sign out</button>
        <button className="navbar-hamburger" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <div className="navbar-mobile-menu">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <div className="navbar-mobile-user">{profile?.full_name} — {profile?.role}</div>
          <button className="btn btn-ghost btn-block" onClick={signOut}>Sign out</button>
        </div>
      )}
    </nav>
  );
} 
