import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const Card: React.FC<CardProps & { variant?: 'blue' | 'pink' | 'grey' | 'white' }> = ({ 
  children, 
  className, 
  title, 
  subtitle, 
  icon,
  variant = 'white'
}) => {
  const variantStyles = {
    white: "bg-white",
    blue: "bg-card-blue",
    pink: "bg-card-pink",
    grey: "bg-card-grey",
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card p-6", variantStyles, className)}
    >
      {(title || icon) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-bold text-text-primary tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs font-medium text-text-secondary">{subtitle}</p>}
          </div>
          {icon && <div className="p-2 bg-white/80 rounded-xl text-text-secondary shadow-sm">{icon}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className }) => {
  const styles = {
    ACTIVE: "bg-status-active text-status-active-text",
    RENEW_TODAY: "bg-status-warning text-status-warning-text",
    EXPIRED: "bg-status-error text-status-error-text",
    NO_POLICY: "bg-status-neutral text-status-neutral-text",
  }[status] || "bg-status-neutral text-status-neutral-text";

  return (
    <span className={cn("status-chip", styles, className)}>
      {status.replace('_', ' ')}
    </span>
  );
};
