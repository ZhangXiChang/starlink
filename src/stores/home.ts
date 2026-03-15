import type { Endpoint } from "~/lib/endpoint/interface";
import type { MainStore } from "./main";
import { QueryBuilder } from "~/lib/query_builder";
import type { Person, User } from "~/lib/endpoint/types";
import type { ShellStore } from "./shell";
import type { Setter } from "solid-js";

export class HomeStore {
  endpoint: Endpoint;
  set_user: Setter<User | undefined>;

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
    const [, set_user] = shell_store.user;
    set_user({ id: user_id, ...person });
    return new HomeStore(
      await main_store.endpoint_module.create_endpoint(user.key, person, []),
      set_user,
    );
  }
  async cleanup() {
    await this.endpoint.close();
    this.set_user();
  }
}
