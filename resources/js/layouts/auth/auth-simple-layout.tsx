import { Link } from "@inertiajs/react";
import AppLogoIcon from "@/components/app-logo-icon";
import { home } from "@/routes";
import type { AuthLayoutProps } from "@/types";

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-5">
            <Link href={home()} className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary">
                <AppLogoIcon className="size-5 fill-current text-white" />
              </div>
              <span className="sr-only">{title}</span>
            </Link>

            <div className="space-y-1.5 text-center">
              <h1 className="font-bold text-xl tracking-tight">{title}</h1>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
