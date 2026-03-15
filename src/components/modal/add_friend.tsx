import { createSignal, Show } from "solid-js";
import { HomeContext, ShellContext, use_context } from "../context";
import type { User } from "~/lib/endpoint/types";
import { SendIcon, UserIcon } from "lucide-solid";
import Image from "../widgets/image";
import { tryit } from "radash";
import Modal from "../modal";

// TODO 对方同意好友就把对方添加到数据库中

export default function AddFriend() {
  const shell_store = use_context(ShellContext);
  const home_store = use_context(HomeContext);
  let search_user_id_input_ref: HTMLInputElement | undefined;
  const [search_user_result, set_search_user_result] = createSignal<User>();
  const [
    send_friend_request_button_disabled,
    set_send_friend_request_button_disabled,
  ] = createSignal(false);
  const on_search_user = async () => {
    if (
      search_user_id_input_ref !== undefined &&
      search_user_id_input_ref.value != ""
    ) {
      set_search_user_result({
        id: search_user_id_input_ref.value,
        ...(await home_store.endpoint.request_person(
          search_user_id_input_ref.value,
        )),
      });
    }
  };
  return (
    <Modal title="添加好友" description="两地俱秋夕，相望共星河。">
      <div class="flex flex-col items-start gap-1">
        <span class="font-bold">搜索用户</span>
        <div class="join w-full">
          <input
            ref={search_user_id_input_ref}
            class="join-item input flex-1"
            placeholder="用户ID"
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                await on_search_user();
              }
            }}
          />
          <button class="join-item btn" onClick={on_search_user}>
            搜索
          </button>
        </div>
      </div>
      <Show when={search_user_result()}>
        {(v) => (
          <div class="flex p-2 gap-3 items-center">
            <div class="avatar">
              <Show
                keyed
                when={v().avatar}
                fallback={<UserIcon class="size-12 rounded-full bg-base-300" />}
              >
                {(v) => <Image class="size-12 rounded-full" image={v} />}
              </Show>
            </div>
            <div class="flex flex-col">
              <span class="font-bold">{v().name}</span>
              <span class="text-sm text-base-content/60">{v().bio}</span>
            </div>
            <div class="flex-1 flex justify-end">
              <div class="tooltip tooltip-left" data-tip="发送好友请求">
                <button
                  disabled={send_friend_request_button_disabled()}
                  class="btn btn-square btn-sm"
                  onClick={() => {
                    set_send_friend_request_button_disabled(true);
                    void (async () => {
                      const [err, agree] = await tryit(() =>
                        home_store.endpoint.request_friend(v().id),
                      )();
                      if (err) {
                        shell_store.toaster.popup("error", err.message);
                      } else {
                        if (agree) {
                          shell_store.toaster.popup(
                            "success",
                            "对方同意好友请求",
                          );
                          console.info(v());
                        } else {
                          shell_store.toaster.popup(
                            "error",
                            "对方拒绝好友请求",
                          );
                        }
                      }
                      set_send_friend_request_button_disabled(false);
                    })();
                  }}
                >
                  <SendIcon class="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </Modal>
  );
}
