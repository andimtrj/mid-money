import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

type AuthInvalidCredentialsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
};

export function AuthInvalidCredentialsModal({
  open,
  onOpenChange,
  title = "Invalid credentials",
  description = "Please check your account details and try again.",
  actionLabel = "Try again",
}: AuthInvalidCredentialsModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[340px] rounded-[26px] border-neutral-200 bg-[#fafaf7] p-0 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.35)]">
        <div className="px-6 pt-7 pb-5">
          <AlertDialogHeader className="text-left">
            <div className="mb-4 h-[2px] w-9 bg-neutral-900" />
            <AlertDialogTitle
              className="text-neutral-900 tracking-[-0.02em]"
              style={{ fontSize: 26, lineHeight: 1.12, fontWeight: 300 }}
            >
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription
              className="mt-2 text-neutral-500 tracking-wide"
              style={{ fontSize: 13 }}
            >
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-7">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 w-full rounded-full bg-neutral-900 px-5 text-[11px] uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
            >
              {actionLabel}
            </button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}