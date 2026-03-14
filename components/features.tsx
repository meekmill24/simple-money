"use client";

import { motion } from "framer-motion";
import {
  PieChart,
  Wallet,
  Bell,
  TrendingUp,
  Lock,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: PieChart,
    title: "Automated Budgeting",
    description:
      "Set it and forget it. Our AI categorizes your spending and creates personalized budgets that adapt to your lifestyle.",
  },
  {
    icon: Wallet,
    title: "Smart Savings",
    description:
      "Reach your goals faster with intelligent round-ups and automated transfers that work while you sleep.",
  },
  {
    icon: Bell,
    title: "Real-time Alerts",
    description:
      "Stay informed with instant notifications for transactions, bill reminders, and unusual activity.",
  },
  {
    icon: TrendingUp,
    title: "Investment Tracking",
    description:
      "Monitor your portfolio performance and get insights to make smarter investment decisions.",
  },
  {
    icon: Lock,
    title: "Bank-level Security",
    description:
      "Your data is protected with 256-bit encryption, biometric authentication, and continuous fraud monitoring.",
  },
  {
    icon: Smartphone,
    title: "Cross-platform Sync",
    description:
      "Access your finances anywhere. Seamlessly sync across all your devices in real-time.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-secondary/50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Everything you need to manage your money
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Powerful tools designed to give you complete control over your
            financial life.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-card rounded-2xl p-6 lg:p-8 border border-border hover:border-accent/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
