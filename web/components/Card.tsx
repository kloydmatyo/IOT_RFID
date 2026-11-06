import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  danger?: boolean;
}

export function Card({ children, className = "", danger = false }: CardProps) {
  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${danger ? "rgba(239,68,68,.3)" : "var(--border)"}`,
      }}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  badge?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, badge, action }: CardHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="flex items-center gap-2">
        {badge}
        {action}
      </div>
    </div>
  );
}

export function CardBody({ children, noPad = false }: { children: ReactNode; noPad?: boolean }) {
  return <div className={noPad ? "" : "p-5"}>{children}</div>;
}

export function CardFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className="px-5 py-3 text-center"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}
