import { useNavigate } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import { type } from "arktype";
import { UserIcon } from "lucide-solid";
import {
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  Suspense,
} from "solid-js";
import { QueryBuilder } from "~/lib/query_builder";
import { MainContext, use_context } from "../context";
import Image from "../widgets/image";

const FormSchema = type({
  user_id: type("string").configure({ message: "请选择一个账户" }),
});

export default function Login() {
  const navigate = useNavigate();
  const main_store = use_context(MainContext);
  const [users, users_actions] = createResource(
    async () =>
      await main_store.sqlite.query<{
        id: string;
        name: string;
        avatar?: Uint8Array;
      }>(
        QueryBuilder.selectFrom("user")
          .select(["id", "name", "avatar"])
          .compile(),
      ),
  );
  onMount(() =>
    onCleanup(
      main_store.sqlite.on_update(async () => {
        await users_actions.refetch();
      }),
    ),
  );
  const [preview_avatar, set_preview_avatar] = createSignal<Uint8Array>();
  const form = createForm(() => ({
    defaultValues: { user_id: undefined as string | undefined },
    validators: { onChange: FormSchema },
    onSubmit: ({ value }) => {
      navigate(`/home/${value.user_id}`);
    },
  }));
  const is_submitting = form.useStore((state) => state.isSubmitting);
  return (
    <fieldset class="fieldset bg-base-100 border border-base-300 rounded-box p-6 pt-2">
      <legend class="fieldset-legend">登录账户</legend>
      <span class="text-base-content/60">选择你的账户登录</span>
      <div class="flex flex-col pt-4">
        <div class="flex justify-center mb-6">
          <div class="avatar">
            <Show
              keyed
              when={preview_avatar()}
              fallback={<UserIcon class="size-12 rounded-full bg-base-300" />}
            >
              {(v) => <Image class="size-12 rounded-full" image={v} />}
            </Show>
          </div>
        </div>
        <form
          class="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await form.handleSubmit();
          }}
        >
          <div class="flex flex-col gap-1">
            <form.Field name="user_id">
              {(field) => (
                <>
                  <label class="floating-label">
                    <span class="text-base-content">账户</span>
                    <select
                      class="select"
                      name={field().name}
                      onBlur={field().handleBlur}
                      onChange={(e) => {
                        const user = users()?.find(
                          (v) => v.id === e.target.value,
                        );
                        set_preview_avatar(user?.avatar);
                        field().handleChange(user?.id);
                      }}
                    >
                      <option class="text-base-content">选择账户</option>
                      <Suspense>
                        <For each={users()}>
                          {(v) => (
                            <option value={v.id}>
                              <div class="avatar">
                                <Show
                                  keyed
                                  when={v.avatar}
                                  fallback={
                                    <UserIcon class="size-8 rounded-full bg-base-300" />
                                  }
                                >
                                  {(avatar) => (
                                    <Image
                                      class="size-8 rounded-full"
                                      image={avatar}
                                    />
                                  )}
                                </Show>
                              </div>
                              <span class="text-base-content">{v.name}</span>
                            </option>
                          )}
                        </For>
                      </Suspense>
                    </select>
                  </label>
                  <Show
                    when={
                      field().state.meta.isTouched &&
                      !field().state.meta.isValid
                    }
                  >
                    <For each={field().state.meta.errors}>
                      {(error) => (
                        <span class="italic text-error">{error?.message}</span>
                      )}
                    </For>
                  </Show>
                </>
              )}
            </form.Field>
          </div>
          <button class="btn btn-neutral" disabled={is_submitting()}>
            登录
          </button>
          <button
            type="button"
            class="btn"
            onClick={async () => {
              if (form.state.values.user_id === undefined) {
                await form.validateField("user_id", "submit");
                return;
              }
              await main_store.sqlite.execute(
                QueryBuilder.deleteFrom("user")
                  .where("id", "=", form.state.values.user_id)
                  .compile(),
              );
              form.reset();
              set_preview_avatar();
            }}
          >
            删除账户
          </button>
        </form>
      </div>
    </fieldset>
  );
}
