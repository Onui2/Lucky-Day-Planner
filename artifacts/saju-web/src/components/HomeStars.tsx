import { Sparkle } from "lucide-react";

/** Sparse, crisp decoration stays outside the main reading column. */
export default function HomeStars() {
  return (
    <div className="home-celestial-background pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden" aria-hidden="true">
      <Sparkle className="absolute left-[7%] top-32 h-5 w-5 text-primary/30 sm:left-[9%] sm:top-44 sm:h-7 sm:w-7" strokeWidth={1} />
      <Sparkle className="absolute right-[8%] top-24 h-4 w-4 text-primary/25 sm:right-[12%] sm:top-32 sm:h-5 sm:w-5" strokeWidth={1} />
      <Sparkle className="absolute right-[4%] top-80 hidden h-8 w-8 text-primary/20 sm:block" strokeWidth={1} />
      <span className="absolute left-[3%] top-64 h-1 w-1 rounded-full bg-primary/25 sm:left-[5%]" />
      <span className="absolute right-[17%] top-56 h-1 w-1 rounded-full bg-primary/20" />
      <span className="absolute left-[18%] top-24 h-0.5 w-0.5 rounded-full bg-primary/30" />
    </div>
  );
}
