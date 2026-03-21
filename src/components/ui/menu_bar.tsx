import { createSignal, lazy, Show } from "solid-js";
import WindowControlBar from "./window_control_bar";
import { get_window } from "~/lib/window";
import { twMerge } from "tailwind-merge";
import Image from "../widgets/image";
import { ShellContext, use_context } from "../context";
import { UserIcon } from "lucide-solid";

const LazyAboutModal = lazy(() => import("~/components/modal/about"));
const LazySettingModal = lazy(() => import("~/components/modal/setting"));
const LazyUserInfoModal = lazy(() => import("~/components/modal/user_info"));

export default function MenuBar() {
  const shell_store = use_context(ShellContext);
  const [user] = shell_store.user;
  let about_dialog_ref: HTMLDialogElement | undefined;
  const [lazy_about_modal_load, set_lazy_about_modal_load] =
    createSignal(false);
  let setting_dialog_ref: HTMLDialogElement | undefined;
  const [lazy_setting_modal_load, set_lazy_setting_modal_load] =
    createSignal(false);
  let user_info_dialog_ref: HTMLDialogElement | undefined;
  const [lazy_user_info_modal_load, set_lazy_user_info_modal_load] =
    createSignal(false);
  return (
    <>
      <dialog ref={about_dialog_ref} class="modal" closedby="any">
        <Show when={lazy_about_modal_load()}>
          <LazyAboutModal />
          <form method="dialog" class="modal-backdrop">
            <button />
          </form>
        </Show>
      </dialog>
      <dialog ref={setting_dialog_ref} class="modal" closedby="any">
        <Show when={lazy_setting_modal_load()}>
          <LazySettingModal />
          <form method="dialog" class="modal-backdrop">
            <button />
          </form>
        </Show>
      </dialog>
      <dialog ref={user_info_dialog_ref} class="modal" closedby="any">
        <Show when={lazy_user_info_modal_load()}>
          <LazyUserInfoModal />
          <form method="dialog" class="modal-backdrop">
            <button />
          </form>
        </Show>
      </dialog>
      <div
        class={twMerge(
          "flex items-center",
          import.meta.env.TAURI_ENV_PLATFORM === "android" && "mt-8",
        )}
      >
        <Show keyed when={user()}>
          {(v) => (
            <div
              class="avatar cursor-pointer p-2 pr-0"
              onClick={() => {
                user_info_dialog_ref?.showModal();
                set_lazy_user_info_modal_load(true);
              }}
            >
              <Show
                keyed
                when={v.avatar}
                fallback={
                  <UserIcon class="size-10 rounded-full bg-base-300 hover:ring ring-neutral-300" />
                }
              >
                {(avatar) => (
                  <Image
                    class="size-10 rounded-full hover:ring ring-neutral-300"
                    image={avatar}
                  />
                )}
              </Show>
            </div>
          )}
        </Show>
        <ul class="menu menu-horizontal join">
          <li class="join-item">
            <button
              class="join-item btn btn-sm bg-base-100"
              onClick={() => {
                about_dialog_ref?.showModal();
                set_lazy_about_modal_load(true);
              }}
            >
              关于
            </button>
          </li>
          <li class="join-item">
            <button
              class="join-item btn btn-sm bg-base-100"
              onClick={() => {
                setting_dialog_ref?.showModal();
                set_lazy_setting_modal_load(true);
              }}
            >
              设置
            </button>
          </li>
        </ul>
        <Show when={import.meta.env.TAURI_ENV_PLATFORM !== "android"}>
          <Show keyed when={get_window()}>
            {(v) => <WindowControlBar window={v} />}
          </Show>
        </Show>
      </div>
    </>
  );
}
