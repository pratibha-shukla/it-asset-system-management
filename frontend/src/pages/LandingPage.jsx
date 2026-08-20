import { Link } from 'react-router-dom';
import './LandingPage.css';

const features = [
  { icon: '🖥️', title: 'Asset Tracking',       desc: 'Track laptops, monitors, printers and all IT equipment across every branch in real time.' },
  { icon: '📋', title: 'Request Management',    desc: 'Employees submit asset requests; managers and admins approve or reject with full audit trail.' },
  { icon: '🔔', title: 'Live Notifications',    desc: 'Instant alerts via Kafka + SSE — no page refresh needed. Events pushed the moment they happen.' },
  { icon: '🛡️', title: 'Role-Based Access',     desc: 'Three tiers: Admin manages everything, Manager oversees their team, Employee tracks own assets.' },
  { icon: '📊', title: 'Lifecycle & Finance',   desc: 'Purchase cost, depreciation, warranty expiry and total cost of ownership at a glance.' },
  { icon: '🤖', title: 'AI Assistant',          desc: 'Built-in chat powered by Anthropic Claude — ask questions about assets, policies and requests.' },
  { icon: '📜', title: 'Audit Logs',            desc: 'Every action is recorded with timestamp, user and details. Powered by Hibernate Envers.' },
  { icon: '⏰', title: 'Scheduled Automation',  desc: 'Nightly jobs auto-release assets from terminated employees and flag expiring warranties.' },
];

const stats = [
  { value: '500+', label: 'Assets Tracked' },
  { value: '3',    label: 'Office Branches' },
  { value: '99.9%', label: 'Uptime' },
  { value: '< 1s', label: 'Real-time Alerts' },
];

const roles = [
  {
    icon: '🔴',
    role: 'Admin',
    color: 'landing-role--admin',
    abilities: ['Manage all assets', 'Assign & unassign equipment', 'Approve any request', 'View all audit logs', 'Manage users & branches', 'View lifecycle & finance reports'],
  },
  {
    icon: '🟡',
    role: 'Manager',
    color: 'landing-role--manager',
    abilities: ['View team\'s assets', 'Approve team\'s requests', 'Reject team\'s requests', 'View team statistics', 'Monitor team activity'],
  },
  {
    icon: '🔵',
    role: 'Employee',
    color: 'landing-role--employee',
    abilities: ['Browse available assets', 'Submit asset requests', 'Track request status', 'Chat with AI assistant', 'View own asset history'],
  },
];

export default function LandingPage() {
  return (
    <div className="landing">

      {/* ── Hero ── */}
      <header className="landing-hero">
        <nav className="landing-nav">
          <div className="landing-nav__brand">🖥️ IT Asset Manager</div>
          <Link to="/login" className="landing-nav__btn">Sign In →</Link>
        </nav>

        <div className="landing-hero__content">
          <div className="landing-hero__badge">Enterprise IT Management Platform</div>
          <h1 className="landing-hero__title">
            Manage Every Asset.<br />
            <span className="landing-hero__title--accent">Across Every Branch.</span>
          </h1>
          <p className="landing-hero__sub">
            A full-stack IT asset management system built with Spring Boot, React, Kafka,
            and AI — giving your team real-time visibility over every piece of equipment.
          </p>
          <div className="landing-hero__actions">
            <Link to="/login" className="landing-btn landing-btn--primary">Get Started</Link>
            <a href="#features" className="landing-btn landing-btn--ghost">See Features</a>
          </div>
        </div>

        <div className="landing-hero__scroll">↓</div>
      </header>

      {/* ── Stats ── */}
      <section className="landing-stats">
        {stats.map(s => (
          <div key={s.label} className="landing-stats__item">
            <span className="landing-stats__value">{s.value}</span>
            <span className="landing-stats__label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="landing-section" id="features">
        <div className="landing-section__header">
          <h2>Everything you need to manage IT assets</h2>
          <p>Built for real enterprise workflows — from request to retirement.</p>
        </div>
        <div className="landing-features">
          {features.map(f => (
            <div key={f.title} className="landing-feature-card">
              <span className="landing-feature-card__icon">{f.icon}</span>
              <h3 className="landing-feature-card__title">{f.title}</h3>
              <p className="landing-feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="landing-section landing-section--dark">
        <div className="landing-section__header landing-section__header--light">
          <h2>Three roles. Clear boundaries.</h2>
          <p>Every user sees exactly what they need — nothing more.</p>
        </div>
        <div className="landing-roles">
          {roles.map(r => (
            <div key={r.role} className={`landing-role-card ${r.color}`}>
              <div className="landing-role-card__header">
                <span className="landing-role-card__icon">{r.icon}</span>
                <h3 className="landing-role-card__title">{r.role}</h3>
              </div>
              <ul className="landing-role-card__list">
                {r.abilities.map(a => (
                  <li key={a}>✓ {a}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="landing-section">
        <div className="landing-section__header">
          <h2>Built with modern tech</h2>
        </div>
        <div className="landing-tech">
          {['Spring Boot 3', 'React 18', 'PostgreSQL', 'Apache Kafka', 'JWT + httpOnly Cookie', 'Hibernate Envers', 'Anthropic Claude AI', 'Docker'].map(t => (
            <span key={t} className="landing-tech__tag">{t}</span>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <h2>Ready to take control of your IT assets?</h2>
        <p>Sign in with your company credentials to get started.</p>
        <Link to="/login" className="landing-btn landing-btn--primary landing-btn--lg">Sign In Now →</Link>
        <div className="landing-cta__accounts">
          <span>Demo accounts:</span>
          {/* <code>admin@company.com / Admin@123</code>
          <code>manager1@company.com / Manager1@123</code>
          <code>employee1@company.com / Employee1@123</code> */}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>🖥️ IT Asset Manager</span>
        <span>Built with Spring Boot · React · Kafka · AI</span>
      </footer>
    </div>
  );
}
