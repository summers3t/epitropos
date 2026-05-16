import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DashboardScreeningDetailRedirectPage({
  params,
}: PageProps) {
  const { id } = await params;
  redirect(`/dashboard/analyses/${id}`);
}