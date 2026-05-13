import type { ReactNode } from "react";
import type { AdminNavTab, StoreId, StoreSlice } from "../types/kitchen";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

type Props = {
  stores: StoreSlice[];
  selectedStoreId: StoreId;
  navTab: AdminNavTab;
  onSelectStore: (id: StoreId) => void;
  onNav: (tab: AdminNavTab) => void;
  onOpenStore: (id: StoreId) => void;
  onBack: () => void;
  onToggleContrast: () => void;
  highContrast: boolean;
  onLogout: () => void;
  child?: ReactNode;
};

const MOCK_ORDERS = [
  { orderNo: 104, store: "Downtown", recipe: "Margherita", provider: "Swiggy" as const, status: "Cooking" },
  { orderNo: 201, store: "Airport", recipe: "Paneer Tikka", provider: "App" as const, status: "Waiting" },
  { orderNo: 88, store: "Westside", recipe: "Pepperoni", provider: "Zomato" as const, status: "Ready" },
];

export function AdminDashboard({
  stores,
  selectedStoreId,
  navTab,
  onSelectStore,
  onNav,
  onOpenStore,
  onBack,
  onToggleContrast,
  highContrast,
  onLogout,
  child,
}: Props) {
  const selected = stores.find((s) => s.id === selectedStoreId) ?? stores[0]!;
  const aggregate = stores.reduce(
    (acc, s) => ({
      live: acc.live + s.metrics.liveOrders,
      delivered: acc.delivered + s.metrics.deliveredTodayCount,
      revenue: acc.revenue + s.metrics.revenueTodayCents,
      avgDel: acc.avgDel + s.metrics.avgDeliveryMin,
      avgPrep: acc.avgPrep + s.metrics.avgKitchenPrepMin,
    }),
    { live: 0, delivered: 0, revenue: 0, avgDel: 0, avgPrep: 0 },
  );
  const n = stores.length || 1;
  const avgDelivery = Math.round(aggregate.avgDel / n);
  const avgPrep = Math.round(aggregate.avgPrep / n);

  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <div>
          <h1 className="admin-shell__title">Operations admin</h1>
          <p className="admin-shell__sub">All stores — cumulative metrics</p>
        </div>
        <div className="admin-shell__headerActions">
          <label className="admin-store-select">
            <span className="admin-store-select__label">Store focus</span>
            <select
              className="admin-store-select__input"
              value={selectedStoreId}
              onChange={(e) => onSelectStore(e.target.value as StoreId)}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={`btn btn--secondary ${highContrast ? "btn--pressed" : ""}`} onClick={onToggleContrast}>
            High contrast
          </button>
          <button type="button" className="btn btn--ghost" onClick={onLogout}>
            Log out
          </button>
          {child ? (
            <button type="button" className="btn btn--secondary" onClick={onBack}>
              Back to metrics
            </button>
          ) : null}
        </div>
      </header>

      <nav className="admin-nav" aria-label="Admin sections">
        {(
          [
            ["dashboard", "Dashboard"],
            ["orders", "Orders"],
            ["delivery", "Delivery status"],
            ["analytics", "Analytics"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`admin-nav__btn ${navTab === id ? "admin-nav__btn--active" : ""}`}
            onClick={() => onNav(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {child ? (
        <div className="admin-embed">{child}</div>
      ) : (
        <>
          {navTab === "dashboard" ? (
            <>
              <section className="admin-metrics" aria-label="Daily metrics">
                <article className="metric-card">
                  <h2 className="metric-card__label">Total live orders</h2>
                  <p className="metric-card__value">{aggregate.live}</p>
                </article>
                <article className="metric-card">
                  <h2 className="metric-card__label">Delivered today</h2>
                  <p className="metric-card__value">{aggregate.delivered}</p>
                </article>
                <article className="metric-card">
                  <h2 className="metric-card__label">Revenue today</h2>
                  <p className="metric-card__value">{formatMoney(aggregate.revenue)}</p>
                </article>
                <article className="metric-card">
                  <h2 className="metric-card__label">Avg delivery time</h2>
                  <p className="metric-card__value">{avgDelivery} min</p>
                </article>
                <article className="metric-card">
                  <h2 className="metric-card__label">Avg kitchen prep</h2>
                  <p className="metric-card__value">{avgPrep} min</p>
                </article>
              </section>

              <section className="admin-stores" aria-labelledby="stores-heading">
                <h2 id="stores-heading" className="admin-stores__title">
                  Stores
                </h2>
                <div className="admin-stores__grid">
                  {stores.map((s) => (
                    <button key={s.id} type="button" className="store-card" onClick={() => onOpenStore(s.id)}>
                      <span className="store-card__name">{s.name}</span>
                      <span className="store-card__meta">Live orders: {s.metrics.liveOrders}</span>
                      <span className="store-card__meta">Delivered today: {s.metrics.deliveredTodayCount}</span>
                      <span className="store-card__cta">Open store dashboard</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="admin-selected" aria-label="Selected store snapshot">
                <h2 className="admin-selected__title">{selected.name} snapshot</h2>
                <ul className="admin-selected__list">
                  <li>Live orders: {selected.metrics.liveOrders}</li>
                  <li>Delivered today: {selected.metrics.deliveredTodayCount}</li>
                  <li>Revenue: {formatMoney(selected.metrics.revenueTodayCents)}</li>
                  <li>Avg delivery: {selected.metrics.avgDeliveryMin} min</li>
                  <li>Avg kitchen prep: {selected.metrics.avgKitchenPrepMin} min</li>
                </ul>
              </section>
            </>
          ) : null}

          {navTab === "orders" ? (
            <section className="admin-table-wrap" aria-label="Orders placeholder">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Store</th>
                    <th>Recipe</th>
                    <th>Channel</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_ORDERS.map((r) => (
                    <tr key={r.orderNo}>
                      <td>{r.orderNo}</td>
                      <td>{r.store}</td>
                      <td>{r.recipe}</td>
                      <td>{r.provider}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {navTab === "delivery" ? (
            <section className="admin-placeholder" aria-label="Delivery status placeholder">
              <p>Delivery bottlenecks and rider map — mock placeholder (frontend only).</p>
            </section>
          ) : null}

          {navTab === "analytics" ? (
            <section className="admin-placeholder" aria-label="Analytics placeholder">
              <p>Kitchen performance and batch efficiency charts — mock placeholder.</p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
