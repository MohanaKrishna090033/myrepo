import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export function AnimatedNumber({ value, suffix = "", prefix = "", decimals = 0 }: { value: number, suffix?: string, prefix?: string, decimals?: number }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => 
    `${prefix}${current.toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  if (!isClient) return <span>{prefix}{value.toFixed(decimals)}{suffix}</span>;

  return <motion.span>{display}</motion.span>;
}
