import { redirect } from "next/navigation";

/** The read-only tree moved to /share. Old links keep working. */
export default function TreePage() {
  redirect("/share");
}
