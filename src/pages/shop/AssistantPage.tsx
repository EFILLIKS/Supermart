import { AssistantChat } from "@/components/Assistant";
import { PageHeader } from "@/components/shared";

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Shopping assistant" subtitle="Search by meal, diet, or budget. Results come from the store's real catalogue and stock." />
      <AssistantChat />
    </div>
  );
}
