import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Pill-style notifications: inverted colours (light pill on dark theme, dark pill on light theme),
// centred text with an emoji marker, shown at the top of the screen.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      offset={16}
      mobileOffset={12}
      icons={{ success: "✅", error: "❌", warning: "⚠️", info: "ℹ️", loading: "⏳" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !w-fit !max-w-[88vw] !mx-auto !justify-center !gap-2 !rounded-full !border-0 !bg-foreground !px-6 !py-3 !text-center !text-base !font-semibold !leading-snug !text-background !shadow-xl",
          icon: "!m-0 !h-auto !w-auto !text-xl",
          content: "!text-center",
          title: "!text-background",
          description: "!text-background/80",
          actionButton: "!rounded-full !bg-background !text-foreground",
          cancelButton: "!rounded-full !bg-muted !text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
