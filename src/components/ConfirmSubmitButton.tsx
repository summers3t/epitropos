"use client";

type ConfirmSubmitButtonProps = {
  children: React.ReactNode;
  confirmMessage: string;
  className?: string;
  type?: "submit";
};

export default function ConfirmSubmitButton({
  children,
  confirmMessage,
  className,
  type = "submit",
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type={type}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();

        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}
