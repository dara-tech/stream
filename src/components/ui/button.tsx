import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

    const variants = {
      default: "bg-white text-black hover:bg-neutral-200 shadow-md",
      secondary: "bg-[#2a2a2a]/90 text-white hover:bg-[#383838] border border-white/10",
      outline: "border border-white/30 text-white hover:bg-white/10",
      ghost: "text-white/80 hover:text-white hover:bg-white/10",
      glass: "bg-black/50 text-white backdrop-blur-md hover:bg-black/70 border border-white/15",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-full",
      md: "h-10 px-5 text-sm rounded-full",
      lg: "h-12 px-7 text-base rounded-full font-semibold",
      icon: "h-10 w-10 rounded-full p-0 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
