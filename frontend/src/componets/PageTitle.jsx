"use client";

export default function PageTitle({ children, glow = false, shine = false }) {
  const effectClass =
    glow ? "glow-title" :
    shine ? "shine-title" :
    "";

  return (
    <h1 className={`text-3xl font-bold mb-8 ${effectClass}`}>
      {children}
    </h1>
  );
}
