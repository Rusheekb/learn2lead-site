
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
  count?: boolean;
}

function Badge({ className, variant, pulse, count, children, ...props }: BadgeProps) {
  const baseClasses = cn(badgeVariants({ variant }), className);

  // Filter out React HTML event handlers that conflict with framer-motion
  const { onAnimationStart, onDragStart, onDragEnd, onDrag, ...safeProps } = props as any;

  if (pulse) {
    return (
      <motion.div
        className={cn(baseClasses, "relative")}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        {...safeProps}
      >
        {/* Pulse ring effect */}
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: "currentColor",
            opacity: 0,
          }}
          animate={{
            scale: [1, 1.5],
            opacity: [0.4, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
        {children}
      </motion.div>
    )
  }

  if (count) {
    return (
      <motion.div
        className={baseClasses}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 25,
        }}
        whileHover={{ scale: 1.1 }}
        {...safeProps}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={baseClasses} {...props}>
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
