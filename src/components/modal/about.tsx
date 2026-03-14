import { Octokit } from "octokit";
import { ErrorBoundary, For, Show, Suspense } from "solid-js";
import { open_url } from "~/lib/opener";
import { createAsync } from "@solidjs/router";
import Image from "../widgets/image";
import Loading from "../widgets/loading";
import Error from "../widgets/error";
import { UserIcon } from "lucide-solid";
import Modal from "../modal";

export default function AboutModal() {
  const version = createAsync(async () => {
    if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
      const version = await fetch("/version");
      const content_type = version.headers.get("Content-Type");
      if (content_type !== "text/html") {
        return await version.text();
      }
    }
  });
  const contributors = createAsync(async () => {
    const contributors = await new Octokit().rest.repos.listContributors({
      owner: "zhangxichang",
      repo: "pupu",
    });
    return contributors.data;
  });
  return (
    <Modal title="关于" description="桃李不言，下自成蹊。">
      <div class="flex flex-col items-start">
        <span
          class="link link-hover font-bold text-accent"
          onClick={() =>
            open_url("https://github.com/zhangxichang/pupu/graphs/contributors")
          }
        >
          贡献者们
        </span>
        <div class="avatar-group w-full justify-center -space-x-6">
          <ErrorBoundary fallback={(error) => <Error error={error as Error} />}>
            <Suspense fallback={<Loading />}>
              <For each={contributors()}>
                {(v) => (
                  <div class="avatar">
                    <Show
                      keyed
                      when={v.avatar_url}
                      fallback={
                        <UserIcon class="size-10 rounded-full bg-base-300" />
                      }
                    >
                      {(v) => <Image class="size-10" image={v} />}
                    </Show>
                  </div>
                )}
              </For>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
      <div class="flex flex-col items-start">
        <span
          class="link link-hover text-sm font-bold text-info"
          onClick={() => open_url("https://github.com/zhangxichang/pupu")}
        >
          源码仓库
        </span>
        <Show when={import.meta.env.TAURI_ENV_PLATFORM !== undefined}>
          <span class="text-sm text-base-content/60">
            版本号: {version() ?? "开发版本"}
          </span>
        </Show>
      </div>
    </Modal>
  );
}
