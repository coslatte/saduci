import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/molecules/Card";

interface LinkCardProps {
  label: string;
  href: string;
  icon?: React.ReactNode;
  description?: string;
  className?: string;
  target?: string;
  iconPosition?: "left" | "top";
}

/**
 * LinkCard
 *
 * Small card that links to an external or internal resource. Renders an icon
 * slot, a title and optional description. By default links open in a new tab
 * (`target="_blank"`) unless a different `target` is provided.
 *
 * @param label - visible title of the link card
 * @param href - destination URL
 * @param icon - optional icon node displayed in the left slot
 * @param description - optional secondary text shown below the title
 * @param className - extra classes applied to the Card root
 * @param target - anchor target (defaults to `_blank`)
 * Used in X case: dashboard shortcut cards linking to tools or resources.
 */
export function LinkCard({
  label,
  href,
  icon,
  description,
  className,
  target = "_blank",
  iconPosition = "left",
}: LinkCardProps) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className="group"
    >
      <Card
        className={cn(
          "group flex gap-4 transition-all hover:border-primary-500",
          iconPosition === "left"
            ? "flex-row items-start"
            : "flex-col items-center text-center",
          className,
        )}
      >
        <div className="flex items-center justify-center transition-colors rounded-lg size-10 shrink-0 bg-slate-100 text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-700">
          {icon}
        </div>

        <div>
          <p className="text-(length:--font-size-sm) font-semibold text-slate-800 group-hover:text-primary-700">
            {label}
          </p>
          {description && (
            <p className="mt-0.5 text-(length:--font-size-xs) text-slate-500">
              {description}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default LinkCard;
