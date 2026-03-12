import AppLogoIcon from "@/components/app-logo-icon";

export default function AppLogo() {
  return (
    <>
      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary">
        <AppLogoIcon className="size-4 fill-current text-white" />
      </div>
      <div className="ml-1 grid flex-1 text-left text-sm">
        <span className="truncate font-bold leading-tight tracking-tight">Tasks</span>
      </div>
    </>
  );
}
