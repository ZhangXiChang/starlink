import { UserIcon } from "lucide-solid";
import { Show } from "solid-js";
import { ShellContext, use_context } from "../context";
import Modal from "../modal";
import Image from "../widgets/image";

export default function UserInfo() {
  const shell_store = use_context(ShellContext);
  const [user] = shell_store.user;
  return (
    <Modal>
      <div class="flex flex-col items-center gap-4">
        <div class="avatar">
          <Show
            keyed
            when={user()?.avatar}
            fallback={<UserIcon class="size-20 rounded-full bg-base-300" />}
          >
            {(avatar) => <Image class="size-20 rounded-full" image={avatar} />}
          </Show>
        </div>
        <div class="flex flex-col items-center">
          <span class="text-xl font-bold">{user()?.name}</span>
          <span class="text-sm text-base-content/70">{user()?.bio}</span>
        </div>
        <div class="tooltip" data-tip="复制ID">
          <span
            class="link link-hover text-xs text-base-content/50"
            onClick={async () => {
              const id = user()?.id;
              if (id !== undefined) {
                await navigator.clipboard.writeText(id);
              }
            }}
          >
            {user()?.id}
          </span>
        </div>
      </div>
    </Modal>
  );
}
