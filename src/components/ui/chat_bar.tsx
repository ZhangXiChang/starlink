import { UserIcon } from "lucide-solid";
import { Show } from "solid-js";
import type { Person } from "~/lib/endpoint/types";
import Image from "../widgets/image";

export default function ChatBar(props: { person: Person }) {
  return (
    <div class="flex-1 flex flex-col p-2 gap-2">
      <div class="flex items-center border rounded-box bg-base-100 border-neutral-300 p-2 gap-2">
        <div class="avatar cursor-pointer" onClick={() => {}}>
          <Show
            keyed
            when={props.person.avatar}
            fallback={
              <UserIcon class="size-10 rounded-full bg-base-300 hover:outline outline-neutral-300" />
            }
          >
            {(avatar) => (
              <Image
                class="size-10 rounded-full hover:outline outline-neutral-300"
                image={avatar}
              />
            )}
          </Show>
        </div>
        <div class="flex flex-col">
          <span class="text-base-content font-bold">{props.person.name}</span>
          <span class="text-xs text-base-content/60">{props.person.bio}</span>
        </div>
      </div>
      <div class="flex-1 flex border border-dashed justify-center items-center font-bold">
        聊天消息界面待实现
      </div>
      <div class="flex">
        <textarea
          class="textarea flex-1 field-sizing-content resize-none min-h-0"
          placeholder="按回车发送消息"
        />
      </div>
    </div>
  );
}
