export default function Heading({
  title,
  description,
  variant = "default",
}: {
  title: string;
  description?: string;
  variant?: "default" | "small";
}) {
  return (
    <header className={variant === "small" ? "" : "mb-8 space-y-1"}>
      <h2
        className={
          variant === "small"
            ? "mb-0.5 font-semibold text-base tracking-tight"
            : "font-bold text-xl tracking-tight"
        }
      >
        {title}
      </h2>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </header>
  );
}
