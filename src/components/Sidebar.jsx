import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

export default function Sidebar({ links = [] }) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHref, setActiveHref] = useState(typeof window !== 'undefined' ? window.location.hash : '');

  useEffect(() => {
    function onHashChange() { setActiveHref(window.location.hash); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <>
      <button className="sidebar-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button>
      {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
        <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">✕</button>

        <div className="sidebar-profile">
          <div className="sidebar-avatar">{initials(profile?.full_name)}</div>
          <div className="sidebar-user">{profile?.full_name}</div>
          <button className="sidebar-signout btn btn-ghost" onClick={signOut}>Sign out</button>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`sidebar-link${activeHref === link.href ? ' active' : ''}`}
              onClick={() => { setActiveHref(link.href); setMobileOpen(false); }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}