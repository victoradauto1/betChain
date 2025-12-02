"use client";

export default function PageTitle({ children, glow = false, shine = false }) {
  // Determine optional visual effects
  const effectClass = 
    glow ? "glow-title" :
    shine ? "shine-title" :
    "";

  return (
    <h1
      className={`
        text-6xl                   /* Larger, more professional title size */
        font-extrabold            /* Stronger typography */
        tracking-tight            /* Cleaner spacing between letters */
        mb-10                     /* More breathing room */
        text-white                /* Ensures consistent white title */
        ${effectClass}
      `}
    >
      {children}
    </h1>
  );
}
