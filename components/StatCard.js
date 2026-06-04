export default function StatCard({ title, value, icon, variant = "primary" }) {
  const borderStyles = {
    primary: "rgba(59, 130, 246, 0.2)",
    success: "rgba(16, 185, 129, 0.2)",
    warning: "rgba(245, 158, 11, 0.2)",
    danger: "rgba(239, 68, 68, 0.2)"
  };

  const bgStyles = {
    primary: "rgba(59, 130, 246, 0.05)",
    success: "rgba(16, 185, 129, 0.05)",
    warning: "rgba(245, 158, 11, 0.05)",
    danger: "rgba(239, 68, 68, 0.05)"
  };

  const iconColors = {
    primary: "var(--primary)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)"
  };

  const glowStyles = {
    primary: "0 8px 32px 0 rgba(59, 130, 246, 0.08)",
    success: "0 8px 32px 0 rgba(16, 185, 129, 0.08)",
    warning: "0 8px 32px 0 rgba(245, 158, 11, 0.08)",
    danger: "0 8px 32px 0 rgba(239, 68, 68, 0.08)"
  };

  return (
    <div 
      className="glass-panel stat-card"
      style={{
        borderColor: borderStyles[variant],
        background: bgStyles[variant],
        boxShadow: glowStyles[variant]
      }}
    >
      <div className="stat-info">
        <h3>{title}</h3>
        <p>{value}</p>
      </div>
      <div 
        className="stat-icon" 
        style={{ 
          backgroundColor: `rgba(255, 255, 255, 0.03)`, 
          color: iconColors[variant],
          border: `1px solid ${borderStyles[variant]}`
        }}
      >
        {icon}
      </div>
    </div>
  );
}
