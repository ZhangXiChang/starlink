import type { JSX } from "solid-js";

export default function Modal(props: {
  title: string;
  description: string;
  children: JSX.Element;
}) {
  return (
    <div class="modal-box flex flex-col">
      <span class="text-base-content font-bold text-lg">{props.title}</span>
      <span class="text-sm text-base-content/60">{props.description}</span>
      <div class="flex flex-col mt-3 gap-2">{props.children}</div>
    </div>
  );
}
