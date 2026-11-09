import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl p-8 pt-24">
      <EmptyState image="/images/products/banana-robusta.svg" title="We could not find that aisle" body="The page may have moved, or the link may be mistyped." action={<Button asChild className="rounded-full"><Link to="/">Back to the entrance</Link></Button>} />
    </div>
  );
}
