import type { StaffKey } from "../types/kitchen";

type Props = {
  onStaff: (staff: StaffKey) => void;
  onAdmin: () => void;
};

export function MockLogin({ onStaff, onAdmin }: Props) {
  return (
    <div className="login-screen">
      <div className="login-screen__card">
        <h1 className="login-screen__title">Yann&apos;s Pizzeria</h1>
        <p className="login-screen__subtitle">Kitchen operations — mock login (no backend).</p>
        <div className="login-screen__actions">
          <button type="button" className="btn btn--login btn--primary" onClick={() => onStaff("yann")}>
            Cooking staff — Yann
          </button>
          <button type="button" className="btn btn--login btn--primary" onClick={() => onStaff("pranav")}>
            Cooking staff — Pranav
          </button>
          <button type="button" className="btn btn--login btn--secondary" onClick={onAdmin}>
            Admin
          </button>
        </div>
        <p className="login-screen__hint">Each staff tablet shows one lane. Admin sees all stores.</p>
      </div>
    </div>
  );
}
