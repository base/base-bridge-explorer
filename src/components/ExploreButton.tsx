export const ExploreButton = ({
  onClick,
  disabled,
  isLoading,
}: {
  onClick: () => Promise<void>;
  disabled: boolean;
  isLoading: boolean;
}) => {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled}
      className="h-12 px-5 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: "var(--brand)" }}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        "Explore"
      )}
    </button>
  );
};
