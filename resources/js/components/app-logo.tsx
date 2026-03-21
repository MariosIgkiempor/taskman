import AppLogoIcon from "@/components/app-logo-icon";

export default function AppLogo() {
  return (
    <>
      <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-gradient-to-b from-[oklch(0.55_0.16_252)] to-[oklch(0.48_0.18_252)]">
        <AppLogoIcon className="size-4 fill-current text-white" />
      </div>
      <div className="ml-1 grid flex-1 text-left text-sm">
        <span className="truncate font-bold leading-tight tracking-tight">Tasks</span>
      </div>
    </>
  );
}
