"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-muted/50 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              Now with AI-powered insights
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance leading-tight">
              Money management,{" "}
              <span className="text-muted-foreground">simplified.</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed text-pretty">
              Take control of your finances with intelligent tracking, automated
              budgets, and real-time insights. Built for people who want to do
              more with their money.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="#signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:gap-3"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-border px-8 py-4 text-base font-medium text-foreground hover:bg-secondary transition-colors"
              >
                See How It Works
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                <span>Setup in 2 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span>10K+ active users</span>
              </div>
            </div>
          </motion.div>

          {/* Right content - App preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Phone mockup */}
              <div className="relative bg-card rounded-3xl shadow-2xl border border-border p-4 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-secondary rounded-2xl p-6">
                  {/* App header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Balance
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        $24,562.00
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-accent text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      +12.5%
                    </div>
                  </div>

                  {/* Chart placeholder */}
                  <div className="h-32 bg-background rounded-xl mb-6 flex items-end justify-around p-4">
                    {[40, 65, 45, 80, 55, 70, 90].map((height, i) => (
                      <motion.div
                        key={i}
                        className="w-6 bg-accent/20 rounded-t-md"
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                      >
                        <div
                          className="w-full bg-accent rounded-t-md"
                          style={{ height: "60%" }}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Send", icon: "arrow-up" },
                      { label: "Request", icon: "arrow-down" },
                      { label: "Insights", icon: "chart" },
                    ].map((action, i) => (
                      <motion.div
                        key={action.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                        className="bg-background rounded-xl p-3 text-center hover:bg-muted transition-colors cursor-pointer"
                      >
                        <div className="h-8 w-8 bg-accent/10 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <div className="h-3 w-3 bg-accent rounded-full" />
                        </div>
                        <p className="text-xs font-medium text-foreground">
                          {action.label}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
                className="absolute -left-8 top-1/2 -translate-y-1/2 bg-card rounded-2xl shadow-xl border border-border p-4 hidden lg:block"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-accent/10 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Savings Goal
                    </p>
                    <p className="text-xs text-muted-foreground">
                      $2,450 / $5,000
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "49%" }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
