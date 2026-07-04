import Login from "~/components/ui/login";
import Register from "~/components/ui/register";

export default function Auth() {
  return (
    <div class="flex-1 flex items-center justify-center">
      <div class="tabs tabs-box tabs-sm shadow-none w-80">
        <input
          type="radio"
          name="auth_tabs"
          aria-label="登录"
          class="tab"
          checked
        />
        <div class="tab-content">
          <Login />
        </div>
        <input type="radio" name="auth_tabs" aria-label="注册" class="tab" />
        <div class="tab-content">
          <Register />
        </div>
      </div>
    </div>
  );
}
