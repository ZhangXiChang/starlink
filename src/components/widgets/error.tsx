import { BugIcon } from "lucide-solid";
import { onMount } from "solid-js";

export default function Error(props: { error: Error }) {
  onMount(() => console.error(props.error));
  return (
    <div class="flex-1 flex items-center justify-center gap-1">
      <BugIcon class="text-error" />
      <span class="text-error">{props.error.message}</span>
    </div>
  );
}
