import InviteWizard from "@/components/InviteWizard";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteWizard token={token} />;
}
