import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Sparkles, Check, ImageIcon, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LimitReachedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: 'signup' | 'pro';
}

const cardShake = {
  initial: { x: 0 },
  shake: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: {
      duration: 0.5,
      ease: "easeInOut" as const,
    }
  }
};

const glowPulse = {
  initial: { boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)" },
  animate: {
    boxShadow: [
      "0 0 20px rgba(139, 92, 246, 0.3)",
      "0 0 40px rgba(139, 92, 246, 0.6)",
      "0 0 20px rgba(139, 92, 246, 0.3)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const,
    }
  }
};

const features = [
  { icon: ImageIcon, text: "Unlimited AI image generation" },
  { icon: Sparkles, text: "All art styles unlocked" },
  { icon: Share2, text: "Public sharing & gallery" },
  { icon: Crown, text: "Commercial usage rights" },
];

export function LimitReachedModal({ open, onOpenChange, variant }: LimitReachedModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignUp = () => {
    onOpenChange(false);
    navigate("/auth");
  };

  const handleStartTrial = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: error.message || "Could not start checkout.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-background border-border">
        <AnimatePresence mode="wait">
          {variant === 'signup' ? (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <DialogHeader className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="mx-auto w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4"
                >
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <DialogTitle className="text-2xl">Ready to Create Magic?</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Sign up in seconds to start generating stunning AI images
                </DialogDescription>
              </DialogHeader>

              <motion.div
                variants={cardShake}
                initial="initial"
                animate="shake"
              >
                <Card className="p-6 bg-card border-primary/30 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    variants={glowPulse}
                    initial="initial"
                    animate="animate"
                    style={{ borderRadius: 'inherit' }}
                  />
                  <div className="relative z-10">
                    <div className="text-center mb-4">
                      <span className="text-4xl font-bold text-foreground">8</span>
                      <p className="text-sm text-muted-foreground">Free daily generations</p>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        No credit card required
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        Save images to your personal gallery
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        Access your creations from any device
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        Takes less than 30 seconds
                      </li>
                    </ul>
                    <Button 
                      onClick={handleSignUp} 
                      className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                      size="lg"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Get Started Free
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-3">
                      Join thousands of creators using Visionary
                    </p>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="pro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <DialogHeader className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="mx-auto w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4"
                >
                  <Crown className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <DialogTitle className="text-2xl">Unlock Unlimited Creativity</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  You've used all your free generations. Upgrade to Pro for unlimited access!
                </DialogDescription>
              </DialogHeader>

              <motion.div
                variants={cardShake}
                initial="initial"
                animate="shake"
              >
                <Card className="p-6 bg-card border-primary/50 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    variants={glowPulse}
                    initial="initial"
                    animate="animate"
                    style={{ borderRadius: 'inherit' }}
                  />
                  <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-bl-lg">
                    3-DAY FREE TRIAL
                  </div>
                  <div className="relative z-10">
                    <div className="text-center mb-4 pt-2">
                      <span className="text-sm text-muted-foreground line-through">$14.99</span>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-foreground">$9.99</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    </div>
                    <ul className="space-y-3 mb-6">
                      {features.map((feature, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-3 text-sm"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <feature.icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-foreground">{feature.text}</span>
                        </motion.li>
                      ))}
                    </ul>
                    <Button 
                      onClick={handleStartTrial} 
                      className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                      size="lg"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Start 3-Day Free Trial
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-3">
                      Cancel anytime. No charges during trial.
                    </p>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
