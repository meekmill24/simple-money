"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

export function CTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <section id="signup" className="py-24 lg:py-32 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
            Start managing your money smarter today
          </h2>
          <p className="mt-6 text-lg text-primary-foreground/70 text-pretty">
            Join over 10,000 users who have transformed their financial lives.
            No credit card required.
          </p>

          {/* Signup form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10"
          >
            {!submitted ? (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 px-5 py-4 rounded-full bg-primary-foreground text-primary placeholder:text-primary/50 outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-6 py-3 text-accent-foreground"
              >
                <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                  <Check className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="font-medium">
                  Thanks! Check your email to get started.
                </span>
              </motion.div>
            )}

            <p className="mt-4 text-sm text-primary-foreground/50">
              Free forever. No credit card required.
            </p>
          </motion.div>

          {/* Benefits */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-primary-foreground/70">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent" />
              <span>Free 14-day trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent" />
              <span>No setup fees</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
