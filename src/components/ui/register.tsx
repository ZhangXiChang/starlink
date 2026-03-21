import { UserIcon } from "lucide-solid";
import Image from "../widgets/image";
import { createForm } from "@tanstack/solid-form";
import { For, Show } from "solid-js";
import { type } from "arktype";
import { QueryBuilder } from "~/lib/query_builder";
import { MainContext, use_context } from "../context";

const FormSchema = type({
  user_name: type("string > 0").configure({ message: "用户名不能为空" }),
  avatar: "File | null | undefined",
});

export default function Register() {
  const main_store = use_context(MainContext);
  let avatar_file_input_ref: HTMLInputElement | undefined;
  const form = createForm(() => ({
    defaultValues: { user_name: "", avatar: null as File | null | undefined },
    validators: { onChange: FormSchema },
    onSubmit: async ({ value }) => {
      const secret_key = await main_store.endpoint_module.generate_secret_key();
      const user_id =
        await main_store.endpoint_module.get_secret_key_id(secret_key);
      await main_store.sqlite.execute(
        QueryBuilder.insertInto("user")
          .values({
            id: user_id,
            key: secret_key,
            name: value.user_name,
            avatar:
              value.avatar && new Uint8Array(await value.avatar.arrayBuffer()),
          })
          .compile(),
      );
      form.reset();
    },
  }));
  const is_submitting = form.useStore((state) => state.isSubmitting);
  return (
    <fieldset class="fieldset bg-base-100 border border-base-300 rounded-box p-6 pt-2">
      <legend class="fieldset-legend">注册账户</legend>
      <span class="text-base-content/60">输入用户名注册你的账户</span>
      <form
        class="flex flex-col pt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
      >
        <div class="flex justify-center mb-6">
          <form.Field name="avatar">
            {(field) => (
              <>
                <div
                  class="avatar cursor-pointer"
                  onClick={() => avatar_file_input_ref?.click()}
                >
                  <Show
                    keyed
                    when={field().state.value}
                    fallback={
                      <UserIcon class="size-12 rounded-full bg-base-300 hover:ring ring-neutral-300" />
                    }
                  >
                    {(v) => (
                      <Image
                        class="size-12 rounded-full hover:ring ring-neutral-300"
                        image={v}
                      />
                    )}
                  </Show>
                </div>
                <input
                  ref={avatar_file_input_ref}
                  name={field().name}
                  onBlur={field().handleBlur}
                  onChange={(e) =>
                    field().handleChange(e.target.files?.item(0))
                  }
                  type="file"
                  accept="image/*"
                  class="hidden"
                />
              </>
            )}
          </form.Field>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-1">
            <form.Field
              name="user_name"
              validators={{
                onSubmitAsync: async ({ value }) => {
                  const result = await main_store.sqlite.query(
                    QueryBuilder.selectFrom("user")
                      .select((eb) => eb.val(1).as("exists"))
                      .where("name", "=", value)
                      .limit(1)
                      .compile(),
                  );
                  if (result.length !== 0) return { message: "用户名已存在" };
                },
              }}
            >
              {(field) => (
                <>
                  <label class="floating-label">
                    <span>用户名</span>
                    <input
                      name={field().name}
                      value={field().state.value}
                      onBlur={field().handleBlur}
                      onInput={(e) => field().handleChange(e.target.value)}
                      class="input"
                      placeholder="用户名"
                    />
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
            注册
          </button>
        </div>
      </form>
    </fieldset>
  );
}
