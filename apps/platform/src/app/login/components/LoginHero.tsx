import Image from "next/image";
import { cn } from "@/lib/utils";

interface LoginHeroProps {
  className?: string;
}

/**
 * Renders the decorative hero illustration for the login screen.
 *
 * @param props.className - Optional classes to extend the hero wrapper.
 */
export default function LoginHero({ className }: LoginHeroProps) {
  return (
    <figure
      aria-hidden="true"
      className={cn(
        "relative aspect-4/3 w-full overflow-hidden rounded-3xl shadow-2xl motion-safe:animate-[slide-in-down_0.7s_ease-out_forwards]",
        className,
      )}
    >
      <Image
        src="/pics/login-welcome.jpg"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 60vw, (min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
    </figure>
  );
}
