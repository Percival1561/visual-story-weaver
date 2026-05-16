import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Check, X, Crown, Zap, Image, Share2, Wand2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FAQ from "@/components/landing/FAQ";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100 }
  }
};

const features = [
  { name: "AI Image Generation", free: "10/day", pro: "Unlimited" },
  { name: "Gallery Storage", free: true, pro: true },
  { name: "Create Variations", free: false, pro: true },
  { name: "Public Sharing", free: false, pro: true },
  { name: "High Resolution Output", free: false, pro: true },
  { name: "Priority Processing", free: false, pro: true },
  { name: "Commercial Usage Rights", free: false, pro: true },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const { toast } = useToast();

  const handleStartTrial = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
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

  const handleGetStarted = () => {
    if (user && subscription?.subscribed) {
      navigate("/app");
    } else if (user) {
      handleStartTrial();
    } else {
      navigate("/auth");
    }
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { question: "How does the free trial work?", answer: "Start with a 3-day free trial of our Pro plan. Cancel anytime before the trial ends and you won't be charged." },
      { question: "What AI model do you use for image generation?", answer: "We use state-of-the-art AI models optimized for creative and artistic image outputs from text descriptions." },
      { question: "Can I use the generated images commercially?", answer: "Yes — Pro subscribers have full commercial usage rights for all images they generate." },
      { question: "How many images can I generate?", answer: "Pro subscribers enjoy unlimited image generation with no daily or monthly limits." },
      { question: "Can I share my creations with others?", answer: "Yes, every image can be shared via a unique public link that recipients can view without an account." },
      { question: "What happens to my images if I cancel?", answer: "Your images remain in your gallery, but new generation and Pro features pause until you resubscribe." },
      { question: "How do I cancel my subscription?", answer: "Cancel anytime from your account settings; access remains until the end of the current billing period." },
    ].map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>VisuallyAi — AI Image Generation & Viral Video Clips</title>
        <meta name="description" content="Turn text prompts into stunning AI images and extract viral short clips from your videos. Free tier available, Pro from $9.99/month." />
        <link rel="canonical" href="https://visuallyai.lovable.app/" />
        <meta property="og:title" content="VisuallyAi — AI Image Generation & Viral Video Clips" />
        <meta property="og:description" content="Turn text prompts into stunning AI images and extract viral short clips from your videos." />
        <meta property="og:url" content="https://visuallyai.lovable.app/" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-glow-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-glow-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-glow-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Visionary</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Button onClick={() => navigate("/app")} variant="outline">
                  Open App
                </Button>
              ) : (
                <>
                  <Button onClick={() => navigate("/auth")} variant="ghost">
                    Sign In
                  </Button>
                  <Button onClick={() => navigate("/auth")} className="bg-gradient-primary text-primary-foreground">
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </nav>
        </header>

        <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-6"
          >
            <motion.div 
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border text-sm text-muted-foreground"
            >
              <Zap className="w-4 h-4 text-primary" />
              AI-Powered Image Generation
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight"
            >
              Turn Ideas Into
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">Stunning Visuals</span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              Create beautiful, unique images with the power of AI. Just describe what you imagine, 
              and watch your ideas come to life in seconds.
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="bg-gradient-primary text-primary-foreground shadow-glow text-lg px-8"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" variant="outline" onClick={() => navigate("/app")} className="text-lg px-8">
                  View Examples
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-center mb-4">
              Everything You Need to Create
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Powerful features to help you generate, manage, and share your AI creations
            </motion.p>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <motion.div variants={scaleIn} whileHover={{ y: -8, transition: { duration: 0.2 } }}>
              <Card className="bg-card/50 border-border backdrop-blur-sm h-full transition-shadow hover:shadow-glow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Image className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">AI Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Transform text descriptions into stunning, high-quality images using advanced AI models.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={scaleIn} whileHover={{ y: -8, transition: { duration: 0.2 } }}>
              <Card className="bg-card/50 border-border backdrop-blur-sm h-full transition-shadow hover:shadow-glow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Wand2 className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Style Variations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Create endless variations of your favorite images with one click.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={scaleIn} whileHover={{ y: -8, transition: { duration: 0.2 } }}>
              <Card className="bg-card/50 border-border backdrop-blur-sm h-full transition-shadow hover:shadow-glow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Share2 className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Easy Sharing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Share your creations with anyone via unique public links.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={scaleIn} whileHover={{ y: -8, transition: { duration: 0.2 } }}>
              <Card className="bg-card/50 border-border backdrop-blur-sm h-full transition-shadow hover:shadow-glow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Unlimited Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Generate as many images as you want with your Pro subscription.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </section>

        {/* Pricing Section */}
        <section className="container mx-auto px-4 py-20" id="pricing">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Start with a free trial. Cancel anytime.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-2xl">Free</CardTitle>
                <CardDescription>Start creating today</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span><strong>10 AI generations</strong> per day</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Personal gallery storage</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <X className="w-4 h-4 shrink-0" />
                    <span>No variations</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <X className="w-4 h-4 shrink-0" />
                    <span>No public sharing</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => navigate("/app")}>
                  Start Creating
                </Button>
              </CardFooter>
            </Card>

            {/* Pro Tier */}
            <Card className="bg-card border-primary/50 shadow-glow relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Pro
                </CardTitle>
                <CardDescription>Full creative power</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">$9.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-primary">3-day free trial included</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Unlimited AI image generation</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Personal gallery storage</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Create variations</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Public sharing links</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>High resolution output</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Commercial usage rights</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-gradient-primary text-primary-foreground" onClick={handleGetStarted}>
                  Start Free Trial
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Feature Comparison
          </h2>
          <div className="max-w-3xl mx-auto">
            <Card className="bg-card/50 border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="w-1/2">Feature</TableHead>
                    <TableHead className="text-center">Free</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Crown className="w-4 h-4 text-primary" />
                        Pro
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature) => (
                    <TableRow key={feature.name} className="border-border">
                      <TableCell className="font-medium">{feature.name}</TableCell>
                      <TableCell className="text-center">
                        {typeof feature.free === 'string' ? (
                          <span className="text-sm font-medium text-primary">{feature.free}</span>
                        ) : feature.free ? (
                          <Check className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {typeof feature.pro === 'string' ? (
                          <span className="text-sm font-medium text-primary">{feature.pro}</span>
                        ) : feature.pro ? (
                          <Check className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQ />

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="bg-gradient-primary p-1 max-w-4xl mx-auto">
            <div className="bg-card rounded-lg p-12 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Create?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Join thousands of creators using Visionary to bring their ideas to life.
                Start your free trial today.
              </p>
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="bg-gradient-primary text-primary-foreground shadow-glow"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </Card>
        </section>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-12 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold bg-gradient-primary bg-clip-text text-transparent">Visionary</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Visionary. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
