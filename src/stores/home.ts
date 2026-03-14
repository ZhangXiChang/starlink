import type { Endpoint } from "~/lib/endpoint/interface";
import type { MainStore } from "./main";
import { QueryBuilder } from "~/lib/query_builder";
import type { Person } from "~/lib/endpoint/types";
import type { ShellStore } from "./shell";
import type { Setter } from "solid-js";

export class HomeStore {
  endpoint: Endpoint;
  set_user_person: Setter<Person | undefined>;

  private constructor(
    endpoint: Endpoint,
    set_user_person: Setter<Person | undefined>,
  ) {
    this.endpoint = endpoint;
    this.set_user_person = set_user_person;
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
    const person = {
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
    };
    const [, set_user_person] = shell_store.user_person;
    set_user_person(person);
    return new HomeStore(
      await main_store.endpoint_module.create_endpoint(user.key, person, []),
      set_user_person,
    );
  }
  async cleanup() {
    await this.endpoint.close();
    this.set_user_person();
  }
}
