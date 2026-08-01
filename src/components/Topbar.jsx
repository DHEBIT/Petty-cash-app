import { useAuth } from '../context/AuthContext.jsx';

export default function Topbar({ title, subtitle }) {
  const { profile, signOut } = useAuth();
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-user">
        <div className="topbar-user-info">
          <span className="topbar-user-name">{profile?.full_name}</span>
          <span className="topbar-user-role">{profile?.role}</span>
        </div>
        <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
      </div>
    </header>
  );
} 
