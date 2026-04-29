import { redirect } from "next/navigation";

export default function DispatcherRoot() {
  redirect("/dispatcher/tasks");
}
