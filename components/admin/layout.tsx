import DashboardNavigation from "@/components/DashboardNavigation";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <DashboardNavigation area="admin" />
      {children}
    </>
  );
}
