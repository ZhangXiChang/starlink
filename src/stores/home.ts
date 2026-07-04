import type { Setter } from "solid-js";
import type { Endpoint } from "~/lib/endpoint/interface";
import type { Person, User } from "~/lib/endpoint/types";
import { QueryBuilder } from "~/lib/query_builder";
import type { MainStore } from "./main";
import type { ShellStore } from "./shell";

export class HomeStore {
  endpoint;
  set_user;

  private constructor(endpoint: Endpoint, set_user: Setter<User | undefined>) {
    this.endpoint = endpoint;
    this.set_user = set_user;
  }
  static async new(
    shell_store: ShellStore,
    main_store: MainStore,
    user_id: string,
  ) {
    const user = (
      await main_store.sqlite.query<Person & { key: Uint8Array }>(
        QueryBuilder.selectFrom("user")
          .select(["key", "name", "avatar", "bio"])
          .where("id", "=", user_id)
          .limit(1)
          .compile(),
      )
    ).at(0);
    if (!user) throw new Error("没有找到相关用户信息");
    const person: Person = {
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
    };
    const endpoint = await main_store.endpoint_module.create_endpoint(
      user.key,
      person,
      [],
    );
    void (async () => {
      const event_type = await endpoint.person_protocol_next_event();
      if (event_type === "FriendRequest") {
        const remote_id =
          await endpoint.person_protocol_event<string>("remote_id");
        const result = await main_store.sqlite.query(
          QueryBuilder.selectFrom("friend")
            .select((eb) => eb.val(1).as("exists"))
            .where("owner_id", "=", user_id)
            .where("id", "=", remote_id)
            .limit(1)
            .compile(),
        );
        if (result.length !== 0) {
          await endpoint.person_protocol_event("reject");
        } else {
          // TODO 好友请求通知
          const person = await endpoint.request_person(remote_id);
          shell_store.toaster.popup("添加好友");
          await endpoint.person_protocol_event("accept");
          await main_store.sqlite.execute(
            QueryBuilder.insertInto("friend")
              .values({
                id: remote_id,
                owner_id: user_id,
                ...person,
              })
              .compile(),
          );
        }
      }
    })();
    const [, set_user] = shell_store.user;
    set_user({ id: user_id, ...person });
    return new HomeStore(endpoint, set_user);
  }
  async cleanup() {
    await this.endpoint.close();
    this.set_user();
  }
}
