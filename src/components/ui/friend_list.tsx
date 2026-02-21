import { MessagesSquareIcon, UserIcon, UserPlusIcon } from "lucide-solid";
import { createSignal, For, lazy, Show, Suspense } from "solid-js";
import { createAsync, useParams } from "@solidjs/router";
import { QueryBuilder } from "~/lib/query_builder";
import type { Person } from "~/lib/endpoint/types";
import { MainContext, use_context } from "../context";
import { createVirtualizer } from "@tanstack/solid-virtual";
import Image from "../widgets/image";

const LazyAddFriendModal = lazy(() => import("~/components/modal/add_friend"));

export default function FriendList() {
  let add_friend_dialog_ref: HTMLDialogElement | undefined;
  const [lazy_add_friend_modal_load, set_lazy_add_friend_modal_load] =
    createSignal(false);
  const main_store = use_context(MainContext);
  const params = useParams<{ user_id: string }>();
  const friends = createAsync(async () => {
    return main_store.sqlite.query<Person>(
      QueryBuilder.selectFrom("friend")
        .select(["id", "name", "avatar", "bio"])
        .where("user_id", "=", params.user_id)
        .compile(),
    );
  });
  let friend_list_ref: HTMLDivElement | undefined;
  const friend_list_virtualizer = createVirtualizer({
    getScrollElement: () => friend_list_ref ?? null,
    count: friends()?.length ?? 0,
    estimateSize: () => 80,
  });
  return (
    <>
      <dialog ref={add_friend_dialog_ref} class="modal" closedby="any">
        <Show when={lazy_add_friend_modal_load()}>
          <LazyAddFriendModal />
          <form method="dialog" class="modal-backdrop">
            <button />
          </form>
        </Show>
      </dialog>
      <div class="flex border-b border-base-300 p-2">
        <div class="flex gap-1 border-r border-base-300 pr-2 items-center">
          <UserIcon />
          <span class="select-none text-base-content text-sm font-bold">
            好友
          </span>
        </div>
        <div class="flex-1 flex justify-end">
          <div class="tooltip" data-tip="添加好友">
            <button
              class="btn btn-square btn-sm bg-base-100"
              onClick={() => {
                add_friend_dialog_ref?.showModal();
                set_lazy_add_friend_modal_load(true);
              }}
            >
              <UserPlusIcon class="size-4" />
            </button>
          </div>
        </div>
      </div>
      <Suspense>
        <div ref={friend_list_ref} class="flex-1 overflow-y-auto">
          <div
            class="relative w-full"
            style={{ height: `${friend_list_virtualizer.getTotalSize()}px` }}
          >
            <ul
              class="list absolute w-full"
              style={{
                transform: `translateY(${friend_list_virtualizer.getVirtualItems().at(0)?.start ?? 0}px)`,
              }}
            >
              <For each={friend_list_virtualizer.getVirtualItems()}>
                {(v) => (
                  <li
                    ref={(v) =>
                      queueMicrotask(() =>
                        friend_list_virtualizer.measureElement(v),
                      )
                    }
                    data-index={v.index}
                    class="list-row"
                  >
                    <div class="avatar">
                      <Show
                        keyed
                        when={friends()?.at(v.index)?.avatar}
                        fallback={
                          <UserIcon class="size-10 rounded-full bg-base-300" />
                        }
                      >
                        {(v) => <Image class="size-10 rounded-box" image={v} />}
                      </Show>
                    </div>
                    <div class="flex flex-col">
                      <span>{friends()?.at(v.index)?.name}</span>
                      <span class="text-xs text-base-content/60">
                        {friends()?.at(v.index)?.bio}
                      </span>
                    </div>
                    <button class="btn btn-square btn-ghost">
                      <MessagesSquareIcon />
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </div>
      </Suspense>
    </>
  );
}
