import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

export default function Topbar({ title, subtitle }) {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(/\s+/)?.[0] || profile?.full_name || 'User';

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-right">
        <div className="topbar-greeting">
          <span>Hi {firstName}</span>
        </div>
        <div className="topbar-avatar">{initials(profile?.full_name)}</div>
        <NotificationBell />
      </div>
    </header>
  );
}
