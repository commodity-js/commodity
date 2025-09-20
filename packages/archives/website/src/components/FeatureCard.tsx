import { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  color
}: FeatureCardProps) {
  return (
    <div className="group bg-scarcity-dark-lighter/50 backdrop-blur-sm border border-scarcity-gray/30 rounded-lg p-6 hover:border-scarcity-orange/50 transition-all duration-300 hover:transform hover:scale-105">
      <div
        className={`${color} mb-4 group-hover:scale-110 transition-transform duration-300`}
      >
        {icon}
      </div>

      <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-scarcity-amber transition-colors">
        {title}
      </h3>

      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
