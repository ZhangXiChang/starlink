import { CheckIcon, UserIcon, XIcon } from "lucide-solid";
import { Show } from "solid-js";
import type { User } from "~/lib/endpoint/types";
import Image from "../widgets/image";

export function create_friend_request_toast(props: {
	user: User;
	on_accept: () => void;
	on_reject: () => void;
}) {
	return (
		<div class="flex items-center gap-3">
			<div class="avatar">
				<Show
					keyed
					when={props.user.avatar}
					fallback={<UserIcon class="size-10 rounded-full bg-base-300" />}
				>
					{(avatar) => <Image class="size-10 rounded-full" image={avatar} />}
				</Show>
			</div>
			<div class="flex min-w-0 flex-1 flex-col">
				<span class="font-bold">{props.user.name}</span>
				<span class="truncate text-xs text-base-content/60">
					请求添加你为好友
				</span>
			</div>
			<div class="flex gap-1">
				<button
					class="btn btn-success btn-xs btn-square"
					onClick={props.on_accept}
				>
					<CheckIcon class="size-4" />
				</button>
				<button
					class="btn btn-error btn-xs btn-square"
					onClick={props.on_reject}
				>
					<XIcon class="size-4" />
				</button>
			</div>
		</div>
	);
}
