import DashboardNavigation from "@/components/DashboardNavigation";

export default function MemberLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <DashboardNavigation area="member" />
      {children}
    </>
  );
}
