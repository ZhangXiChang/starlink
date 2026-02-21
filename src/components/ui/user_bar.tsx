import { createAsync, useParams } from "@solidjs/router";
import { QueryBuilder } from "~/lib/query_builder";
import { MainContext, use_context } from "../context";
import type { Person } from "~/lib/endpoint/types";
import { createSignal, onMount, Show } from "solid-js";
import { ChevronsLeftRightIcon, SettingsIcon, UserIcon } from "lucide-solid";
import Image from "../widgets/image";
import UserInfoWindow from "./user_info_window";
import { animate } from "animejs";

export default function Userbar() {
  const main_store = use_context(MainContext);
  const params = useParams<{ user_id: string }>();
  let user_info_window_trigger_ref: HTMLButtonElement | undefined;
  let userbar_ref: HTMLDivElement | undefined;
  const [is_open_user_info_window, set_is_open_user_info_window] =
    createSignal(false);
  const [is_expand, set_is_expand] = createSignal(false);
  const collapse_transform_x = "-168px";
  const user_person = createAsync(async () =>
    (
      await main_store.sqlite.query<Person & { id: string }>(
        QueryBuilder.selectFrom("user")
          .select(["id", "name", "avatar", "bio"])
          .where("id", "=", params.user_id)
          .compile(),
      )
    ).at(0),
  );
  onMount(() => {
    if (!userbar_ref) throw new Error("用户栏不存在");
    if (!is_expand()) {
      userbar_ref.style.transform = `translateX(${collapse_transform_x})`;
    }
  });
  return (
    <div
      ref={userbar_ref}
      class="absolute left-2 bottom-6 bg-base-100 border border-base-300 rounded-box flex p-2 gap-2"
    >
      <div class="avatar">
        <Show
          keyed
          when={user_person()?.avatar}
          fallback={<UserIcon class="size-10 rounded-full bg-base-300" />}
        >
          {(v) => <Image class="size-10 rounded-box" image={v} />}
        </Show>
      </div>
      <button
        ref={user_info_window_trigger_ref}
        class="btn btn-ghost p-0"
        onClick={() => set_is_open_user_info_window((v) => !v)}
      >
        <div class="flex flex-col items-start px-2">
          <span>{user_person()?.name}</span>
          <span class="text-xs text-base-content/60">{user_person()?.bio}</span>
        </div>
      </button>
      <Show when={is_open_user_info_window()}>
        <UserInfoWindow
          trigger_ref={user_info_window_trigger_ref}
          user_person={user_person()}
        />
      </Show>
      <button class="btn btn-square btn-ghost">
        <SettingsIcon />
      </button>
      <button
        class="btn btn-square btn-ghost"
        onClick={() => {
          if (!userbar_ref) throw new Error("用户栏不存在");
          set_is_open_user_info_window(false);
          if (is_expand()) {
            animate(userbar_ref, { x: collapse_transform_x });
            set_is_expand(false);
          } else {
            animate(userbar_ref, { x: "0px" });
            set_is_expand(true);
          }
        }}
      >
        <ChevronsLeftRightIcon />
      </button>
    </div>
  );
}
