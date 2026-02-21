import { createSignal, lazy, Show } from "solid-js";
import WindowControlBar from "./window_control_bar";
import { get_window } from "~/lib/window";
import { twMerge } from "tailwind-merge";

const LazyAboutModal = lazy(() => import("~/components/modal/about"));

export default function MenuBar() {
  let about_dialog_ref: HTMLDialogElement | undefined;
  const [lazy_about_modal_load, set_lazy_about_modal_load] =
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
      <div
        class={twMerge(
          "flex items-start",
          import.meta.env.TAURI_ENV_PLATFORM === "android" && "mt-8",
        )}
      >
        <ul class="menu menu-horizontal">
          <li>
            <button
              class="btn btn-sm bg-base-100"
              onClick={() => {
                about_dialog_ref?.showModal();
                set_lazy_about_modal_load(true);
              }}
            >
              关于
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
