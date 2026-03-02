import { ShellContext, use_context } from "../context";

export default function Setting() {
  const shell_store = use_context(ShellContext);
  return (
    <div class="modal-box flex flex-col">
      <span class="text-base-content font-bold text-lg">设置</span>
      <span class="text-sm text-base-content/60">适应你的习惯</span>
      <div class="flex flex-col mt-3 gap-2">
        <button
          class="btn"
          onClick={() => {
            shell_store.toaster.popup("success", "你好，世界");
          }}
        >
          测试按钮
        </button>
      </div>
    </div>
  );
}
