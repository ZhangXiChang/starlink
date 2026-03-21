import { ShellContext, use_context } from "../context";
import Modal from "../modal";

export default function Setting() {
  const shell_store = use_context(ShellContext);
  return (
    <Modal title="设置">
      <button
        class="btn"
        onClick={() => {
          shell_store.toaster.popup("success", "你好，世界");
        }}
      >
        测试按钮
      </button>
    </Modal>
  );
}
