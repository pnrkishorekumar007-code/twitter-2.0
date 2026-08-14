import Mainlayout from "@/components/layout/Mainlayout";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Mainlayout>{children}</Mainlayout>;
}
