import { motion } from "framer-motion";

/**
 * A visible insertion indicator that shows exactly where a dragged card will
 * land. Rendered between/above cards while dragging over a column.
 */
export function DropIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scaleX: 0.6 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0.6 }}
      transition={{ duration: 0.15 }}
      className="my-1 h-1 w-full origin-left rounded-full bg-primary"
      aria-hidden
    />
  );
}
