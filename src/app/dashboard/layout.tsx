import { SignUpTracker } from "@/components/analytics/SignUpTracker";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-root">
      <SignUpTracker />
      {children}
    </div>
  );
}
