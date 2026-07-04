import { type JSX, Show } from "solid-js";

export default function Modal(props: {
  title?: string;
  description?: string;
  children: JSX.Element;
}) {
  return (
    <div class="modal-box flex flex-col gap-3">
      <Show when={props.title !== undefined || props.description !== undefined}>
        <div class="flex flex-col">
          <Show when={props.title}>
            <span class="text-base-content font-bold text-lg">
              {props.title}
            </span>
          </Show>
          <Show when={props.description}>
            <span class="text-sm text-base-content/60">
              {props.description}
            </span>
          </Show>
        </div>
      </Show>
      <div class="flex flex-col">{props.children}</div>
    </div>
  );
}
