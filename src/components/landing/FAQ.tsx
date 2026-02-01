import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

const faqs = [
  {
    question: "How does the free trial work?",
    answer: "Start with a 3-day free trial of our Pro plan. You'll have full access to all features including unlimited AI image generation, gallery storage, and public sharing. Cancel anytime before the trial ends and you won't be charged."
  },
  {
    question: "What AI model do you use for image generation?",
    answer: "We use state-of-the-art AI models to generate high-quality images from your text descriptions. Our system is optimized for creative and artistic outputs, supporting various styles from photorealistic to abstract art."
  },
  {
    question: "Can I use the generated images commercially?",
    answer: "Yes! With a Pro subscription, you have full commercial usage rights for all images you generate. You can use them for websites, marketing materials, products, and more."
  },
  {
    question: "How many images can I generate?",
    answer: "Pro subscribers enjoy unlimited image generation. There are no daily or monthly limits—create as many images as you need to bring your ideas to life."
  },
  {
    question: "Can I share my creations with others?",
    answer: "Absolutely! Every image you create can be shared via a unique public link. Recipients can view your image without needing an account. You can also make your gallery public or keep it private."
  },
  {
    question: "What happens to my images if I cancel?",
    answer: "Your images remain in your gallery even after cancellation. However, you won't be able to generate new images or access Pro features until you resubscribe. We recommend downloading any images you want to keep."
  },
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel anytime from your account settings. Your subscription will remain active until the end of your current billing period, and you won't be charged again."
  }
];

const FAQ = () => {
  return (
    <section className="container mx-auto px-4 py-20">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="max-w-3xl mx-auto"
      >
        <motion.h2 
          variants={fadeInUp} 
          className="text-3xl sm:text-4xl font-bold text-center mb-4"
        >
          Frequently Asked Questions
        </motion.h2>
        <motion.p 
          variants={fadeInUp} 
          className="text-muted-foreground text-center mb-12"
        >
          Everything you need to know about Visionary
        </motion.p>
        
        <motion.div variants={fadeInUp}>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="text-left hover:no-underline hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default FAQ;
