import { ShellContext, use_context } from "../context";
import Modal from "../modal";

export default function Setting() {
  const shell_store = use_context(ShellContext);
  return (
    <Modal title="设置">
      <button
        class="btn"
        onClick={() => {
          const close = shell_store.toaster.popup("你好，世界");
          setTimeout(() => {
            close();
          }, 3000);
        }}
      >
        测试按钮
      </button>
    </Modal>
  );
}
