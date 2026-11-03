import { cn } from "@/lib/utils";

interface LoginHeroProps {
  className?: string;
}

/**
 * Renders an animated decorative background for the login and registration screens.
 *
 * @param props.className - Optional classes to extend the hero wrapper.
 */
export default function LoginHero({ className }: LoginHeroProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "login-hero relative aspect-4/3 w-full overflow-hidden shadow-2xl motion-safe:animate-[slide-in-down_0.7s_ease-out_forwards]",
        className,
      )}
    >
      <span className="login-hero__orb login-hero__orb--one" />
      <span className="login-hero__orb login-hero__orb--two" />
      <span className="login-hero__orb login-hero__orb--three" />
      <span className="login-hero__glow" />
    </div>
  );
}
