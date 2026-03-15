import { createAsync, useParams } from "@solidjs/router";
import { createSignal, Match, onCleanup, Show, Switch } from "solid-js";
import {
  HomeContext,
  MainContext,
  ShellContext,
  use_context,
} from "~/components/context";
import ChatBar from "~/components/ui/chat_bar";
import FriendList from "~/components/ui/friend_list";
import SidebarButtonGroup, {
  type SidebarButtonGroupState,
} from "~/components/ui/sidebar_button_group";
import type { User } from "~/lib/endpoint/types";
import { HomeStore } from "~/stores/home";

export default function Home() {
  const params = useParams<{ user_id: string }>();
  const shell_store = use_context(ShellContext);
  const main_store = use_context(MainContext);
  const store = createAsync(() =>
    HomeStore.new(shell_store, main_store, params.user_id),
  );
  const [sidebar_button_group_state, set_sidebar_button_group_state] =
    createSignal<SidebarButtonGroupState>(null);
  const [chat_user, set_chat_user] = createSignal<User>();
  return (
    <Show keyed when={store()}>
      {(v) => {
        onCleanup(() => v.cleanup());
        return (
          <HomeContext.Provider value={v}>
            <SidebarButtonGroup set_state={set_sidebar_button_group_state} />
            <div class="flex-1 flex relative">
              <Show keyed when={chat_user()}>
                {(v) => <ChatBar chat_user={v} />}
              </Show>
              <Show when={sidebar_button_group_state()}>
                <div class="absolute inset-0 right-4 max-w-80 flex flex-col bg-base-100 border border-base-300 rounded-t-box">
                  <Switch>
                    <Match when={sidebar_button_group_state() === "message"}>
                      <div class="flex-1 flex items-center justify-center">
                        <span class="text-base-content font-bold">
                          消息功能待实现
                        </span>
                      </div>
                    </Match>
                    <Match when={sidebar_button_group_state() === "friend"}>
                      <FriendList set_chat_user={set_chat_user} />
                    </Match>
                    <Match when={sidebar_button_group_state() === "group"}>
                      <div class="flex-1 flex items-center justify-center">
                        <span class="text-base-content font-bold">
                          群组功能待实现
                        </span>
                      </div>
                    </Match>
                  </Switch>
                </div>
              </Show>
            </div>
          </HomeContext.Provider>
        );
      }}
    </Show>
  );
}
