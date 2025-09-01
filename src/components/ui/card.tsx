import * as React from "react"

import { cn } from "@/lib/utils"

// 扩展Card组件的变体和padding选项
interface ExtendedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'elevated' | 'flat' | 'paper';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  onClick?: () => void;
}

const Card = React.forwardRef<
  HTMLDivElement,
  ExtendedCardProps
>(({ 
  className, 
  variant = 'default',
  padding = 'md',
  border = true,
  onClick,
  ...props 
}, ref) => {
  // 变体样式
  const variantClasses = {
    default: "bg-card text-card-foreground shadow-sm",
    hover: "bg-card text-card-foreground shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200",
    elevated: "bg-card text-card-foreground shadow-lg",
    flat: "bg-muted/50 text-card-foreground",
    paper: "bg-paper-cream shadow-paper bg-paper-texture",
  };

  // 内边距
  const paddingClasses = {
    none: "p-0",
    sm: "p-3",
    md: "p-6",
    lg: "p-7",
  };

  // 边框
  const borderClass = border 
    ? "border border-border" 
    : "";

  // 点击状态
  const clickableClass = onClick 
    ? "cursor-pointer active:scale-[0.99] transition-transform" 
    : "";

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg transition-all duration-200",
        variantClasses[variant],
        paddingClasses[padding],
        borderClass,
        clickableClass,
        className
      )}
      onClick={onClick}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
