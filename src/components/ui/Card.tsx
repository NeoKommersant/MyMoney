import React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode };

export default function Card({ className = "", children, ...rest }: Props) {
  return (
    <div className={`glass-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

