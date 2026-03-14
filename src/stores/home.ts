import type { Endpoint } from "~/lib/endpoint/interface";
import type { MainStore } from "./main";
import { QueryBuilder } from "~/lib/query_builder";
import type { Person } from "~/lib/endpoint/types";

export class HomeStore {
  endpoint: Endpoint;

  private constructor(endpoint: Endpoint) {
    this.endpoint = endpoint;
  }
  static async new(main_store: MainStore, user_id: string) {
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
    return new HomeStore(
      await main_store.endpoint_module.create_endpoint(
        user.key,
        {
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
        },
        [],
      ),
    );
  }
  async cleanup() {
    await this.endpoint.close();
  }
}
