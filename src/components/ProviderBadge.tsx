import type { DeliveryProvider } from "../types/kitchen";

const LABELS: Record<DeliveryProvider, string> = {
  swiggy: "Swiggy",
  zomato: "Zomato",
  native: "Store",
};

type Props = {
  provider: DeliveryProvider;
  /** e.g. "Order source" vs "Partner" */
  kind?: "order" | "partner";
  className?: string;
};

export function ProviderBadge({ provider, kind = "order", className = "" }: Props) {
  const label = LABELS[provider];
  const title = kind === "partner" ? `Delivery partner: ${label}` : `Order from ${label}`;
  return (
    <span
      className={`provider-badge provider-badge--${provider} ${className}`.trim()}
      title={title}
    >
      {label}
    </span>
  );
}
