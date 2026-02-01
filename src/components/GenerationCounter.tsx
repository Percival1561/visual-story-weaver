import { motion } from "framer-motion";
import { Sparkles, Crown } from "lucide-react";

interface GenerationCounterProps {
  used: number;
  limit: number | null;
  hasSubscription: boolean;
}

export function GenerationCounter({ used, limit, hasSubscription }: GenerationCounterProps) {
  if (hasSubscription) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30"
      >
        <Crown className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">Unlimited</span>
      </motion.div>
    );
  }

  if (limit === null) return null;

  const remaining = Math.max(0, limit - used);
  const percentage = (remaining / limit) * 100;
  
  let colorClass = "text-primary";
  let bgClass = "bg-primary/10 border-primary/30";
  
  if (percentage <= 25) {
    colorClass = "text-destructive";
    bgClass = "bg-destructive/10 border-destructive/30";
  } else if (percentage <= 50) {
    colorClass = "text-orange-500";
    bgClass = "bg-orange-500/10 border-orange-500/30";
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${bgClass}`}
    >
      <Sparkles className={`w-4 h-4 ${colorClass}`} />
      <span className={`text-sm font-medium ${colorClass}`}>
        {remaining} / {limit} left
      </span>
    </motion.div>
  );
}
